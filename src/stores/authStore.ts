import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      // Listen for auth changes first
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
      });

      // Try to get existing session with timeout
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
      const sessionPromise = supabase.auth.getSession().then(({ data }) => data.session);
      const session = await Promise.race([sessionPromise, timeout]);

      set({ session, user: session?.user ?? null, isInitialized: true });
    } catch (e) {
      console.warn('Auth init error:', e);
      set({ isInitialized: true });
    }
  },

  signInWithEmail: async (email, password) => {
    set({ isLoading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ isLoading: false });
    if (error) return { error: error.message };
    return { error: null };
  },

  signUpWithEmail: async (email, password, name) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) {
      set({ isLoading: false });
      return { error: error.message };
    }

    // Create profile row
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        name,
        avatar_url: null,
        points_balance: 100, // Welcome bonus
      });

      // Log welcome bonus points
      await supabase.from('points_ledger').insert({
        user_id: data.user.id,
        amount: 100,
        type: 'welcome_bonus',
        description: 'Bônus de boas-vindas',
      });
    }

    set({ isLoading: false });
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { error: error.message };
    return { error: null };
  },
}));
