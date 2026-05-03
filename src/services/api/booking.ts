import { supabase } from './supabase';
import { type Appointment, type BookingResult } from '@/types/db';

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

export class InvalidManageTokenError extends Error {
  constructor() {
    super('invalid_token');
    this.name = 'InvalidManageTokenError';
  }
}

/**
 * Verifies the plaintext manage token and returns the appointment id.
 * Throws InvalidManageTokenError if the token is unknown or the appointment
 * has been cancelled.
 */
export async function verifyManageToken(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('verify_manage_token', { p_token: token });
  if (error) {
    if (error.message?.includes('appointment_unavailable')) {
      throw new InvalidManageTokenError();
    }
    throw error;
  }
  if (typeof data !== 'string') throw new InvalidManageTokenError();
  return data;
}

/**
 * Fetches the full appointment row associated with the plaintext manage token
 * via a SECURITY DEFINER RPC, bypassing the appointments-select RLS policy
 * (which scopes to auth.uid() / staff). This is what the guest manage-link
 * screen uses to display the booking before any sign-in has happened.
 */
export async function getAppointmentByToken(token: string): Promise<Appointment> {
  const { data, error } = await supabase.rpc('get_appointment_by_token', {
    p_token: token,
  });
  if (error) {
    if (error.message?.includes('appointment_unavailable')) {
      throw new InvalidManageTokenError();
    }
    throw error;
  }
  if (!data) throw new InvalidManageTokenError();
  return data as Appointment;
}

type ManageResponse = {
  appointment?: Appointment;
  error?: string;
};

/**
 * Cancels the appointment associated with the manage token via the
 * `manage-appointment` Edge Function. Returns the cancelled appointment row.
 */
export async function cancelByToken(token: string): Promise<Appointment> {
  const { data, error } = await supabase.functions.invoke<ManageResponse>(
    'manage-appointment',
    { body: { token, action: 'cancel' } },
  );
  if (error) {
    if (error.message?.includes('invalid_token')) throw new InvalidManageTokenError();
    throw error;
  }
  if (!data?.appointment) throw new Error('manage-appointment returned no appointment');
  return data.appointment;
}

/**
 * Reschedules the appointment associated with the manage token via the
 * `manage-appointment` Edge Function. Throws SlotTakenError if the new slot is
 * occupied by the time the update commits.
 */
export async function rescheduleByToken(
  token: string,
  newStartsAt: Date | string,
): Promise<Appointment> {
  const startsAt =
    typeof newStartsAt === 'string' ? newStartsAt : newStartsAt.toISOString();
  const { data, error } = await supabase.functions.invoke<ManageResponse>(
    'manage-appointment',
    { body: { token, action: 'reschedule', new_starts_at: startsAt } },
  );
  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('invalid_token')) throw new InvalidManageTokenError();
    if (msg.includes('slot_taken')) throw new SlotTakenError();
    if (msg.includes('slot_unavailable')) throw new SlotUnavailableError();
    throw error;
  }
  if (!data?.appointment) throw new Error('manage-appointment returned no appointment');
  return data.appointment;
}
