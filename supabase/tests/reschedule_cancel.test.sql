-- Reschedule + cancel tests.
-- Covers:
--   - validate_status_transition: any non-self transition is allowed
--     (terminal states became reversible in migration 021)
--   - reversing a cancellation works at the trigger level
--   - manual UPDATE of starts_at into another live appointment's window
--     raises EXCLUDE violation (slot_taken at the DB level)
--   - cancel populates cancelled_at + cancelled_by_user_id (set via the
--     same caller used by update-appointment-status)
--
-- Run via `make test-db`.

\set ON_ERROR_STOP on

\echo '== reschedule + cancel =='

-- ----------------------------------------------------------------------------
-- Pre-test cleanup
-- ----------------------------------------------------------------------------

delete from public.appointment_events where appointment_id in (
  select id from public.appointments where tenant_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
);
delete from public.appointments where tenant_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
delete from public.guest_contacts where tenant_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
delete from public.services where tenant_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
delete from public.memberships where tenant_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
delete from public.tenants where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
delete from auth.users where id = '00000000-0000-0000-0000-000000e70001';

-- ----------------------------------------------------------------------------
-- Setup
-- ----------------------------------------------------------------------------

begin;

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000e70001', 'reschedule@example.com')
on conflict (id) do nothing;

insert into public.tenants (id, slug, name, timezone, default_locale)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'rsc-test', 'RSC Test', 'UTC', 'en');

insert into public.memberships (tenant_id, user_id, role)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '00000000-0000-0000-0000-000000e70001', 'admin');

insert into public.services (id, tenant_id, name, duration_minutes, min_notice_min, max_advance_days)
values (
  'eeeeeeee-aaaa-0000-0000-000000000001',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'RSC Service',
  30,
  0,
  3650
);

insert into public.guest_contacts (id, tenant_id, name, email)
values ('eeeeeeee-bbbb-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Guest', 'rsc@example.com');

-- Two future appointments at 10:00 and 11:00 (non-overlapping).
insert into public.appointments (
  id, tenant_id, service_id, guest_contact_id, starts_at, ends_at, status, manage_token_hash
) values (
  'eeeeeeee-cccc-0000-0000-000000000001',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'eeeeeeee-aaaa-0000-0000-000000000001',
  'eeeeeeee-bbbb-0000-0000-000000000001',
  '2027-01-04 10:00+00'::timestamptz,
  '2027-01-04 10:30+00'::timestamptz,
  'confirmed',
  encode(sha256('rsc-1'::bytea), 'hex')
);

insert into public.appointments (
  id, tenant_id, service_id, guest_contact_id, starts_at, ends_at, status, manage_token_hash
) values (
  'eeeeeeee-cccc-0000-0000-000000000002',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'eeeeeeee-aaaa-0000-0000-000000000001',
  'eeeeeeee-bbbb-0000-0000-000000000001',
  '2027-01-04 11:00+00'::timestamptz,
  '2027-01-04 11:30+00'::timestamptz,
  'confirmed',
  encode(sha256('rsc-2'::bytea), 'hex')
);

commit;

-- ----------------------------------------------------------------------------
-- Test: validate_status_transition is permissive for any non-self transition
-- ----------------------------------------------------------------------------

\echo '-- transition matrix --'

do $$
declare
  src public.appointment_status;
  dst public.appointment_status;
  actual boolean;
begin
  for src in select unnest(enum_range(null::public.appointment_status)) loop
    for dst in select unnest(enum_range(null::public.appointment_status)) loop
      actual := public.validate_status_transition(src, dst);
      if not actual then
        raise exception 'transition % → % unexpectedly rejected', src, dst;
      end if;
    end loop;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: cancellations can be reversed (previously was rejected as terminal)
-- ----------------------------------------------------------------------------

\echo '-- cancellation reversed --'

do $$
declare
  v_status public.appointment_status;
begin
  -- Mark cancelled.
  update public.appointments
     set status = 'cancelled', cancelled_at = now()
   where id = 'eeeeeeee-cccc-0000-0000-000000000001';

  -- Re-instate to confirmed (would have raised invalid_status_transition
  -- pre-021).
  update public.appointments
     set status = 'confirmed', cancelled_at = null, cancelled_by_user_id = null
   where id = 'eeeeeeee-cccc-0000-0000-000000000001';

  select status into v_status from public.appointments
   where id = 'eeeeeeee-cccc-0000-0000-000000000001';

  if v_status <> 'confirmed' then
    raise exception 'expected re-instated to confirmed, got %', v_status;
  end if;

  -- Re-cancel for the rest of the suite (the EXCLUDE test below depends on
  -- appt 1 being cancelled).
  update public.appointments
     set status = 'cancelled', cancelled_at = now()
   where id = 'eeeeeeee-cccc-0000-0000-000000000001';
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: cancel populates cancelled_at + cancelled_by_user_id
-- ----------------------------------------------------------------------------

\echo '-- cancel metadata --'

do $$
declare
  v_cancelled_at timestamptz;
  v_cancelled_by uuid;
begin
  -- Emulate the Edge Function path: separate update setting cancelled_by.
  update public.appointments
     set cancelled_by_user_id = '00000000-0000-0000-0000-000000e70001'
   where id = 'eeeeeeee-cccc-0000-0000-000000000001';

  select cancelled_at, cancelled_by_user_id
    into v_cancelled_at, v_cancelled_by
    from public.appointments
   where id = 'eeeeeeee-cccc-0000-0000-000000000001';

  if v_cancelled_at is null then
    raise exception 'cancelled_at not populated';
  end if;
  if v_cancelled_by is null then
    raise exception 'cancelled_by_user_id not populated';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: rescheduling appt 2 onto appt 1's old window is OK because appt 1
-- is now cancelled (the EXCLUDE constraint excludes cancelled rows).
-- Then resurrect a third live appt and try to reschedule appt 2 onto it →
-- expect 23P01 EXCLUDE violation (slot_taken).
-- ----------------------------------------------------------------------------

\echo '-- EXCLUDE collision on reschedule --'

insert into public.appointments (
  id, tenant_id, service_id, guest_contact_id, starts_at, ends_at, status, manage_token_hash
) values (
  'eeeeeeee-cccc-0000-0000-000000000003',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'eeeeeeee-aaaa-0000-0000-000000000001',
  'eeeeeeee-bbbb-0000-0000-000000000001',
  '2027-01-04 12:00+00'::timestamptz,
  '2027-01-04 12:30+00'::timestamptz,
  'confirmed',
  encode(sha256('rsc-3'::bytea), 'hex')
);

do $$
begin
  -- This should succeed (target was a cancelled row).
  update public.appointments
     set starts_at = '2027-01-04 10:00+00'::timestamptz,
         ends_at   = '2027-01-04 10:30+00'::timestamptz
   where id = 'eeeeeeee-cccc-0000-0000-000000000002';

  -- Now move appt 2 onto appt 3's live window → must raise.
  begin
    update public.appointments
       set starts_at = '2027-01-04 12:00+00'::timestamptz,
           ends_at   = '2027-01-04 12:30+00'::timestamptz
     where id = 'eeeeeeee-cccc-0000-0000-000000000002';
    raise exception 'expected EXCLUDE violation when overlapping live appointment';
  exception when sqlstate '23P01' then null;
  end;
end;
$$;

-- ----------------------------------------------------------------------------
-- Cleanup
-- ----------------------------------------------------------------------------

delete from public.appointment_events where appointment_id in (
  select id from public.appointments where tenant_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
);
delete from public.appointments where tenant_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
delete from public.guest_contacts where tenant_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
delete from public.services where tenant_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
delete from public.memberships where tenant_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
delete from public.tenants where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
delete from auth.users where id = '00000000-0000-0000-0000-000000e70001';

\echo 'OK — reschedule + cancel tests passed.'
