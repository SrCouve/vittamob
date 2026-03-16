import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  interests: string[];
  weight_kg: number | null;
  height_cm: number | null;
  points_balance: number;
  streak_days: number;
  total_lessons: number;
  total_hours: number;
  subscription_tier: 'free' | 'plus' | 'pro';
  is_private: boolean;
  hide_routes: boolean;
  followers_count: number;
  following_count: number;
  created_at: string;
}

interface UserState {
  profile: Profile | null;
  isLoading: boolean;

  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  refreshPoints: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  isLoading: false,

  fetchProfile: async (userId) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      set({ profile: data as Profile, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    const profile = get().profile;
    if (!profile) return { error: 'No profile' };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    if (error) return { error: error.message };

    set({ profile: { ...profile, ...updates } });
    return { error: null };
  },

  refreshPoints: async () => {
    const profile = get().profile;
    if (!profile) return;

    const { data } = await supabase
      .from('profiles')
      .select('points_balance, streak_days, total_lessons, total_hours')
      .eq('id', profile.id)
      .single();

    if (data) {
      set({ profile: { ...profile, ...data } });
    }
  },
}));
