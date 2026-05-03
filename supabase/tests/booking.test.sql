-- Booking + appointments tests.
-- Run via `make test-db`.

\set ON_ERROR_STOP on

\echo '== booking =='

-- ----------------------------------------------------------------------------
-- Setup: tenant + service + Mon-only rule that covers a far-future Monday.
-- ----------------------------------------------------------------------------

-- Pre-test cleanup (handles partial leftovers from prior failures).
delete from public.appointments where tenant_id = '44444444-4444-4444-4444-444444444444';
delete from public.guest_contacts where tenant_id = '44444444-4444-4444-4444-444444444444';
delete from public.availability_rules where tenant_id = '44444444-4444-4444-4444-444444444444';
delete from public.services where tenant_id = '44444444-4444-4444-4444-444444444444';
delete from public.tenants where id = '44444444-4444-4444-4444-444444444444';

begin;

insert into public.tenants (id, slug, name, timezone, default_locale)
values ('44444444-4444-4444-4444-444444444444', 'tz-book', 'Tz Book', 'Europe/Berlin', 'en');

insert into public.services (id, tenant_id, name, duration_minutes, min_notice_min, max_advance_days)
values (
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  'Test Consultation',
  30,
  0,    -- no min notice for testing
  3650  -- 10 years for far-future scenarios
);

-- Mon (dow=1) 09:00–17:00 in Berlin.
insert into public.availability_rules (tenant_id, day_of_week, start_time, end_time)
values ('44444444-4444-4444-4444-444444444444', 1, '09:00', '17:00');

commit;

-- ----------------------------------------------------------------------------
-- Test: full slot tiling — Monday 2026-06-15 should produce slots at 30min spacing.
-- ----------------------------------------------------------------------------

\echo '-- slot tiling --'

do $$
declare
  count_slots int;
  first_slot timestamptz;
begin
  select count(*) into count_slots
  from public.compute_available_slots(
    'tz-book',
    '55555555-5555-5555-5555-555555555555',
    '2026-06-15 00:00+00'::timestamptz,
    '2026-06-16 00:00+00'::timestamptz
  );
  -- 8 hours / 30 min = 16 slots, no buffers configured.
  if count_slots <> 16 then
    raise exception 'expected 16 slots on a tiled Mon, got %', count_slots;
  end if;

  select min(starts_at) into first_slot
  from public.compute_available_slots(
    'tz-book',
    '55555555-5555-5555-5555-555555555555',
    '2026-06-15 00:00+00'::timestamptz,
    '2026-06-16 00:00+00'::timestamptz
  );
  -- Berlin is CEST in June (UTC+2). 09:00 Berlin = 07:00 UTC.
  if first_slot <> '2026-06-15 07:00+00'::timestamptz then
    raise exception 'expected first slot at 07:00 UTC, got %', first_slot;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: book_appointment returns a manage token; subsequent attempt at the
-- same slot raises slot_taken.
-- ----------------------------------------------------------------------------

\echo '-- book_appointment + slot_taken --'

do $$
declare
  result record;
  appt_id uuid;
  token text;
begin
  select * into result
  from public.book_appointment(
    'tz-book',
    '55555555-5555-5555-5555-555555555555',
    '2026-06-15 07:00+00'::timestamptz,
    'Jane Doe',
    'jane@example.com',
    null
  );
  appt_id := result.appointment_id;
  token := result.manage_token;

  if appt_id is null then raise exception 'expected appointment_id'; end if;
  if token is null or length(token) < 32 then
    raise exception 'expected a manage token of at least 32 chars, got "%"', token;
  end if;
end;
$$;

do $$
declare saw_expected boolean := false;
begin
  begin
    perform * from public.book_appointment(
      'tz-book',
      '55555555-5555-5555-5555-555555555555',
      '2026-06-15 07:00+00'::timestamptz,
      'Bob Other',
      'bob@example.com',
      null
    );
  exception when others then
    if sqlerrm in ('slot_taken', 'slot_unavailable') then
      saw_expected := true;
    else
      raise exception 'unexpected error on duplicate booking: % (sqlstate %)', sqlerrm, sqlstate;
    end if;
  end;
  if not saw_expected then
    raise exception 'expected slot_taken/slot_unavailable on duplicate booking; call succeeded';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: cancelled appointment frees the slot — second booking succeeds.
-- ----------------------------------------------------------------------------

\echo '-- cancelled frees the range --'

update public.appointments
set status = 'cancelled', cancelled_at = now()
where tenant_id = '44444444-4444-4444-4444-444444444444'
  and starts_at = '2026-06-15 07:00+00'::timestamptz;

do $$
declare result record;
begin
  select * into result
  from public.book_appointment(
    'tz-book',
    '55555555-5555-5555-5555-555555555555',
    '2026-06-15 07:00+00'::timestamptz,
    'Charlie',
    'charlie@example.com',
    null
  );
  if result.appointment_id is null then
    raise exception 'expected to be able to re-book the cancelled slot';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: guest_contacts upsert by (tenant_id, email).
-- ----------------------------------------------------------------------------

\echo '-- guest upsert --'

do $$
declare
  count_before int;
  count_after int;
begin
  select count(*) into count_before
  from public.guest_contacts
  where tenant_id = '44444444-4444-4444-4444-444444444444'
    and email = 'jane@example.com';

  -- Re-book another slot with same email but different name.
  perform * from public.book_appointment(
    'tz-book',
    '55555555-5555-5555-5555-555555555555',
    '2026-06-15 07:30+00'::timestamptz,
    'Jane DIFFERENT',
    'jane@example.com',
    null
  );

  select count(*) into count_after
  from public.guest_contacts
  where tenant_id = '44444444-4444-4444-4444-444444444444'
    and email = 'jane@example.com';

  if count_after <> 1 then
    raise exception 'expected 1 guest_contacts row for jane@, got %', count_after;
  end if;

  if not exists (
    select 1 from public.guest_contacts
    where tenant_id = '44444444-4444-4444-4444-444444444444'
      and email = 'jane@example.com'
      and name = 'Jane DIFFERENT'
  ) then
    raise exception 'expected upsert to refresh the name';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: verify_manage_token round-trip + cancelled rejects.
-- ----------------------------------------------------------------------------

\echo '-- verify_manage_token --'

do $$
declare
  result record;
  appt_id uuid;
  token text;
  verified uuid;
begin
  select * into result
  from public.book_appointment(
    'tz-book',
    '55555555-5555-5555-5555-555555555555',
    '2026-06-15 08:00+00'::timestamptz,
    'Vera',
    'vera@example.com',
    null
  );
  appt_id := result.appointment_id;
  token := result.manage_token;

  verified := public.verify_manage_token(token);
  if verified <> appt_id then
    raise exception 'expected verify_manage_token to return the appointment id';
  end if;

  -- Cancel and verify again — should raise.
  update public.appointments set status = 'cancelled', cancelled_at = now() where id = appt_id;

  declare saw_raise boolean := false;
  begin
    begin
      perform public.verify_manage_token(token);
    exception when others then
      saw_raise := true;
    end;
    if not saw_raise then
      raise exception 'expected verify_manage_token to raise after cancellation';
    end if;
  end;
end;
$$;

-- ----------------------------------------------------------------------------
-- Test: appointments cannot be deleted (RLS denies).
-- ----------------------------------------------------------------------------

\echo '-- appointments cannot be deleted --'

begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000aaaa","role":"authenticated"}', true);

do $$
declare affected int;
begin
  delete from public.appointments where tenant_id = '44444444-4444-4444-4444-444444444444';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'expected zero rows deleted (RLS denies), got %', affected;
  end if;
end;
$$;

rollback;

-- ----------------------------------------------------------------------------
-- Test: appointment_events trigger writes a `created` row + a `status_changed`
-- row when status updates (postgres role bypasses RLS, so a simple update works).
-- ----------------------------------------------------------------------------

\echo '-- appointment_events trigger --'

do $$
declare
  result record;
  v_id uuid;
  events_after_insert int;
  events_after_update int;
begin
  -- Book a fresh appointment for this test so prior cancellations don't pollute counts.
  select * into result
  from public.book_appointment(
    'tz-book',
    '55555555-5555-5555-5555-555555555555',
    '2026-06-15 10:00+00'::timestamptz,
    'Eve Trigger',
    'eve@example.com',
    null
  );
  v_id := result.appointment_id;

  select count(*) into events_after_insert
  from public.appointment_events
  where appointment_id = v_id and event_type = 'created';
  if events_after_insert <> 1 then
    raise exception 'expected 1 created event, got %', events_after_insert;
  end if;

  update public.appointments set status = 'confirmed' where id = v_id;

  select count(*) into events_after_update
  from public.appointment_events
  where appointment_id = v_id and event_type = 'status_changed';
  if events_after_update <> 1 then
    raise exception 'expected 1 status_changed event, got %', events_after_update;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Cleanup
-- ----------------------------------------------------------------------------

delete from public.appointments where tenant_id = '44444444-4444-4444-4444-444444444444';
delete from public.guest_contacts where tenant_id = '44444444-4444-4444-4444-444444444444';
delete from public.availability_rules where tenant_id = '44444444-4444-4444-4444-444444444444';
delete from public.services where tenant_id = '44444444-4444-4444-4444-444444444444';
delete from public.tenants where id = '44444444-4444-4444-4444-444444444444';

\echo 'OK — booking tests passed.'
