// Pure-function tests for the Google sign-in helpers. The Web Browser /
// Supabase round-trip can't be unit-tested without spinning up a browser; the
// PKCE math, URL building, and code extraction are testable directly.
// Env vars come from jest.setup.ts; jest.mock calls are hoisted by babel-jest.
import {
  buildAuthorizeUrl,
  challengeFromVerifier,
  extractCode,
  generatePkceVerifier,
} from '../googleSignIn';

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(async (n: number) => new Uint8Array(n).fill(7)),
  digestStringAsync: jest.fn(async () => 'AAAA+/=='),
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  CryptoEncoding: { BASE64: 'base64' },
}));

describe('googleSignIn helpers', () => {
  it('generates a base64url verifier (no +, /, or = chars)', async () => {
    const v = await generatePkceVerifier();
    expect(v.length).toBeGreaterThan(0);
    expect(v).not.toMatch(/[+/=]/);
  });

  it('converts a base64 digest into base64url for the challenge', async () => {
    const c = await challengeFromVerifier('any');
    // Mocked digest is "AAAA+/==" → "AAAA-_"
    expect(c).toBe('AAAA-_');
  });

  it('builds the Supabase authorize URL with the right params', () => {
    const url = buildAuthorizeUrl('CHALLENGE', 'ma3ady://auth/callback');
    expect(url.startsWith('http://127.0.0.1:54321/auth/v1/authorize?')).toBe(true);
    expect(url).toContain('provider=google');
    expect(url).toContain('code_challenge=CHALLENGE');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain(encodeURIComponent('ma3ady://auth/callback'));
  });

  it('extracts the code from a redirect URL', () => {
    expect(extractCode('ma3ady://auth/callback?code=abc123')).toBe('abc123');
    expect(extractCode('ma3ady://auth/callback?code=abc&state=xyz')).toBe('abc');
    expect(extractCode('ma3ady://auth/callback')).toBeNull();
    expect(extractCode('ma3ady://auth/callback?other=x')).toBeNull();
  });
});
