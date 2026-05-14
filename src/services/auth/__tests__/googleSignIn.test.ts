// PKCE math, URL construction, and SecureStore plumbing moved into
// supabase-js. The only pure helper left in this module is extractCode.
import { extractCode } from '../googleSignIn';

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

describe('extractCode', () => {
  it('parses ?code out of the redirect URL', () => {
    expect(extractCode('ma3ady://auth/callback?code=abc123')).toBe('abc123');
    expect(extractCode('ma3ady://auth/callback?code=abc&state=xyz')).toBe('abc');
  });

  it('returns null when no code is present', () => {
    expect(extractCode('ma3ady://auth/callback')).toBeNull();
    expect(extractCode('ma3ady://auth/callback?other=x')).toBeNull();
  });
});
