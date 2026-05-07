-- Admin dashboard tests.
-- Covers:
--   - cross-tenant appointment isolation under RLS
--   - status transition trigger (pending → confirmed → completed,
--     and the forbidden cancelled → confirmed)
--   - tenant stats fixture (today / week / no-show counts)
--
-- Run via `make test-db`.

\set ON_ERROR_STOP on

\echo '== admin =='

-- ----------------------------------------------------------------------------
-- Pre-test cleanup
-- ----------------------------------------------------------------------------

delete from public.appointment_events where appointment_id in (
  select id from public.appointments where tenant_id in (
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999'
  )
);
delete from public.appointments where tenant_id in (
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999'
);
delete from public.guest_contacts where tenant_id in (
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999'
);
delete from public.services where tenant_id in (
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999'
);
delete from public.memberships where tenant_id in (
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999'
);
delete from public.tenants where id in (
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999'
);
delete from auth.users where id in (
  '00000000-0000-0000-0000-000000ad0001',
  '00000000-0000-0000-0000-000000ad0002',
  '00000000-0000-0000-0000-000000ad0003'
);

-- ----------------------------------------------------------------------------
-- Setup: two tenants, one staff member of X only, one customer with bookings
-- in X only, one service per tenant.
-- ----------------------------------------------------------------------------

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000ad0001', 'admin-x@example.com'),
  ('00000000-0000-0000-0000-000000ad0002', 'admin-y@example.com'),
  ('00000000-0000-0000-0000-000000ad0003', 'customer@example.com')
on conflict (id) do nothing;

insert into public.tenants (id, slug, name, timezone, default_locale) values
  ('88888888-8888-8888-8888-888888888888', 'admin-x', 'Admin X', 'UTC', 'en'),
  ('99999999-9999-9999-9999-999999999999', 'admin-y', 'Admin Y', 'UTC', 'en');

insert into public.memberships (tenant_id, user_id, role) values
  ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000ad0001', 'admin'),
  ('99999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000ad0002', 'admin'),
  ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000ad0003', 'customer');

insert into public.services (id, tenant_id, name, duration_minutes, min_notice_min, max_advance_days) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', 'X-Svc', 30, 0, 3650),
  ('aaaaaaaa-0000-0000-0000-000000000002', '99999999-9999-9999-9999-999999999999', 'Y-Svc', 30, 0, 3650);

insert into public.guest_contacts (id, tenant_id, name, email) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', 'Guest 1', 'g1@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '99999999-9999-9999-9999-999999999999', 'Guest 2', 'g2@example.com');

-- Today (UTC date) appointment in X. Use date_trunc('day', now()) + 10:00 to
-- guarantee "today" regardless of when the suite runs.
insert into public.appointments (
  id, tenant_id, service_id, user_id, starts_at, ends_at, status, manage_token_hash
) values (
  'cccccccc-0000-0000-0000-000000000001',
  '88888888-8888-8888-8888-888888888888',
  'aaaaaaaa-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000ad0003',
  date_trunc('day', now() at time zone 'UTC') + interval '10 hours',
  date_trunc('day', now() at time zone 'UTC') + interval '10 hours 30 minutes',
  'confirmed',
  encode(sha256('admin-test-1'::bytea), 'hex')
);

-- Tomorrow appointment in X (this week).
insert into public.appointments (
  id, tenant_id, service_id, user_id, starts_at, ends_at, status, manage_token_hash
) values (
  'cccccccc-0000-0000-0000-000000000002',
  '88888888-8888-8888-8888-888888888888',
  'aaaaaaaa-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000ad0003',
  date_trunc('day', now() at time zone 'UTC') + interval '1 day 14 hours',
  date_trunc('day', now() at time zone 'UTC') + interval '1 day 14 hours 30 minutes',
  'confirmed',
  encode(sha256('admin-test-2'::bytea), 'hex')
);

-- Past appointment in X completed (counts in 30d total).
insert into public.appointments (
  id, tenant_id, service_id, guest_contact_id, starts_at, ends_at, status, manage_token_hash
) values (
  'cccccccc-0000-0000-0000-000000000003',
  '88888888-8888-8888-8888-888888888888',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000001',
  now() - interval '5 days',
  now() - interval '5 days' + interval '30 minutes',
  'completed',
  encode(sha256('admin-test-3'::bytea), 'hex')
);

-- Past appointment in X no_show (counts as the no-show numerator).
insert into public.appointments (
  id, tenant_id, service_id, guest_contact_id, starts_at, ends_at, status, manage_token_hash
) values (
  'cccccccc-0000-0000-0000-000000000004',
  '88888888-8888-8888-8888-888888888888',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000001',
  now() - interval '7 days',
  now() - interval '7 days' + interval '30 minutes',
  'no_show',
  encode(sha256('admin-test-4'::bytea), 'hex')
);

-- Cross-tenant appointment in Y (must be invisible to X's customer).
insert into public.appointments (
  id, tenant_id, service_id, guest_contact_id, starts_at, ends_at, status, manage_token_hash
) values (
  'cccccccc-0000-0000-0000-000000000005',
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-0000-0000-0000-000000000002',
  'bbbbbbbb-0000-0000-0000-000000000002',
  date_trunc('day', now() at time zone 'UTC') + interval '11 hours',
  date_trunc('day', now() at time zone 'UTC') + interval '11 hours 30 minutes',
  'confirmed',
  encode(sha256('admin-test-5'::bytea), 'hex')
);

commit;

-- ----------------------------------------------------------------------------
-- Test: cross-tenant isolation on SELECT (the customer of X must not see Y).
-- ----------------------------------------------------------------------------

\echo '-- cross-tenant appointment isolation --'

begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000ad0003","role":"authenticated"}', true);

do $$
declare visible int;
begin
  select count(*) into visible
  from public.appointments
  where tenant_id = '99999999-9999-9999-9999-999999999999';
  if visible <> 0 then
    raise exception 'customer of X saw % rows in Y (expected 0)', visible;
  end if;
end;
$$;

-- The customer SHOULD see their own X appointments (user_id = self).
do $$
declare visible int;
begin
  select count(*) into visible
  from public.appointments
  where tenant_id = '88888888-8888-8888-8888-888888888888';
  if visible <> 2 then
    raise exception 'customer of X expected 2 own rows, got %', visible;
  end if;
end;
$$;

rollback;

-- Admin of X must see all X appointments but no Y rows.
\echo '-- admin scope --'
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000ad0001","role":"authenticated"}', true);

do $$
declare visible int;
begin
  select count(*) into visible
  from public.appointments
  where tenant_id = '88888888-8888-8888-8888-888888888888';
  if visible <> 4 then
    raise exception 'admin of X expected 4 rows, got %', visible;
  end if;

  select count(*) into visible
  from public.appointments
  where tenant_id = '99999999-9999-9999-9999-999999999999';
  if visible <> 0 then
    raise exception 'admin of X saw % Y rows (expected 0)', visible;
  end if;
end;
$$;

rollback;

-- ----------------------------------------------------------------------------
-- Test: status transition state machine (validate_status_transition + trigger).
-- ----------------------------------------------------------------------------

\echo '-- status transitions --'

-- Pure-function checks first.
do $$
begin
  if not public.validate_status_transition('pending', 'confirmed') then
    raise exception 'pending → confirmed should be allowed';
  end if;
  if not public.validate_status_transition('confirmed', 'completed') then
    raise exception 'confirmed → completed should be allowed';
  end if;
  if not public.validate_status_transition('confirmed', 'cancelled') then
    raise exception 'confirmed → cancelled should be allowed';
  end if;
  if public.validate_status_transition('cancelled', 'confirmed') then
    raise exception 'cancelled → confirmed must be forbidden';
  end if;
  if public.validate_status_transition('completed', 'pending') then
    raise exception 'completed → pending must be forbidden';
  end if;
  if public.validate_status_transition('no_show', 'confirmed') then
    raise exception 'no_show → confirmed must be forbidden';
  end if;
end;
$$;

-- Trigger-level rejection (raises invalid_status_transition).
do $$
begin
  -- Force-set the existing row to cancelled by going through pending first
  -- because confirmed → cancelled is allowed, but we'll pick a row that's
  -- already completed (id ...3) to test the terminal lock.
  update public.appointments
    set status = 'pending'
    where id = 'cccccccc-0000-0000-0000-000000000003';
  raise exception 'expected invalid_status_transition raise on completed → pending';
exception
  when sqlstate '22023' then null;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: tenant stats fixture
--   today count        = 1 (id ...1 created at 10:00 UTC today)
--   week confirmed     = 3 (today + tomorrow + 5d-ago completed; impl uses ±7d window)
--   30d completed/ns   = 2 (one completed, one no_show) → noShowRate = 0.5
-- ----------------------------------------------------------------------------

\echo '-- stats fixture --'

do $$
declare
  today_count int;
  week_confirmed int;
  total_30d int;
  no_shows int;
begin
  select count(*) into today_count
  from public.appointments
  where tenant_id = '88888888-8888-8888-8888-888888888888'
    and (starts_at at time zone 'UTC')::date = (now() at time zone 'UTC')::date;
  if today_count <> 1 then
    raise exception 'expected 1 today appointment, got %', today_count;
  end if;

  select count(*) into week_confirmed
  from public.appointments
  where tenant_id = '88888888-8888-8888-8888-888888888888'
    and status in ('confirmed', 'completed')
    and starts_at >= now() - interval '7 days'
    and starts_at <  now() + interval '7 days';
  if week_confirmed <> 3 then
    raise exception 'expected 3 week confirmed/completed, got %', week_confirmed;
  end if;

  select count(*) into total_30d
  from public.appointments
  where tenant_id = '88888888-8888-8888-8888-888888888888'
    and status in ('completed', 'no_show')
    and starts_at >= now() - interval '30 days'
    and starts_at <  now();
  select count(*) into no_shows
  from public.appointments
  where tenant_id = '88888888-8888-8888-8888-888888888888'
    and status = 'no_show'
    and starts_at >= now() - interval '30 days'
    and starts_at <  now();
  if total_30d <> 2 then
    raise exception 'expected 2 completed/no_show in 30d, got %', total_30d;
  end if;
  if no_shows <> 1 then
    raise exception 'expected 1 no_show in 30d, got %', no_shows;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Cleanup
-- ----------------------------------------------------------------------------

delete from public.appointment_events where appointment_id in (
  select id from public.appointments where tenant_id in (
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999'
  )
);
delete from public.appointments where tenant_id in (
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999'
);
delete from public.guest_contacts where tenant_id in (
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999'
);
delete from public.services where tenant_id in (
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999'
);
delete from public.memberships where tenant_id in (
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999'
);
delete from public.tenants where id in (
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999'
);
delete from auth.users where id in (
  '00000000-0000-0000-0000-000000ad0001',
  '00000000-0000-0000-0000-000000ad0002',
  '00000000-0000-0000-0000-000000ad0003'
);

\echo 'OK — admin tests passed.'
