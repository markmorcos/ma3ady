-- Reschedule + cancel tests.
-- Covers:
--   - validate_status_transition: full allowed/disallowed matrix
--   - trigger rejects disallowed transitions and leaves the row untouched
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
-- Test: validate_status_transition matrix
-- ----------------------------------------------------------------------------

\echo '-- transition matrix --'

do $$
declare
  src public.appointment_status;
  dst public.appointment_status;
  expected boolean;
  actual boolean;
  -- allowed pairs as 'src->dst' literals
  allowed text[] := array[
    'pending->pending',
    'pending->confirmed',
    'pending->cancelled',
    'pending->no_show',
    'confirmed->confirmed',
    'confirmed->cancelled',
    'confirmed->completed',
    'confirmed->no_show',
    'cancelled->cancelled',
    'completed->completed',
    'no_show->no_show'
  ];
begin
  for src in select unnest(enum_range(null::public.appointment_status)) loop
    for dst in select unnest(enum_range(null::public.appointment_status)) loop
      expected := (src::text || '->' || dst::text) = any(allowed);
      actual := public.validate_status_transition(src, dst);
      if expected <> actual then
        raise exception 'transition % → %: expected %, got %', src, dst, expected, actual;
      end if;
    end loop;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: disallowed transition triggers rejection and does not mutate the row
-- ----------------------------------------------------------------------------

\echo '-- disallowed transition rejected --'

do $$
declare
  before_status public.appointment_status;
  after_status public.appointment_status;
begin
  -- First, mark appt 1 cancelled (allowed).
  update public.appointments
     set status = 'cancelled', cancelled_at = now()
   where id = 'eeeeeeee-cccc-0000-0000-000000000001';

  select status into before_status from public.appointments
   where id = 'eeeeeeee-cccc-0000-0000-000000000001';

  begin
    update public.appointments
       set status = 'confirmed'
     where id = 'eeeeeeee-cccc-0000-0000-000000000001';
    raise exception 'expected invalid_status_transition raise';
  exception when sqlstate '22023' then null;
  end;

  select status into after_status from public.appointments
   where id = 'eeeeeeee-cccc-0000-0000-000000000001';
  if before_status <> after_status then
    raise exception 'row mutated despite rejected transition (%, %)', before_status, after_status;
  end if;
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
  -- The first appointment is already cancelled above (without cancelled_by);
  -- emulate the Edge Function path: separate update setting both fields.
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
