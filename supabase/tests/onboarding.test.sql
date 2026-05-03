-- pending_memberships + handle_new_user promotion + check_slug_availability tests.
-- Run via `make test-db`.

\set ON_ERROR_STOP on

\echo '== onboarding =='

-- Pre-test cleanup
delete from public.pending_memberships where email like 'onboard-%';
delete from public.tenant_audit_events where tenant_id = '88888888-8888-8888-8888-888888888888';
delete from public.memberships where tenant_id = '88888888-8888-8888-8888-888888888888';
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
-- pending_memberships insert writes a member.invited audit row
-- ----------------------------------------------------------------------------

\echo '-- pending_memberships audit (carry-over) --'

insert into public.pending_memberships (tenant_id, email, role)
values ('88888888-8888-8888-8888-888888888888', 'onboard-cara@example.com', 'staff');

do $$
declare row_payload jsonb;
begin
  select payload into row_payload from public.tenant_audit_events
  where tenant_id = '88888888-8888-8888-8888-888888888888' and kind = 'member.invited'
  order by created_at desc limit 1;
  if row_payload is null then
    raise exception 'expected member.invited audit row';
  end if;
  if row_payload->>'email' <> 'onboard-cara@example.com' or row_payload->>'role' <> 'staff' then
    raise exception 'audit payload mismatch: %', row_payload;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- handle_new_user promotes pending membership on first sign-up
-- ----------------------------------------------------------------------------

\echo '-- pending → membership on signup --'

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-00000bca0001', 'onboard-cara@example.com')
on conflict (id) do nothing;

do $$
declare member_count int; pending_count int;
begin
  select count(*) into member_count from public.memberships
  where tenant_id = '88888888-8888-8888-8888-888888888888'
    and user_id = '00000000-0000-0000-0000-00000bca0001';
  if member_count <> 1 then
    raise exception 'expected exactly 1 membership after signup, got %', member_count;
  end if;

  select count(*) into pending_count from public.pending_memberships
  where email = 'onboard-cara@example.com';
  if pending_count <> 0 then
    raise exception 'expected pending row to be deleted, got %', pending_count;
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
delete from public.pending_memberships where email like 'onboard-%';
delete from public.memberships where tenant_id = '88888888-8888-8888-8888-888888888888';
delete from public.tenant_audit_events where tenant_id = '88888888-8888-8888-8888-888888888888';
delete from public.tenants where id = '88888888-8888-8888-8888-888888888888';
delete from auth.users where id = '00000000-0000-0000-0000-00000bca0001';

\echo 'OK — onboarding tests passed.'
