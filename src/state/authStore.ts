import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '@/services/api/supabase';
import { signInWithGoogle as runGoogleSignIn } from '@/services/auth/googleSignIn';
import { type Profile } from '@/types/db';

const STORAGE_KEY_TENANT_ID = 'app.tenantId';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  refresh: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('[authStore] failed to load profile', error);
    return null;
  }
  return data;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session, loading: false }),
  setProfile: (profile) => set({ profile }),

  // Restore session + profile from the supabase client. Pure session
  // restoration; explicitly does NOT call claim-bookings — that fires
  // only on actual sign-in moments via the auth callback, not on every
  // app boot or token refresh that happens to call refresh().
  refresh: async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      set({ session: null, profile: null, loading: false });
      return;
    }

    const profile = await loadProfile(session.user.id);
    set({ session, profile, loading: false });
  },

  signInWithGoogle: async () => {
    set({ loading: true });
    try {
      await runGoogleSignIn();
      await get().refresh();
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(STORAGE_KEY_TENANT_ID);
    set({ session: null, profile: null });
  },
}));

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session);
});
