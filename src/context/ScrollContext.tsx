import React, { createContext, useContext } from 'react';
import { useSharedValue, SharedValue } from 'react-native-reanimated';

type ScrollContextType = {
  scrollY: SharedValue<number>;
};

const ScrollContext = createContext<ScrollContextType | null>(null);

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const scrollY = useSharedValue(0);
  return (
    <ScrollContext.Provider value={{ scrollY }}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScrollY() {
  const ctx = useContext(ScrollContext);
  if (!ctx) throw new Error('useScrollY must be used within ScrollProvider');
  return ctx.scrollY;
}
