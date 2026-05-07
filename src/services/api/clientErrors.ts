import { supabase } from './supabase';
import { type ClientErrorKind } from '@/services/observability/logError';

export type ClientError = {
  id: string;
  user_id: string | null;
  tenant_id: string | null;
  kind: ClientErrorKind;
  message: string;
  stack: string | null;
  payload: Record<string, unknown>;
  app_version: string | null;
  platform: string | null;
  locale: string | null;
  created_at: string;
};

export type ClientErrorFilters = {
  tenantId: string;
  kind?: ClientErrorKind;
  since?: Date | string;
  limit?: number;
};

export async function listClientErrors(
  filters: ClientErrorFilters,
): Promise<ClientError[]> {
  let q = supabase
    .from('client_errors')
    .select('*')
    .eq('tenant_id', filters.tenantId)
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 100);
  if (filters.kind) q = q.eq('kind', filters.kind);
  if (filters.since) {
    const sinceIso =
      typeof filters.since === 'string' ? filters.since : filters.since.toISOString();
    q = q.gte('created_at', sinceIso);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ClientError[];
}

export async function getClientError(id: string): Promise<ClientError | null> {
  const { data, error } = await supabase
    .from('client_errors')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as ClientError | null) ?? null;
}
