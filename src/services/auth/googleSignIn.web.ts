import { supabase } from '@/services/api/supabase';

// Web sign-in lets Supabase do the full browser-redirect chain. We do NOT
// pass `skipBrowserRedirect: true` here — the browser navigates away to
// accounts.google.com, then to Supabase's /auth/v1/callback, then back to
// `<origin>/auth/callback?code=...`. By the time the callback page mounts,
// `detectSessionInUrl: true` (set in supabase.web.ts) has already kicked
// off the code-for-session exchange in the background.

function resolveRedirectUri(): string {
  if (typeof window === 'undefined') {
    // SSR/SSG safety guard — never reached at runtime in the SPA.
    return process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI || '';
  }
  return `${window.location.origin}/auth/callback`;
}

// Kept for symmetry with the native module; tests import it.
export function extractCode(url: string): string | null {
  const q = url.split('?')[1];
  if (!q) return null;
  const params = new URLSearchParams(q.split('#')[0]);
  return params.get('code');
}

export async function signInWithGoogle(): Promise<void> {
  const redirectTo = resolveRedirectUri();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
  // The browser is navigating away; the next page is Google's consent
  // screen. This function never resolves in the normal sense.
}

// On web, `detectSessionInUrl: true` exchanges the code in the
// background. The callback screen calls this to wait for the resulting
// SIGNED_IN event (or notice that the session already landed during
// Supabase client init). Resolves when a session is present; the caller
// races it against a timeout.
export async function exchangeCodeForSession(_code: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;

  await new Promise<void>((resolve) => {
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        sub.data.subscription.unsubscribe();
        resolve();
      }
    });
  });
}
