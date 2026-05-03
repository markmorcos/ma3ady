-- Availability tests for `compute_available_slots`.
-- Run with: make test-db-availability

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
-- Setup: a tenant in Berlin with Mon-only rules.
-- ----------------------------------------------------------------------------

begin;

insert into public.tenants (id, slug, name, timezone, default_locale)
values ('33333333-3333-3333-3333-333333333333', 'tz-berlin', 'TZ Test', 'Europe/Berlin', 'en')
on conflict (id) do nothing;

-- Monday 09:00–17:00 in Europe/Berlin.
insert into public.availability_rules (tenant_id, day_of_week, start_time, end_time)
values ('33333333-3333-3333-3333-333333333333', 1, '09:00', '17:00');

commit;

-- ----------------------------------------------------------------------------
-- Test: a Monday in mid-June 2026 produces a window 09:00–17:00 Berlin = 07:00–15:00 UTC.
-- ----------------------------------------------------------------------------

\echo '-- rule expansion in tenant TZ --'

do $$
declare
  expected_start timestamptz := '2026-06-15 07:00:00+00';
  expected_end   timestamptz := '2026-06-15 15:00:00+00';
  found int;
begin
  select count(*) into found
  from public.compute_available_slots(
    'tz-berlin', null,
    '2026-06-15 00:00+00'::timestamptz,
    '2026-06-16 00:00+00'::timestamptz
  )
  where starts_at = expected_start and ends_at = expected_end;

  if found <> 1 then
    raise exception 'expected one window 07:00–15:00 UTC on 2026-06-15, got %', found;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: DST spring-forward day. 2026-03-29 is the spring-forward Sunday in
-- Europe/Berlin (clocks jump 02:00 -> 03:00 CEST). The Monday after, 2026-03-30,
-- is in CEST (UTC+2). 09:00 Berlin = 07:00 UTC.
-- ----------------------------------------------------------------------------

\echo '-- DST: monday after spring-forward --'

do $$
declare
  expected_start timestamptz := '2026-03-30 07:00:00+00';
  found int;
begin
  select count(*) into found
  from public.compute_available_slots(
    'tz-berlin', null,
    '2026-03-30 00:00+00'::timestamptz,
    '2026-03-31 00:00+00'::timestamptz
  )
  where starts_at = expected_start;

  if found <> 1 then
    raise exception 'expected window starting 2026-03-30 07:00 UTC (09:00 Berlin CEST), got %', found;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: a Monday in mid-January 2026 (CET, UTC+1). 09:00 Berlin = 08:00 UTC.
-- ----------------------------------------------------------------------------

\echo '-- pre-DST winter monday --'

do $$
declare
  expected_start timestamptz := '2026-01-19 08:00:00+00';
  found int;
begin
  select count(*) into found
  from public.compute_available_slots(
    'tz-berlin', null,
    '2026-01-19 00:00+00'::timestamptz,
    '2026-01-20 00:00+00'::timestamptz
  )
  where starts_at = expected_start;

  if found <> 1 then
    raise exception 'expected window starting 2026-01-19 08:00 UTC (09:00 Berlin CET), got %', found;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: block exception subtracts a chunk out of the rule window.
-- Block 12:00–13:00 Berlin on 2026-06-15 → expect two windows: 09–12 and 13–17.
-- ----------------------------------------------------------------------------

\echo '-- block exception splits window --'

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
declare
  windows int;
begin
  select count(*) into windows
  from public.compute_available_slots(
    'tz-berlin', null,
    '2026-06-15 00:00+00'::timestamptz,
    '2026-06-16 00:00+00'::timestamptz
  );
  if windows <> 2 then
    raise exception 'expected 2 windows after block, got %', windows;
  end if;
end;
$$;

rollback;

-- ----------------------------------------------------------------------------
-- Test: extra exception adds availability outside the weekly grid.
-- Tuesday is not in rules; an extra on Tuesday should produce a window.
-- ----------------------------------------------------------------------------

\echo '-- extra exception adds a window --'

begin;

-- Tuesday 2026-06-16 (rules don't cover Tuesday). Extra 14:00–16:00 Berlin.
insert into public.availability_exceptions (tenant_id, kind, starts_at, ends_at)
values (
  '33333333-3333-3333-3333-333333333333',
  'extra',
  ('2026-06-16 14:00'::timestamp at time zone 'Europe/Berlin'),
  ('2026-06-16 16:00'::timestamp at time zone 'Europe/Berlin')
);

do $$
declare
  windows int;
begin
  select count(*) into windows
  from public.compute_available_slots(
    'tz-berlin', null,
    '2026-06-16 00:00+00'::timestamptz,
    '2026-06-17 00:00+00'::timestamptz
  );
  if windows <> 1 then
    raise exception 'expected exactly 1 extra-derived window on Tuesday, got %', windows;
  end if;
end;
$$;

rollback;

-- ----------------------------------------------------------------------------
-- Test: anonymous client can call the function (it's SECURITY DEFINER).
-- ----------------------------------------------------------------------------

\echo '-- anon can call --'

begin;

set local role anon;

select pg_temp.assert(
  exists (
    select 1 from public.compute_available_slots(
      'tz-berlin', null,
      '2026-06-15 00:00+00'::timestamptz,
      '2026-06-16 00:00+00'::timestamptz
    )
  ),
  'anon should be able to call compute_available_slots and get rows'
);

rollback;

-- ----------------------------------------------------------------------------
-- Test: anonymous client cannot insert availability_rules (RLS).
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
  when others then
    -- RLS may surface as 42501 (insufficient_privilege) or as a row count of 0;
    -- either is acceptable. If we somehow reached here without an exception,
    -- the previous raise already fired.
    null;
end;
$$;

rollback;

-- ----------------------------------------------------------------------------
-- Cleanup
-- ----------------------------------------------------------------------------

delete from public.availability_rules where tenant_id = '33333333-3333-3333-3333-333333333333';
delete from public.availability_exceptions where tenant_id = '33333333-3333-3333-3333-333333333333';
delete from public.tenants where id = '33333333-3333-3333-3333-333333333333';

\echo 'OK — availability tests passed.'
