import { supabase } from './supabase';

export type ClaimBookingsResult = {
  claimed_guest_contacts: number;
  claimed_appointments: number;
};

/**
 * Invokes the `claim-bookings` Edge Function. Server-side it walks
 * `guest_contacts` rows by the caller's email (filtered to
 * `claimed_by_user_id IS NULL`), sets `claimed_by_user_id`, and promotes
 * the matching `appointments` to `user_id`. The call is idempotent —
 * the auth callback invokes it on every sign-in so anonymous bookings
 * made between sessions get attached too. `profiles.first_signed_in_at`
 * is stamped on first run for analytics but no longer gates this call.
 */
export async function claimBookings(): Promise<ClaimBookingsResult> {
  const { data, error } = await supabase.functions.invoke<ClaimBookingsResult>(
    'claim-bookings',
  );
  if (error) throw error;
  return data ?? { claimed_guest_contacts: 0, claimed_appointments: 0 };
}
