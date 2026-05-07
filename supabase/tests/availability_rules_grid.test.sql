-- Availability rules grid tests.
-- Covers:
--   - bulk_replace_rules_for_day is atomic on bad input (rolls back)
--   - replacing a band reflects in compute_available_slots
--   - copy-day produces identical bands on multiple target days
--   - block exception removes affected slots from compute_available_slots
--
-- Run via `make test-db`.

\set ON_ERROR_STOP on

\echo '== availability rules grid =='

-- ----------------------------------------------------------------------------
-- Pre-test cleanup
-- ----------------------------------------------------------------------------

delete from public.availability_exceptions where tenant_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
delete from public.availability_rules where tenant_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
delete from public.services where tenant_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
delete from public.memberships where tenant_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
delete from public.tenants where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
delete from auth.users where id = '00000000-0000-0000-0000-000000a70001';

-- ----------------------------------------------------------------------------
-- Setup: tenant with one admin (UTC tenant for simpler timestamp math),
-- single 30-min service, no rules yet.
-- ----------------------------------------------------------------------------

begin;

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000a70001', 'rules-admin@example.com')
on conflict (id) do nothing;

insert into public.tenants (id, slug, name, timezone, default_locale)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'rules-grid', 'Rules Grid', 'UTC', 'en');

insert into public.memberships (tenant_id, user_id, role)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000a70001', 'admin');

insert into public.services (id, tenant_id, name, duration_minutes, min_notice_min, max_advance_days)
values (
  'dddddddd-aaaa-0000-0000-000000000001',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'Rules Service',
  30,
  0,
  3650
);

commit;

-- ----------------------------------------------------------------------------
-- Test: replacing a band reflects in compute_available_slots
--   1. Set Mon (dow=1) 09:00–12:00 → expect 6 slots on a future Monday
--   2. Replace with 09:00–17:00 → expect 16 slots
-- ----------------------------------------------------------------------------

\echo '-- replace-band reflects in slots --'

begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000a70001","role":"authenticated"}', true);

select public.bulk_replace_rules_for_day(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  1,
  '[{"start_time":"09:00","end_time":"12:00"}]'::jsonb
);

do $$
declare cnt int;
begin
  select count(*) into cnt
  from public.compute_available_slots(
    'rules-grid',
    'dddddddd-aaaa-0000-0000-000000000001',
    '2026-06-15 00:00+00'::timestamptz,
    '2026-06-15 23:59+00'::timestamptz
  );
  if cnt <> 6 then
    raise exception '09–12 band: expected 6 slots, got %', cnt;
  end if;
end;
$$;

select public.bulk_replace_rules_for_day(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  1,
  '[{"start_time":"09:00","end_time":"17:00"}]'::jsonb
);

do $$
declare cnt int;
begin
  select count(*) into cnt
  from public.compute_available_slots(
    'rules-grid',
    'dddddddd-aaaa-0000-0000-000000000001',
    '2026-06-15 00:00+00'::timestamptz,
    '2026-06-15 23:59+00'::timestamptz
  );
  if cnt <> 16 then
    raise exception '09–17 band: expected 16 slots, got %', cnt;
  end if;
end;
$$;

commit;

-- ----------------------------------------------------------------------------
-- Test: bulk_replace_rules_for_day is atomic on bad input (rejects out-of-range
-- day_of_week before touching any rows).
-- ----------------------------------------------------------------------------

\echo '-- bulk replace is atomic --'

begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000a70001","role":"authenticated"}', true);

-- Capture pre-state
do $$
declare before_count int;
begin
  select count(*) into before_count
  from public.availability_rules
  where tenant_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and day_of_week = 1;

  begin
    perform public.bulk_replace_rules_for_day(
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      9,  -- invalid
      '[{"start_time":"08:00","end_time":"10:00"}]'::jsonb
    );
    raise exception 'expected invalid_day_of_week to raise';
  exception when sqlstate '22023' then null;
  end;

  -- Mon rules should be untouched.
  if (select count(*) from public.availability_rules
       where tenant_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and day_of_week = 1) <> before_count then
    raise exception 'bulk_replace mutated rules despite raising';
  end if;
end;
$$;

commit;

-- ----------------------------------------------------------------------------
-- Test: copy-day produces identical bands on multiple target days
-- ----------------------------------------------------------------------------

\echo '-- copy-day --'

begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000a70001","role":"authenticated"}', true);

-- Source = Mon (already 09–17). Copy to Tue (2) and Wed (3).
select public.bulk_replace_rules_for_day(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  2,
  '[{"start_time":"09:00","end_time":"17:00"}]'::jsonb
);
select public.bulk_replace_rules_for_day(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  3,
  '[{"start_time":"09:00","end_time":"17:00"}]'::jsonb
);

do $$
declare distinct_band_count int;
begin
  select count(*) into distinct_band_count
  from (
    select distinct start_time, end_time
    from public.availability_rules
    where tenant_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
      and day_of_week in (1, 2, 3)
  ) x;
  if distinct_band_count <> 1 then
    raise exception 'copy-day: expected 1 distinct band across Mon/Tue/Wed, got %', distinct_band_count;
  end if;
end;
$$;

commit;

-- ----------------------------------------------------------------------------
-- Test: block exception removes affected slots from public booking flow
--   Add a block from 10:00–11:00 UTC on the test Monday → expect 16 - 2 = 14.
-- ----------------------------------------------------------------------------

\echo '-- block exception --'

begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000a70001","role":"authenticated"}', true);

insert into public.availability_exceptions (tenant_id, kind, starts_at, ends_at, reason)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'block',
  '2026-06-15 10:00+00'::timestamptz,
  '2026-06-15 11:00+00'::timestamptz,
  'rules-grid test'
);

do $$
declare cnt int;
begin
  select count(*) into cnt
  from public.compute_available_slots(
    'rules-grid',
    'dddddddd-aaaa-0000-0000-000000000001',
    '2026-06-15 00:00+00'::timestamptz,
    '2026-06-15 23:59+00'::timestamptz
  );
  if cnt <> 14 then
    raise exception 'block exception: expected 14 slots, got %', cnt;
  end if;
end;
$$;

commit;

-- ----------------------------------------------------------------------------
-- Cleanup
-- ----------------------------------------------------------------------------

delete from public.availability_exceptions where tenant_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
delete from public.availability_rules where tenant_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
delete from public.services where tenant_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
delete from public.memberships where tenant_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
delete from public.tenants where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
delete from auth.users where id = '00000000-0000-0000-0000-000000a70001';

\echo 'OK — availability rules grid tests passed.'
