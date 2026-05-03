-- Availability tests for `compute_available_slots`.
-- Run via `make test-db`.
--
-- Note: after define-services-and-appointments lands, the function returns
-- *tiled slots* (per service.duration_minutes) rather than raw windows. These
-- tests provision a 30-minute service and assert slot boundaries / TZ behavior.

\set ON_ERROR_STOP on

\echo '== availability =='

create or replace function pg_temp.assert(
  cond boolean, msg text
) returns void language plpgsql as $$
begin
  if not cond then raise exception 'assert failed: %', msg; end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Setup: tenant in Berlin + 30-min service + Monday 09:00–17:00 rule.
-- ----------------------------------------------------------------------------

begin;

insert into public.tenants (id, slug, name, timezone, default_locale)
values ('33333333-3333-3333-3333-333333333333', 'tz-berlin', 'TZ Test', 'Europe/Berlin', 'en')
on conflict (id) do nothing;

insert into public.services (id, tenant_id, name, duration_minutes, min_notice_min, max_advance_days)
values (
  '33333333-3333-3333-3333-3333aaaaaaaa',
  '33333333-3333-3333-3333-333333333333',
  'TZ Test Service',
  30,
  0,        -- no min notice for tests
  3650      -- ~10 years so future-dated tests pass
)
on conflict (id) do nothing;

insert into public.availability_rules (tenant_id, day_of_week, start_time, end_time)
values ('33333333-3333-3333-3333-333333333333', 1, '09:00', '17:00');

commit;

-- ----------------------------------------------------------------------------
-- Test: Monday in mid-June 2026 (Berlin CEST = UTC+2). First slot at 07:00 UTC.
-- 30 min slots from 09:00 to 17:00 = 16 slots.
-- ----------------------------------------------------------------------------

\echo '-- mid-summer Monday --'

do $$
declare
  count_slots int;
  first_slot timestamptz;
begin
  select count(*), min(starts_at)
  into count_slots, first_slot
  from public.compute_available_slots(
    'tz-berlin',
    '33333333-3333-3333-3333-3333aaaaaaaa',
    '2026-06-15 00:00+00'::timestamptz,
    '2026-06-16 00:00+00'::timestamptz
  );

  if count_slots <> 16 then
    raise exception 'expected 16 slots on 2026-06-15, got %', count_slots;
  end if;
  if first_slot <> '2026-06-15 07:00+00'::timestamptz then
    raise exception 'expected first slot at 07:00 UTC (Berlin CEST), got %', first_slot;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: pre-DST winter Monday (CET = UTC+1). 09:00 Berlin = 08:00 UTC.
-- ----------------------------------------------------------------------------

\echo '-- winter Monday (CET) --'

do $$
declare first_slot timestamptz;
begin
  select min(starts_at) into first_slot
  from public.compute_available_slots(
    'tz-berlin',
    '33333333-3333-3333-3333-3333aaaaaaaa',
    '2026-01-19 00:00+00'::timestamptz,
    '2026-01-20 00:00+00'::timestamptz
  );
  if first_slot <> '2026-01-19 08:00+00'::timestamptz then
    raise exception 'expected first slot at 08:00 UTC (Berlin CET), got %', first_slot;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: post-DST Monday (CEST after spring-forward). 09:00 Berlin = 07:00 UTC.
-- ----------------------------------------------------------------------------

\echo '-- post-DST Monday (CEST) --'

do $$
declare first_slot timestamptz;
begin
  select min(starts_at) into first_slot
  from public.compute_available_slots(
    'tz-berlin',
    '33333333-3333-3333-3333-3333aaaaaaaa',
    '2026-03-30 00:00+00'::timestamptz,
    '2026-03-31 00:00+00'::timestamptz
  );
  if first_slot <> '2026-03-30 07:00+00'::timestamptz then
    raise exception 'expected first slot at 07:00 UTC (Berlin CEST), got %', first_slot;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: block exception removes 12:00–13:00 Berlin → loses 2 slots out of 16.
-- ----------------------------------------------------------------------------

\echo '-- block exception removes its slots --'

begin;

insert into public.availability_exceptions (tenant_id, kind, starts_at, ends_at, reason)
values (
  '33333333-3333-3333-3333-333333333333',
  'block',
  ('2026-06-15 12:00'::timestamp at time zone 'Europe/Berlin'),
  ('2026-06-15 13:00'::timestamp at time zone 'Europe/Berlin'),
  'lunch'
);

do $$
declare count_slots int;
begin
  select count(*) into count_slots
  from public.compute_available_slots(
    'tz-berlin',
    '33333333-3333-3333-3333-3333aaaaaaaa',
    '2026-06-15 00:00+00'::timestamptz,
    '2026-06-16 00:00+00'::timestamptz
  );
  if count_slots <> 14 then
    raise exception 'expected 14 slots after lunch block, got %', count_slots;
  end if;
end;
$$;

rollback;

-- ----------------------------------------------------------------------------
-- Test: extra exception adds slots outside the weekly grid (Tuesday 14–16).
-- ----------------------------------------------------------------------------

\echo '-- extra exception adds slots --'

begin;

insert into public.availability_exceptions (tenant_id, kind, starts_at, ends_at)
values (
  '33333333-3333-3333-3333-333333333333',
  'extra',
  ('2026-06-16 14:00'::timestamp at time zone 'Europe/Berlin'),
  ('2026-06-16 16:00'::timestamp at time zone 'Europe/Berlin')
);

do $$
declare count_slots int;
begin
  select count(*) into count_slots
  from public.compute_available_slots(
    'tz-berlin',
    '33333333-3333-3333-3333-3333aaaaaaaa',
    '2026-06-16 00:00+00'::timestamptz,
    '2026-06-17 00:00+00'::timestamptz
  );
  -- 2 hours / 30 min = 4 slots.
  if count_slots <> 4 then
    raise exception 'expected 4 extra-derived slots on Tuesday, got %', count_slots;
  end if;
end;
$$;

rollback;

-- ----------------------------------------------------------------------------
-- Test: anonymous client can call the function (SECURITY DEFINER).
-- ----------------------------------------------------------------------------

\echo '-- anon can call --'

begin;

set local role anon;

select pg_temp.assert(
  exists (
    select 1 from public.compute_available_slots(
      'tz-berlin',
      '33333333-3333-3333-3333-3333aaaaaaaa',
      '2026-06-15 00:00+00'::timestamptz,
      '2026-06-16 00:00+00'::timestamptz
    )
  ),
  'anon should be able to call compute_available_slots and get rows'
);

rollback;

-- ----------------------------------------------------------------------------
-- Test: anon cannot insert availability_rules (RLS).
-- ----------------------------------------------------------------------------

\echo '-- anon cannot write rules --'

begin;
set local role anon;

do $$
begin
  insert into public.availability_rules (tenant_id, day_of_week, start_time, end_time)
  values ('33333333-3333-3333-3333-333333333333', 2, '10:00', '12:00');
  raise exception 'anon should not be able to insert into availability_rules';
exception when insufficient_privilege then null;
  when others then null;
end;
$$;

rollback;

-- ----------------------------------------------------------------------------
-- Cleanup
-- ----------------------------------------------------------------------------

delete from public.availability_rules where tenant_id = '33333333-3333-3333-3333-333333333333';
delete from public.availability_exceptions where tenant_id = '33333333-3333-3333-3333-333333333333';
delete from public.services where tenant_id = '33333333-3333-3333-3333-333333333333';
delete from public.tenants where id = '33333333-3333-3333-3333-333333333333';

\echo 'OK — availability tests passed.'
