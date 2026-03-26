import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface EventParticipant {
  user_id: string;
  name: string;
  avatar_url: string | null;
  is_private: boolean;
  is_verified: boolean;
  confirmed_at: string;
}

export interface EventComment {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  is_verified: boolean;
  content: string;
  created_at: string;
}

export interface EventDetails {
  id: string;
  title: string;
  organizer_name: string;
  organizer_logo_url: string | null;
  description: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  location_url: string | null;
  distance_km: number;
  organizer_website: string | null;
  organizer_instagram: string | null;
  image_url: string | null;
  route_polyline: string | null;
  spark_cost: number;
  spark_multiplier: number;
  max_participants: number | null;
  is_active: boolean;
  participant_count: number;
  viewer_confirmed: boolean;
  participants: EventParticipant[];
}

interface EventState {
  event: EventDetails | null;
  comments: EventComment[];
  isLoading: boolean;
  isConfirming: boolean;

  fetchEvent: (eventId: string, viewerId: string) => Promise<void>;
  confirmEvent: (eventId: string, userId: string) => Promise<string>;
  cancelEvent: (eventId: string, userId: string) => Promise<string>;
  fetchComments: (eventId: string) => Promise<void>;
  addComment: (eventId: string, userId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  clearEvent: () => void;
  reset: () => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  event: null,
  comments: [],
  isLoading: false,
  isConfirming: false,

  fetchEvent: async (eventId, viewerId) => {
    // If we already have this event cached, show it instantly while refreshing
    const cached = get().event;
    if (cached?.id === eventId) {
      // Already have data, refresh in background
      set({ isLoading: false });
    } else {
      set({ isLoading: true, event: null });
    }
    try {
      const { data, error } = await supabase.rpc('get_event_details', {
        p_event_id: eventId,
        p_viewer_id: viewerId,
      });

      if (error) {
        console.error('fetchEvent error:', error);
        set({ isLoading: false });
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row || row.error) {
        set({ event: null, isLoading: false });
        return;
      }

      set({
        event: {
          id: row.id,
          title: row.title,
          organizer_name: row.organizer_name,
          organizer_logo_url: row.organizer_logo_url,
          organizer_website: row.organizer_website ?? null,
          organizer_instagram: row.organizer_instagram ?? null,
          description: row.description,
          event_date: row.event_date,
          start_time: row.start_time,
          end_time: row.end_time,
          location: row.location,
          location_url: row.location_url ?? null,
          distance_km: Number(row.distance_km) || 0,
          image_url: row.image_url,
          route_polyline: row.route_polyline,
          spark_cost: row.spark_cost ?? 0,
          spark_multiplier: Number(row.spark_multiplier) ?? 1,
          max_participants: row.max_participants,
          is_active: row.is_active,
          participant_count: row.participant_count ?? 0,
          viewer_confirmed: row.viewer_confirmed ?? false,
          participants: (row.participants ?? []).map((p: any) => ({
            user_id: p.user_id,
            name: p.name ?? 'Participante',
            avatar_url: p.avatar_url ?? null,
            is_private: p.is_private ?? false,
            is_verified: p.is_verified ?? false,
            confirmed_at: p.confirmed_at,
          })),
        },
        isLoading: false,
      });
    } catch (e) {
      console.error('fetchEvent error:', e);
      set({ isLoading: false });
    }
  },

  confirmEvent: async (eventId, userId) => {
    set({ isConfirming: true });
    try {
      const { data, error } = await supabase.rpc('confirm_event', {
        p_event_id: eventId,
        p_user_id: userId,
      });

      if (error) {
        console.error('confirmEvent FULL ERROR:', JSON.stringify(error));
        set({ isConfirming: false });
        return 'error';
      }

      console.log('confirmEvent raw data:', JSON.stringify(data), 'type:', typeof data);

      // Supabase can return json as string, object, or array
      let result: any = data;
      if (typeof data === 'string') {
        try { result = JSON.parse(data); } catch { result = data; }
      }
      if (Array.isArray(result)) result = result[0];

      console.log('confirmEvent parsed result:', JSON.stringify(result));

      if (result?.error) {
        set({ isConfirming: false });
        return result.error;
      }

      // Update local state
      const prev = get().event;
      if (prev) {
        set({
          event: {
            ...prev,
            viewer_confirmed: true,
            participant_count: prev.participant_count + 1,
          },
        });
      }

      set({ isConfirming: false });
      return 'success';
    } catch (e) {
      console.error('confirmEvent error:', e);
      set({ isConfirming: false });
      return 'error';
    }
  },

  cancelEvent: async (eventId, userId) => {
    set({ isConfirming: true });
    try {
      const { data, error } = await supabase.rpc('cancel_event', {
        p_event_id: eventId,
        p_user_id: userId,
      });

      if (error) {
        console.error('cancelEvent error:', JSON.stringify(error));
        set({ isConfirming: false });
        return 'error';
      }

      let result: any = data;
      if (typeof data === 'string') {
        try { result = JSON.parse(data); } catch { result = data; }
      }
      if (Array.isArray(result)) result = result[0];

      if (result?.error) {
        set({ isConfirming: false });
        return result.error;
      }

      const prev = get().event;
      if (prev) {
        set({
          event: {
            ...prev,
            viewer_confirmed: false,
            participant_count: Math.max(0, prev.participant_count - 1),
            participants: prev.participants.filter(p => p.user_id !== userId),
          },
        });
      }

      set({ isConfirming: false });
      return 'success';
    } catch (e) {
      console.error('cancelEvent error:', e);
      set({ isConfirming: false });
      return 'error';
    }
  },

  fetchComments: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('event_comments')
        .select('id, event_id, user_id, content, created_at, profiles(name, avatar_url, is_verified)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('fetchEventComments error:', error);
        return;
      }

      const comments: EventComment[] = (data ?? []).map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        user_name: c.profiles?.name ?? 'Usuário',
        user_avatar: c.profiles?.avatar_url ?? null,
        is_verified: c.profiles?.is_verified ?? false,
        content: c.content,
        created_at: c.created_at,
      }));

      set({ comments });
    } catch (e) {
      console.error('fetchEventComments error:', e);
    }
  },

  addComment: async (eventId, userId, content) => {
    try {
      const { data, error } = await supabase
        .from('event_comments')
        .insert({ event_id: eventId, user_id: userId, content })
        .select('id')
        .single();

      if (error) {
        console.error('addEventComment error:', error);
        return;
      }

      // Refetch comments
      get().fetchComments(eventId);
    } catch (e) {
      console.error('addEventComment error:', e);
    }
  },

  deleteComment: async (commentId) => {
    try {
      await supabase.from('event_comments').delete().eq('id', commentId);
      set({ comments: get().comments.filter(c => c.id !== commentId) });
    } catch (e) {
      console.error('deleteEventComment error:', e);
    }
  },

  clearEvent: () => set({ event: null, comments: [] }),

  reset: () => set({ event: null, comments: [], isLoading: false, isConfirming: false }),
}));
