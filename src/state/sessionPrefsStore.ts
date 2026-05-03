import { create } from 'zustand';

type SessionPrefsState = {
  displayTimezoneOverride: string | null;
  setDisplayTimezoneOverride: (zone: string | null) => void;
  resetSessionPrefs: () => void;
};

const initial = {
  displayTimezoneOverride: null,
};

export const useSessionPrefsStore = create<SessionPrefsState>((set) => ({
  ...initial,
  setDisplayTimezoneOverride: (displayTimezoneOverride) => set({ displayTimezoneOverride }),
  resetSessionPrefs: () => set({ ...initial }),
}));
