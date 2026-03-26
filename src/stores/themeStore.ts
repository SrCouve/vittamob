import { create } from 'zustand';

type GlassTheme = 'dark' | 'light';

interface ThemeState {
  glassTheme: GlassTheme;
  setGlassTheme: (theme: GlassTheme) => void;
  toggleGlassTheme: () => void;
}

// Persist to AsyncStorage
let storage: any = null;
try { storage = require('@react-native-async-storage/async-storage').default; } catch {}

const STORAGE_KEY = 'vitta_glass_theme';

export const useThemeStore = create<ThemeState>((set, get) => ({
  glassTheme: 'dark', // default

  setGlassTheme: (theme) => {
    set({ glassTheme: theme });
    try { storage?.setItem(STORAGE_KEY, theme); } catch {}
  },

  toggleGlassTheme: () => {
    const next = get().glassTheme === 'dark' ? 'light' : 'dark';
    set({ glassTheme: next });
    try { storage?.setItem(STORAGE_KEY, next); } catch {}
  },
}));

// Load persisted theme on init
try {
  storage?.getItem(STORAGE_KEY).then((val: string | null) => {
    if (val === 'light' || val === 'dark') {
      useThemeStore.setState({ glassTheme: val });
    }
  });
} catch {}
