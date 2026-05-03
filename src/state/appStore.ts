import { create } from 'zustand';

export type BootPhase = 'i18n' | 'theme' | 'auth' | 'tenant' | 'ready' | 'degraded';

type AppState = {
  bootPhase: BootPhase;
  bootError: Error | null;
  setBootPhase: (phase: BootPhase) => void;
  setBootError: (error: Error | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  bootPhase: 'i18n',
  bootError: null,
  setBootPhase: (bootPhase) => set({ bootPhase }),
  setBootError: (bootError) => set({ bootError }),
}));
