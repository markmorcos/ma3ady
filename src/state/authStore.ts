import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '@/services/api/supabase';

type AuthState = {
  session: Session | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  setSession: (session) => set({ session, loading: false }),
  refresh: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, loading: false });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session);
});
