-- check_slug_availability + assert_slug_available tests.
--
-- Run via `make test-db`.
--
-- The pending_memberships + handle_new_user promotion tests that used to
-- live here were dropped together with the team-invitation feature in
-- migrations 020.

\set ON_ERROR_STOP on

\echo '== onboarding =='

-- Pre-test cleanup
delete from public.tenants where id = '88888888-8888-8888-8888-888888888888';

-- Setup
begin;
insert into public.tenants (id, slug, name, timezone, default_locale)
values ('88888888-8888-8888-8888-888888888888', 'onboard-x', 'Onboard X', 'Europe/Berlin', 'en');
commit;

-- ----------------------------------------------------------------------------
-- check_slug_availability
-- ----------------------------------------------------------------------------

\echo '-- check_slug_availability --'

do $$
declare r record;
begin
  select * into r from public.check_slug_availability('totally-fresh-slug') limit 1;
  if not r.available or r.reason is not null then
    raise exception 'expected available, got %, reason=%', r.available, r.reason;
  end if;

  select * into r from public.check_slug_availability('onboard-x') limit 1;
  if r.available or r.reason <> 'taken' then
    raise exception 'expected taken, got %, reason=%', r.available, r.reason;
  end if;

  select * into r from public.check_slug_availability('admin') limit 1;
  if r.available or r.reason <> 'reserved' then
    raise exception 'expected reserved, got %, reason=%', r.available, r.reason;
  end if;

  select * into r from public.check_slug_availability('Acme') limit 1;
  if r.available or r.reason <> 'invalid' then
    raise exception 'expected invalid, got %, reason=%', r.available, r.reason;
  end if;

  select * into r from public.check_slug_availability('ab') limit 1;
  if r.available or r.reason <> 'invalid' then
    raise exception 'expected invalid (short), got %, reason=%', r.available, r.reason;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- assert_slug_available rejects taken slug
-- ----------------------------------------------------------------------------

\echo '-- assert_slug_available rejects taken slug --'

do $$
begin
  perform public.assert_slug_available('onboard-x');
  raise exception 'expected slug taken to raise';
exception when unique_violation then null;
end;
$$;

-- Cleanup
delete from public.tenants where id = '88888888-8888-8888-8888-888888888888';

\echo 'OK — onboarding tests passed.'
