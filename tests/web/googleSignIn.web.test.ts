// signInWithGoogle on web calls Supabase OAuth with the right redirectTo
// and lets Supabase do the full browser-redirect chain.

/* eslint-disable import/first */
jest.mock('@/services/api/supabase.web', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
  assertSupabaseConfig: jest.fn(),
}));

import { signInWithGoogle } from '@/services/auth/googleSignIn.web';
import { supabase } from '@/services/api/supabase.web';
/* eslint-enable import/first */

const signInWithOAuth = supabase.auth.signInWithOAuth as unknown as jest.Mock;

describe('signInWithGoogle (web)', () => {
  beforeEach(() => {
    signInWithOAuth.mockReset().mockResolvedValue({ data: { url: null }, error: null });
    Object.defineProperty(window, 'location', {
      value: { ...window.location, origin: 'https://app.ma3ady.com' },
      configurable: true,
    });
  });

  it('calls signInWithOAuth with provider=google and redirectTo=<origin>/auth/callback', async () => {
    await signInWithGoogle();
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://app.ma3ady.com/auth/callback' },
    });
  });

  it('throws when Supabase returns an error', async () => {
    signInWithOAuth.mockResolvedValueOnce({ data: null, error: new Error('boom') });
    await expect(signInWithGoogle()).rejects.toThrow('boom');
  });
});
