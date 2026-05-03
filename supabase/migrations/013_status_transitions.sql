-- 013_status_transitions: formalize the appointment status state machine via
-- a validation function + UPDATE trigger so all three callers (admin
-- update-appointment-status, customer cancel, guest manage-appointment) share
-- the same enforcement.

create or replace function public.validate_status_transition(
  p_from public.appointment_status,
  p_to public.appointment_status
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from = p_to then true
    when p_from = 'pending' and p_to in ('confirmed', 'cancelled', 'no_show') then true
    when p_from = 'confirmed' and p_to in ('cancelled', 'completed', 'no_show') then true
    -- terminal states
    when p_from in ('cancelled', 'completed', 'no_show') then false
    else false
  end;
$$;

create or replace function public.enforce_appointment_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if not public.validate_status_transition(old.status, new.status) then
      raise exception 'invalid_status_transition: % → %', old.status, new.status
        using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_status_transition on public.appointments;
create trigger enforce_status_transition
  before update on public.appointments
  for each row
  when (old.status is distinct from new.status)
  execute function public.enforce_appointment_status_transition();
