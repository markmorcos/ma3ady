import { supabase } from './supabase';
import { type BookingResult } from '@/types/db';

type BookAppointmentArgs = {
  tenantSlug: string;
  serviceId: string;
  startsAt: Date | string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
};

export class SlotTakenError extends Error {
  constructor() {
    super('slot_taken');
    this.name = 'SlotTakenError';
  }
}

export class SlotUnavailableError extends Error {
  constructor() {
    super('slot_unavailable');
    this.name = 'SlotUnavailableError';
  }
}

/**
 * Books an appointment via the `book_appointment` SECURITY DEFINER RPC.
 * Returns `{ appointment_id, manage_token }` — the plaintext manage token is
 * returned exactly once; the database stores only sha256(token).
 *
 * Errors:
 *   - SlotTakenError      — EXCLUDE constraint violation (race lost)
 *   - SlotUnavailableError — slot wasn't in compute_available_slots() at call time
 */
export async function bookAppointment(args: BookAppointmentArgs): Promise<BookingResult> {
  const startsAt =
    typeof args.startsAt === 'string' ? args.startsAt : args.startsAt.toISOString();

  const { data, error } = await supabase.rpc('book_appointment', {
    p_tenant_slug: args.tenantSlug,
    p_service_id: args.serviceId,
    p_starts_at: startsAt,
    p_guest_name: args.guestName,
    p_guest_email: args.guestEmail,
    p_guest_phone: args.guestPhone ?? null,
  });

  if (error) {
    if (error.message?.includes('slot_taken')) throw new SlotTakenError();
    if (error.message?.includes('slot_unavailable')) throw new SlotUnavailableError();
    throw error;
  }

  // RPC returning a SETOF row gives us an array; first row holds the result.
  const rows = (data ?? []) as BookingResult[];
  if (rows.length === 0) {
    throw new Error('book_appointment returned no rows');
  }
  return rows[0];
}
