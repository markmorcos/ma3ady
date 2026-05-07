-- Notifications pipeline tests.
-- Covers:
--   - notify_due_reminders inserts a reminder_24h row inside the window
--   - notify_due_reminders is idempotent: running twice produces only one row
--     per (appointment, event) pair
--   - notifications RLS denies direct INSERT
--   - cross-tenant SELECT isolation
--
-- Run via `make test-db`.

\set ON_ERROR_STOP on

\echo '== notifications =='

-- Pre-test cleanup
delete from public.notifications where appointment_id in (
  select id from public.appointments where tenant_id in (
    'aaaaaaa1-0000-0000-0000-000000000001',
    'aaaaaaa1-0000-0000-0000-000000000002'
  )
);
delete from public.appointment_events where appointment_id in (
  select id from public.appointments where tenant_id in (
    'aaaaaaa1-0000-0000-0000-000000000001',
    'aaaaaaa1-0000-0000-0000-000000000002'
  )
);
delete from public.appointments where tenant_id in (
  'aaaaaaa1-0000-0000-0000-000000000001',
  'aaaaaaa1-0000-0000-0000-000000000002'
);
delete from public.guest_contacts where tenant_id in (
  'aaaaaaa1-0000-0000-0000-000000000001',
  'aaaaaaa1-0000-0000-0000-000000000002'
);
delete from public.services where tenant_id in (
  'aaaaaaa1-0000-0000-0000-000000000001',
  'aaaaaaa1-0000-0000-0000-000000000002'
);
delete from public.memberships where tenant_id in (
  'aaaaaaa1-0000-0000-0000-000000000001',
  'aaaaaaa1-0000-0000-0000-000000000002'
);
delete from public.tenants where id in (
  'aaaaaaa1-0000-0000-0000-000000000001',
  'aaaaaaa1-0000-0000-0000-000000000002'
);
delete from auth.users where id in (
  '00000000-0000-0000-0000-000000fb0001',
  '00000000-0000-0000-0000-000000fb0002'
);

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000fb0001', 'fb-x@example.com'),
  ('00000000-0000-0000-0000-000000fb0002', 'fb-y@example.com')
on conflict (id) do nothing;

insert into public.tenants (id, slug, name, timezone, default_locale) values
  ('aaaaaaa1-0000-0000-0000-000000000001', 'fb-x', 'FB X', 'UTC', 'en'),
  ('aaaaaaa1-0000-0000-0000-000000000002', 'fb-y', 'FB Y', 'UTC', 'en');

insert into public.memberships (tenant_id, user_id, role) values
  ('aaaaaaa1-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000fb0001', 'admin'),
  ('aaaaaaa1-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000fb0002', 'admin');

insert into public.services (id, tenant_id, name, duration_minutes, min_notice_min, max_advance_days) values
  ('aaaaaaa1-aaaa-0000-0000-000000000001', 'aaaaaaa1-0000-0000-0000-000000000001', 'X-Svc', 30, 0, 3650),
  ('aaaaaaa1-aaaa-0000-0000-000000000002', 'aaaaaaa1-0000-0000-0000-000000000002', 'Y-Svc', 30, 0, 3650);

insert into public.guest_contacts (id, tenant_id, name, email) values
  ('aaaaaaa1-bbbb-0000-0000-000000000001', 'aaaaaaa1-0000-0000-0000-000000000001', 'Guest X', 'gx@example.com'),
  ('aaaaaaa1-bbbb-0000-0000-000000000002', 'aaaaaaa1-0000-0000-0000-000000000002', 'Guest Y', 'gy@example.com');

-- Appointment in X starting in 24h (within reminder_24h window).
insert into public.appointments (
  id, tenant_id, service_id, guest_contact_id, starts_at, ends_at, status, manage_token_hash
) values (
  'aaaaaaa1-cccc-0000-0000-000000000001',
  'aaaaaaa1-0000-0000-0000-000000000001',
  'aaaaaaa1-aaaa-0000-0000-000000000001',
  'aaaaaaa1-bbbb-0000-0000-000000000001',
  now() + interval '24 hours',
  now() + interval '24 hours 30 minutes',
  'confirmed',
  encode(sha256('fb-1'::bytea), 'hex')
);

-- Appointment in Y, also in 24h.
insert into public.appointments (
  id, tenant_id, service_id, guest_contact_id, starts_at, ends_at, status, manage_token_hash
) values (
  'aaaaaaa1-cccc-0000-0000-000000000002',
  'aaaaaaa1-0000-0000-0000-000000000002',
  'aaaaaaa1-aaaa-0000-0000-000000000002',
  'aaaaaaa1-bbbb-0000-0000-000000000002',
  now() + interval '24 hours',
  now() + interval '24 hours 30 minutes',
  'confirmed',
  encode(sha256('fb-2'::bytea), 'hex')
);

commit;

-- ----------------------------------------------------------------------------
-- Test: notify_due_reminders inserts one reminder_24h per appointment in window
-- ----------------------------------------------------------------------------

\echo '-- reminder_24h scheduling --'

select public.notify_due_reminders();

do $$
declare cnt int;
begin
  select count(*) into cnt
  from public.notifications
  where event = 'reminder_24h'
    and appointment_id = 'aaaaaaa1-cccc-0000-0000-000000000001';
  if cnt <> 1 then raise exception 'X: expected 1 reminder_24h, got %', cnt; end if;

  select count(*) into cnt
  from public.notifications
  where event = 'reminder_24h'
    and appointment_id = 'aaaaaaa1-cccc-0000-0000-000000000002';
  if cnt <> 1 then raise exception 'Y: expected 1 reminder_24h, got %', cnt; end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: idempotent — running again does NOT insert duplicates
-- ----------------------------------------------------------------------------

\echo '-- idempotency --'

select public.notify_due_reminders();
select public.notify_due_reminders();

do $$
declare cnt int;
begin
  select count(*) into cnt
  from public.notifications
  where event = 'reminder_24h'
    and appointment_id = 'aaaaaaa1-cccc-0000-0000-000000000001';
  if cnt <> 1 then raise exception 'idempotency violated: % rows', cnt; end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: direct INSERT denied under RLS
-- ----------------------------------------------------------------------------

\echo '-- direct INSERT denied --'

begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000fb0001","role":"authenticated"}', true);

do $$
begin
  insert into public.notifications (appointment_id, channel, event, status)
  values ('aaaaaaa1-cccc-0000-0000-000000000001', 'email', 'manual', 'queued');
  raise exception 'expected RLS denial on direct INSERT';
exception when sqlstate '42501' then null;
end;
$$;

rollback;

-- ----------------------------------------------------------------------------
-- Test: cross-tenant SELECT isolation
-- ----------------------------------------------------------------------------

\echo '-- cross-tenant isolation --'

begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000fb0001","role":"authenticated"}', true);

do $$
declare visible int;
begin
  select count(*) into visible
  from public.notifications n
  join public.appointments a on a.id = n.appointment_id
  where a.tenant_id = 'aaaaaaa1-0000-0000-0000-000000000002';
  if visible <> 0 then raise exception 'admin X saw % Y notifications', visible; end if;

  select count(*) into visible
  from public.notifications n
  join public.appointments a on a.id = n.appointment_id
  where a.tenant_id = 'aaaaaaa1-0000-0000-0000-000000000001';
  if visible < 1 then raise exception 'admin X expected >=1 X notifications, got %', visible; end if;
end;
$$;

rollback;

-- Cleanup
delete from public.notifications where appointment_id in (
  select id from public.appointments where tenant_id in (
    'aaaaaaa1-0000-0000-0000-000000000001',
    'aaaaaaa1-0000-0000-0000-000000000002'
  )
);
delete from public.appointment_events where appointment_id in (
  select id from public.appointments where tenant_id in (
    'aaaaaaa1-0000-0000-0000-000000000001',
    'aaaaaaa1-0000-0000-0000-000000000002'
  )
);
delete from public.appointments where tenant_id in (
  'aaaaaaa1-0000-0000-0000-000000000001',
  'aaaaaaa1-0000-0000-0000-000000000002'
);
delete from public.guest_contacts where tenant_id in (
  'aaaaaaa1-0000-0000-0000-000000000001',
  'aaaaaaa1-0000-0000-0000-000000000002'
);
delete from public.services where tenant_id in (
  'aaaaaaa1-0000-0000-0000-000000000001',
  'aaaaaaa1-0000-0000-0000-000000000002'
);
delete from public.memberships where tenant_id in (
  'aaaaaaa1-0000-0000-0000-000000000001',
  'aaaaaaa1-0000-0000-0000-000000000002'
);
delete from public.tenants where id in (
  'aaaaaaa1-0000-0000-0000-000000000001',
  'aaaaaaa1-0000-0000-0000-000000000002'
);
delete from auth.users where id in (
  '00000000-0000-0000-0000-000000fb0001',
  '00000000-0000-0000-0000-000000fb0002'
);

\echo 'OK — notifications tests passed.'
