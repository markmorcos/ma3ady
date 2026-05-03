import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '@/services/api/supabase';
import { signInWithGoogle as runGoogleSignIn } from '@/services/auth/googleSignIn';
import { claimBookings } from '@/services/api/claimBookings';
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

async function maybeClaim(profile: Profile | null): Promise<void> {
  if (!profile) return;
  if (profile.first_signed_in_at) return;
  try {
    await claimBookings();
  } catch (err) {
    // The Edge Function may not yet be deployed locally; failure here must not
    // block sign-in. Log + continue.
    console.warn('[authStore] claim-bookings call failed', err);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session, loading: false }),
  setProfile: (profile) => set({ profile }),

  refresh: async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      set({ session: null, profile: null, loading: false });
      return;
    }

    const profile = await loadProfile(session.user.id);
    set({ session, profile, loading: false });
    await maybeClaim(profile);
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
