import { supabase } from './supabase';
import {
  type AvailabilityException,
  type AvailabilityExceptionInsert,
  type AvailabilityExceptionKind,
  type AvailabilityRule,
  type AvailableSlot,
} from '@/types/db';

export type Band = { start_time: string; end_time: string };

type GetAvailableSlotsArgs = {
  tenantSlug: string;
  serviceId: string | null;
  from: Date | string;
  to: Date | string;
};

function asIso(value: Date | string): string {
  return typeof value === 'string' ? value : value.toISOString();
}

/**
 * Calls the `compute_available_slots` Postgres function.
 *
 * Returns the available windows for the tenant + (optional) service over the
 * range, in UTC. The function body that tiles into discrete slots, applies
 * service buffers/min-notice/max-advance, and anti-joins against appointments
 * lands in the `define-services-and-appointments` change. Until then the
 * function returns the raw availability windows derived from rules + exceptions.
 */
export async function getAvailableSlots({
  tenantSlug,
  serviceId,
  from,
  to,
}: GetAvailableSlotsArgs): Promise<AvailableSlot[]> {
  const { data, error } = await supabase.rpc('compute_available_slots', {
    p_tenant_slug: tenantSlug,
    p_service_id: serviceId,
    p_range_start: asIso(from),
    p_range_end: asIso(to),
  });
  if (error) throw error;
  return (data ?? []) as AvailableSlot[];
}

export async function getRulesForTenant(tenantId: string): Promise<AvailabilityRule[]> {
  const { data, error } = await supabase
    .from('availability_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('service_id', null)
    .order('day_of_week')
    .order('start_time');
  if (error) throw error;
  return data ?? [];
}

export async function bulkReplaceRulesForDay(
  tenantId: string,
  dayOfWeek: number,
  bands: Band[],
): Promise<void> {
  const { error } = await supabase.rpc('bulk_replace_rules_for_day', {
    p_tenant_id: tenantId,
    p_day_of_week: dayOfWeek,
    p_bands: bands,
  });
  if (error) throw error;
}

export async function getExceptionsForTenant(
  tenantId: string,
): Promise<AvailabilityException[]> {
  const fromIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('availability_exceptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('starts_at', fromIso)
    .order('starts_at');
  if (error) throw error;
  return data ?? [];
}

export async function upsertException(
  exception: AvailabilityExceptionInsert & { id?: string },
): Promise<AvailabilityException> {
  if (exception.id) {
    const { id, ...rest } = exception;
    const { data, error } = await supabase
      .from('availability_exceptions')
      .update(rest)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from('availability_exceptions')
    .insert(exception)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteException(id: string): Promise<void> {
  const { error } = await supabase.from('availability_exceptions').delete().eq('id', id);
  if (error) throw error;
}

export type { AvailabilityException, AvailabilityExceptionKind, AvailabilityRule };
