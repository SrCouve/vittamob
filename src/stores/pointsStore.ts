import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface PointsTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

interface PointsState {
  balance: number;
  transactions: PointsTransaction[];
  isLoading: boolean;

  fetchBalance: (userId: string) => Promise<void>;
  fetchTransactions: (userId: string) => Promise<void>;
  awardPoints: (userId: string, amount: number, type: string, description: string) => Promise<void>;
  reset: () => void;
}

export const usePointsStore = create<PointsState>((set, get) => ({
  balance: 0,
  transactions: [],
  isLoading: false,

  reset: () => set({ balance: 0, transactions: [], isLoading: false }),

  fetchBalance: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('points_balance')
      .eq('id', userId)
      .single();

    if (data) set({ balance: data.points_balance });
  },

  fetchTransactions: async (userId) => {
    set({ isLoading: true });
    const { data } = await supabase
      .from('points_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    set({ transactions: (data ?? []) as PointsTransaction[], isLoading: false });
  },

  awardPoints: async (userId, amount, type, description) => {
    const { error: insertErr } = await supabase.from('points_ledger').insert({
      user_id: userId,
      amount,
      type,
      description,
    });
    if (insertErr) return;

    const { error: rpcErr } = await supabase.rpc('increment_points', {
      user_id_input: userId,
      amount_input: amount,
    });
    if (rpcErr) {
      console.error('awardPoints: increment_points failed', rpcErr);
      return;
    }

    set({ balance: get().balance + amount });
  },
}));
