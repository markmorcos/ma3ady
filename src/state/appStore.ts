import { create } from 'zustand';

export type BootPhase =
  | 'config'
  | 'i18n'
  | 'theme'
  | 'auth'
  | 'tenant'
  | 'ready'
  | 'degraded'
  | 'misconfigured';

type AppState = {
  bootPhase: BootPhase;
  bootError: Error | null;
  setBootPhase: (phase: BootPhase) => void;
  setBootError: (error: Error | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  bootPhase: 'config',
  bootError: null,
  setBootPhase: (bootPhase) => set({ bootPhase }),
  setBootError: (bootError) => set({ bootError }),
}));
