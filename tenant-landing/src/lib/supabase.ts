import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let _anon: SupabaseClient | null = null;
let _service: SupabaseClient | null = null;

export function getAnonClient(): SupabaseClient {
  if (!_anon) {
    _anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _anon;
}

export function getServiceClient(): SupabaseClient {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('tenant-landing: SUPABASE_SERVICE_ROLE_KEY required for server actions');
  }
  if (!_service) {
    _service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _service;
}
