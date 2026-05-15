-- 021_status_transitions_reversible: terminal appointment statuses
-- (cancelled, completed, no_show) become reversible by admins. Real-world
-- bookings can be reinstated, marked done after the fact, or reclassified
-- after a misclick.
--
-- Replaces the matrix from migration 013 with an unconstrained "any
-- transition is allowed" rule. Self-transitions never reach validation
-- because the trigger only fires when status actually changes
-- (`when (old.status is distinct from new.status)` in migration 013).
--
-- The Edge Function (update-appointment-status) still gates by membership
-- and role, so this is purely about the DB-level guarantee, which moves
-- from "state machine" to "log of authorized changes".

create or replace function public.validate_status_transition(
  p_from public.appointment_status,
  p_to public.appointment_status
)
returns boolean
language sql
immutable
as $$
  select true;
$$;
