import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/services/api/supabase';

WebBrowser.maybeCompleteAuthSession();

function resolveRedirectUri(): string {
  return process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI || Linking.createURL('/auth/callback');
}

export function extractCode(url: string): string | null {
  const q = url.split('?')[1];
  if (!q) return null;
  const params = new URLSearchParams(q.split('#')[0]);
  return params.get('code');
}

export async function signInWithGoogle(): Promise<void> {
  const redirectTo = resolveRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Supabase did not return an authorize URL');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !('url' in result) || !result.url) {
    throw new Error('Sign-in cancelled');
  }

  const code = extractCode(result.url);
  if (!code) throw new Error('Sign-in did not return a code');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}

export async function exchangeCodeForSession(code: string): Promise<void> {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}
