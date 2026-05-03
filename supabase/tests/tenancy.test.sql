-- RLS policy tests for the tenancy capability.
-- Run with: make test-db
-- Each test runs in its own transaction and rolls back; cross-test bleed is impossible.

\set ON_ERROR_STOP on

\echo '== tenancy RLS =='

-- Helper: assert that a query returns the expected row count.
create or replace function pg_temp.assert_count(
  q text, expected int, msg text
)
returns void
language plpgsql
as $$
declare
  actual int;
begin
  execute 'select count(*) from (' || q || ') x' into actual;
  if actual <> expected then
    raise exception 'assert_count failed: %  (expected %, got %)', msg, expected, actual;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Setup: two users, two tenants, four memberships.
-- ----------------------------------------------------------------------------

-- Disable RLS for setup (we're running as the postgres role anyway, which bypasses RLS).
begin;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000001', 'alice@example.com', '{"full_name":"Alice"}'::jsonb),
  ('00000000-0000-0000-0000-000000000002', 'bob@example.com',   '{"full_name":"Bob"}'::jsonb)
on conflict (id) do nothing;

insert into public.tenants (id, slug, name, timezone, default_locale)
values
  ('11111111-1111-1111-1111-111111111111', 'tenant-x', 'Tenant X', 'Europe/Berlin', 'en'),
  ('22222222-2222-2222-2222-222222222222', 'tenant-y', 'Tenant Y', 'Asia/Dubai',    'en')
on conflict (id) do nothing;

insert into public.memberships (user_id, tenant_id, role) values
  ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'customer'),
  ('00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'owner')
on conflict do nothing;

commit;

-- ----------------------------------------------------------------------------
-- Test: Alice (member of X) can read X's tenant row, can read Y's public row,
-- can read her own memberships in both tenants, cannot update Y as a customer.
-- ----------------------------------------------------------------------------

\echo '-- alice perspective --'
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select pg_temp.assert_count(
  $$select 1 from public.tenants where slug = 'tenant-x'$$,
  1, 'alice can read tenant-x'
);
select pg_temp.assert_count(
  $$select 1 from public.tenants where slug = 'tenant-y'$$,
  1, 'alice can read tenant-y (public)'
);
select pg_temp.assert_count(
  $$select 1 from public.memberships where user_id = '00000000-0000-0000-0000-000000000001'$$,
  2, 'alice sees both her memberships'
);
select pg_temp.assert_count(
  $$select 1 from public.memberships where user_id = '00000000-0000-0000-0000-000000000002'$$,
  0, 'alice cannot see bob''s memberships in tenant-y (she''s only customer there)'
);

-- Alice is customer in Y; she cannot update Y's name.
do $$
declare affected int;
begin
  update public.tenants set name = 'hijacked' where id = '22222222-2222-2222-2222-222222222222';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'alice should not be able to update tenant-y, but updated % rows', affected;
  end if;
end;
$$;

rollback;

-- ----------------------------------------------------------------------------
-- Test: Bob (owner of Y) cannot see X's memberships.
-- ----------------------------------------------------------------------------

\echo '-- bob perspective --'
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select pg_temp.assert_count(
  $$select 1 from public.memberships where tenant_id = '11111111-1111-1111-1111-111111111111'$$,
  0, 'bob cannot see tenant-x memberships'
);

-- As owner of Y, bob can see all of Y's memberships (1 his own + 1 alice's).
select pg_temp.assert_count(
  $$select 1 from public.memberships where tenant_id = '22222222-2222-2222-2222-222222222222'$$,
  2, 'bob (owner of tenant-y) sees all tenant-y memberships'
);

rollback;

-- ----------------------------------------------------------------------------
-- Test: anon role can read tenants but cannot read memberships.
-- ----------------------------------------------------------------------------

\echo '-- anon perspective --'
begin;
set local role anon;

select pg_temp.assert_count(
  $$select 1 from public.tenants where slug = 'tenant-x'$$,
  1, 'anon can read tenant-x by slug'
);
select pg_temp.assert_count(
  $$select 1 from public.memberships$$,
  0, 'anon cannot see any memberships'
);

rollback;

-- ----------------------------------------------------------------------------
-- Test: assert_slug_available rejects reserved, taken, and malformed slugs.
-- ----------------------------------------------------------------------------

\echo '-- assert_slug_available --'

do $$
begin
  perform public.assert_slug_available('admin');
  raise exception 'assert_slug_available accepted a reserved slug';
exception when unique_violation then null;
end;
$$;

do $$
begin
  perform public.assert_slug_available('tenant-x');
  raise exception 'assert_slug_available accepted a taken slug';
exception when unique_violation then null;
end;
$$;

do $$
begin
  perform public.assert_slug_available('Acme');
  raise exception 'assert_slug_available accepted an uppercase slug';
exception when invalid_parameter_value then null;
end;
$$;

do $$
begin
  perform public.assert_slug_available('-acme');
  raise exception 'assert_slug_available accepted a leading-dash slug';
exception when invalid_parameter_value then null;
end;
$$;

-- valid slug succeeds
select public.assert_slug_available('acme-clinic');

-- ----------------------------------------------------------------------------
-- Cleanup
-- ----------------------------------------------------------------------------

delete from public.memberships where user_id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);
delete from public.tenants where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);
delete from auth.users where id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

\echo 'OK — tenancy RLS tests passed.'
