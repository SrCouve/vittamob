import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const SUPABASE_URL = 'https://ijveuheldszomunyohrr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdmV1aGVsZHN6b211bnlvaHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTQwMjAsImV4cCI6MjA4ODgzMDAyMH0.gsqkGqJ5JDdOGzU8fplzutCJKSNdAiDWSq31l6778cI';

// Production: AsyncStorage persists session
// Dev client: falls back to memory (no native module)
let storage: any;
try {
  const AS = require('@react-native-async-storage/async-storage');
  storage = AS.default || AS;
  // Test if native module works
  storage.getItem('__test__');
} catch {
  const mem: Record<string, string> = {};
  storage = {
    getItem: (k: string) => Promise.resolve(mem[k] ?? null),
    setItem: (k: string, v: string) => { mem[k] = v; return Promise.resolve(); },
    removeItem: (k: string) => { delete mem[k]; return Promise.resolve(); },
  };
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Manage token refresh on app state changes
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
