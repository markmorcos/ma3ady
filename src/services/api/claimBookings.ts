import { supabase } from './supabase';

export type ClaimBookingsResult = {
  claimed_guest_contacts: number;
  claimed_appointments: number;
};

/**
 * Invokes the `claim-bookings` Edge Function. Server-side it walks
 * `guest_contacts` rows by the caller's email, sets `claimed_by_user_id`,
 * promotes the matching `appointments` to `user_id`, and stamps
 * `profiles.first_signed_in_at = now()` so subsequent sign-ins skip the call.
 */
export async function claimBookings(): Promise<ClaimBookingsResult> {
  const { data, error } = await supabase.functions.invoke<ClaimBookingsResult>(
    'claim-bookings',
  );
  if (error) throw error;
  return data ?? { claimed_guest_contacts: 0, claimed_appointments: 0 };
}
