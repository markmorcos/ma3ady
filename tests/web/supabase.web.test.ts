import { assertSupabaseConfig, supabase } from '@/services/api/supabase.web';

describe('supabase.web', () => {
  it('exports a client with auth + from APIs', () => {
    expect(typeof supabase.from).toBe('function');
    expect(typeof supabase.auth.signInWithOAuth).toBe('function');
    expect(typeof supabase.auth.getSession).toBe('function');
    expect(typeof supabase.auth.onAuthStateChange).toBe('function');
  });
});

describe('assertSupabaseConfig', () => {
  const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const originalAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
  });

  it('throws missing_env when EXPO_PUBLIC_SUPABASE_URL is unset', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'present';
    expect(() => assertSupabaseConfig()).toThrow(/missing_env.*EXPO_PUBLIC_SUPABASE_URL/);
  });

  it('throws missing_env when EXPO_PUBLIC_SUPABASE_ANON_KEY is unset', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://present';
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => assertSupabaseConfig()).toThrow(/missing_env.*EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it('returns silently when both env vars are present', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://present';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'present';
    expect(() => assertSupabaseConfig()).not.toThrow();
  });
});
