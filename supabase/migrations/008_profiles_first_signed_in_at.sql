-- 008_profiles_first_signed_in_at: claim-once gate.
-- The implement-google-oauth change uses this to skip claim-bookings on
-- subsequent sign-ins. Stamped exactly once by the claim-bookings Edge
-- Function on first auth callback.

alter table public.profiles
  add column first_signed_in_at timestamptz;
