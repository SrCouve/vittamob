import { create } from 'zustand';
import { supabase } from '../lib/supabase';

declare const __DEV__: boolean;

export interface RaceMedal {
  id: string;
  user_id: string;
  run_id: string | null;
  race_name: string;
  race_date: string;
  distance_km: number;
  moving_time_seconds: number;
  average_speed: number;
  medal_image_url: string | null;
  user_photo_url: string | null;
  location: string | null;
  created_at: string;
}

interface MedalState {
  medals: RaceMedal[];
  isLoading: boolean;
  fetchMedals: (userId: string) => Promise<void>;
  updatePhoto: (medalId: string, photoUrl: string) => Promise<void>;
}

export const useMedalStore = create<MedalState>((set, get) => ({
  medals: [],
  isLoading: false,

  fetchMedals: async (userId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('race_medals')
        .select('*')
        .eq('user_id', userId)
        .order('race_date', { ascending: false });

      if (error) throw error;
      set({ medals: (data ?? []) as RaceMedal[], isLoading: false });
    } catch (e) {
      console.error('fetchMedals error:', e);
      set({ isLoading: false });
    }
  },

  updatePhoto: async (medalId, photoUrl) => {
    // Optimistic
    const medals = get().medals.map(m =>
      m.id === medalId ? { ...m, user_photo_url: photoUrl } : m
    );
    set({ medals });

    try {
      const { error } = await supabase
        .from('race_medals')
        .update({ user_photo_url: photoUrl })
        .eq('id', medalId);
      if (error) throw error;
    } catch (e) {
      console.error('updatePhoto error:', e);
    }
  },
}));
