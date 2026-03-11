import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ijveuheldszomunyohrr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdmV1aGVsZHN6b211bnlvaHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTQwMjAsImV4cCI6MjA4ODgzMDAyMH0.gsqkGqJ5JDdOGzU8fplzutCJKSNdAiDWSq31l6778cI';

// In-memory storage for dev/simulator — works without native modules
// In production build, swap to expo-secure-store
const memoryStorage: Record<string, string> = {};
const MemoryStorageAdapter = {
  getItem: (key: string) => memoryStorage[key] ?? null,
  setItem: (key: string, value: string) => { memoryStorage[key] = value; },
  removeItem: (key: string) => { delete memoryStorage[key]; },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: MemoryStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
