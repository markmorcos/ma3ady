import { supabase } from './supabase';
import { type TenantAuditEvent, type TenantAuditEventKind } from '@/types/db';

export type AuditFilters = {
  kinds?: TenantAuditEventKind[];
  actorId?: string | null;
  targetKind?: string | null;
  targetId?: string | null;
  since?: Date | string | null;
  until?: Date | string | null;
  limit?: number;
};

const DEFAULT_LIMIT = 50;

function asIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.toISOString();
}

export async function getTenantAuditEvents(
  tenantId: string,
  filters: AuditFilters = {},
): Promise<TenantAuditEvent[]> {
  let q = supabase
    .from('tenant_audit_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? DEFAULT_LIMIT);

  if (filters.kinds?.length) q = q.in('kind', filters.kinds);
  if (filters.actorId) q = q.eq('by_user_id', filters.actorId);
  if (filters.targetKind) q = q.eq('target_kind', filters.targetKind);
  if (filters.targetId) q = q.eq('target_id', filters.targetId);
  const since = asIso(filters.since);
  if (since) q = q.gte('created_at', since);
  const until = asIso(filters.until);
  if (until) q = q.lte('created_at', until);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
