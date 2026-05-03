import { supabase } from './supabase';
import { type AvailableSlot } from '@/types/db';

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
