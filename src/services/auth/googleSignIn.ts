import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/services/api/supabase';

WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEY_VERIFIER = 'auth.pkceVerifier';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

if (!SUPABASE_URL) throw new Error('EXPO_PUBLIC_SUPABASE_URL must be set');

/**
 * Resolves the OAuth redirect URI at call time so it adapts per runtime:
 *
 * - In Expo Go, `ma3ady://` is not registered with the OS, so we route the
 *   redirect through Expo's `exp://<lan-ip>:8081/--/auth/callback` proxy and
 *   the dev server hands it back to the JS layer via the deep link listener.
 * - In a dev client or prod build, the app owns the `ma3ady://` scheme
 *   declared in `app.json` and `Linking.createURL` returns that.
 *
 * The `EXPO_PUBLIC_AUTH_REDIRECT_URI` env var is honored as an explicit
 * override — useful for tests or when a custom callback path is needed.
 */
function resolveRedirectUri(): string {
  return process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI || Linking.createURL('/auth/callback');
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i] as number);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function generatePkceVerifier(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return bytesToBase64Url(bytes);
}

export async function challengeFromVerifier(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildAuthorizeUrl(challenge: string, redirectTo: string): string {
  const params = new URLSearchParams({
    provider: 'google',
    redirect_to: redirectTo,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`;
}

export function extractCode(url: string): string | null {
  const q = url.split('?')[1];
  if (!q) return null;
  const params = new URLSearchParams(q.split('#')[0]);
  return params.get('code');
}

export async function signInWithGoogle(): Promise<void> {
  const verifier = await generatePkceVerifier();
  await SecureStore.setItemAsync(STORAGE_KEY_VERIFIER, verifier);
  const challenge = await challengeFromVerifier(verifier);
  const redirectUri = resolveRedirectUri();
  const authUrl = buildAuthorizeUrl(challenge, redirectUri);

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type !== 'success' || !('url' in result) || !result.url) {
    throw new Error('Sign-in cancelled');
  }

  const code = extractCode(result.url);
  if (!code) throw new Error('Sign-in did not return a code');

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;

  await SecureStore.deleteItemAsync(STORAGE_KEY_VERIFIER);
}

export async function exchangeCodeForSession(code: string): Promise<void> {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  await SecureStore.deleteItemAsync(STORAGE_KEY_VERIFIER);
}
