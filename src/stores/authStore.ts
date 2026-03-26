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
    if (get().isInitialized) return;
    try {
      // Listen for auth changes (store subscription to prevent leak)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
      });
      // Store for potential cleanup (singleton, so this runs once);

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
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) return { error: error.message };

      // Trigger handle_new_user already creates profile; add welcome bonus only
      if (data.user) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ points_balance: 100 })
          .eq('id', data.user.id);
        if (updateErr) {
          console.warn('signUp: failed to set welcome bonus on profile', updateErr);
        }
        const { error: ledgerErr } = await supabase.from('points_ledger').insert({
          user_id: data.user.id,
          amount: 100,
          type: 'welcome_bonus',
          description: 'Bônus de boas-vindas',
        });
        if (ledgerErr) {
          console.warn('signUp: failed to insert welcome bonus ledger', ledgerErr);
        }
      }
      return { error: null };
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try { const { posthog } = require('../lib/posthog'); posthog.reset(); } catch {}
    // Clear all stores
    require('./userStore').useUserStore.getState().reset();
    require('./communityStore').useCommunityStore.getState().reset();
    require('./stravaStore').useStravaStore.getState().reset();
    require('./pointsStore').usePointsStore.getState().reset();
    require('./contentStore').useContentStore.getState().reset();
    require('./socialStore').useSocialStore.getState().reset();
    require('./coachStore').useCoachStore.getState().reset();
    require('./eventStore').useEventStore.getState().reset();
    try { require('./medalStore').useMedalStore.getState().reset(); } catch {}
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { error: error.message };
    return { error: null };
  },
}));
