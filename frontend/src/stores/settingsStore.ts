'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  soundVolume: number;
  cardAnimationSpeed: 'slow' | 'normal' | 'fast';

  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSound: () => void;
  setSoundVolume: (volume: number) => void;
  setCardAnimationSpeed: (speed: 'slow' | 'normal' | 'fast') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      soundEnabled: true,
      soundVolume: 0.5,
      cardAnimationSpeed: 'normal',

      setTheme: (theme) => set({ theme }),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      setSoundVolume: (volume) => set({ soundVolume: volume }),
      setCardAnimationSpeed: (speed) => set({ cardAnimationSpeed: speed }),
    }),
    {
      name: 'brotherhood-settings',
    }
  )
);
