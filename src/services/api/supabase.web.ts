import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Configuration is validated by the `config` boot phase via
// `assertSupabaseConfig()` below. If env is missing, the boot sequence
// short-circuits to the misconfigured state before any code calls into the
// supabase client -- so the placeholder URL/key below are intentionally
// unreachable junk that exists only so this module can be imported without
// throwing at parse time.
const PLACEHOLDER_URL = 'http://placeholder.invalid';
const PLACEHOLDER_KEY = 'placeholder';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;

/**
 * Throws a `missing_env:`-prefixed Error if any required EXPO_PUBLIC_*
 * variable is unset. Called from the `config` boot phase; failure routes the
 * app to the MisconfiguredScreen diagnostic.
 */
export function assertSupabaseConfig(): void {
  const missing: string[] = [];
  if (!process.env.EXPO_PUBLIC_SUPABASE_URL) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (missing.length > 0) {
    const err = new Error(`missing_env: ${missing.join(', ')}`);
    err.name = 'MisconfiguredError';
    throw err;
  }
}

// Web client uses Supabase's default `localStorage` adapter (no `storage`
// override). `detectSessionInUrl: true` so the OAuth code that Supabase
// appends to the redirect URL after sign-in is auto-exchanged on page load.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
