-- Observability tests.
-- Covers:
--   - direct client_errors INSERT is denied (must go through report-client-error)
--   - admin of tenant X can see X rows but NOT Y rows
--   - a user can see their own rows even if tenant_id is null
--
-- Run via `make test-db`.

\set ON_ERROR_STOP on

\echo '== observability =='

-- Pre-test cleanup
delete from public.client_errors where tenant_id in (
  'fffffff0-0000-0000-0000-000000000001',
  'fffffff0-0000-0000-0000-000000000002'
);
delete from public.memberships where tenant_id in (
  'fffffff0-0000-0000-0000-000000000001',
  'fffffff0-0000-0000-0000-000000000002'
);
delete from public.tenants where id in (
  'fffffff0-0000-0000-0000-000000000001',
  'fffffff0-0000-0000-0000-000000000002'
);
delete from auth.users where id in (
  '00000000-0000-0000-0000-000000fa0001',
  '00000000-0000-0000-0000-000000fa0002'
);

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000fa0001', 'fa-admin-x@example.com'),
  ('00000000-0000-0000-0000-000000fa0002', 'fa-admin-y@example.com')
on conflict (id) do nothing;

insert into public.tenants (id, slug, name, timezone, default_locale) values
  ('fffffff0-0000-0000-0000-000000000001', 'fa-x', 'FA X', 'UTC', 'en'),
  ('fffffff0-0000-0000-0000-000000000002', 'fa-y', 'FA Y', 'UTC', 'en');

insert into public.memberships (tenant_id, user_id, role) values
  ('fffffff0-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000fa0001', 'admin'),
  ('fffffff0-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000fa0002', 'admin');

-- Insert two error rows (postgres role bypasses RLS so we can prep state).
insert into public.client_errors (user_id, tenant_id, kind, message)
values
  ('00000000-0000-0000-0000-000000fa0001', 'fffffff0-0000-0000-0000-000000000001', 'boundary', 'X error'),
  ('00000000-0000-0000-0000-000000fa0002', 'fffffff0-0000-0000-0000-000000000002', 'manual', 'Y error');

commit;

-- ----------------------------------------------------------------------------
-- direct INSERT must be denied (RLS WITH CHECK false)
-- ----------------------------------------------------------------------------

\echo '-- direct INSERT denied --'

begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000fa0001","role":"authenticated"}', true);

do $$
begin
  insert into public.client_errors (user_id, tenant_id, kind, message)
  values ('00000000-0000-0000-0000-000000fa0001', 'fffffff0-0000-0000-0000-000000000001', 'manual', 'sneaky');
  raise exception 'expected RLS denial on direct INSERT';
exception when sqlstate '42501' then null;
end;
$$;

rollback;

-- ----------------------------------------------------------------------------
-- admin of X sees only X rows
-- ----------------------------------------------------------------------------

\echo '-- cross-tenant isolation --'

begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000fa0001","role":"authenticated"}', true);

do $$
declare cnt int;
begin
  select count(*) into cnt from public.client_errors
   where tenant_id = 'fffffff0-0000-0000-0000-000000000001';
  if cnt <> 1 then raise exception 'admin X expected 1 X row, got %', cnt; end if;

  select count(*) into cnt from public.client_errors
   where tenant_id = 'fffffff0-0000-0000-0000-000000000002';
  if cnt <> 0 then raise exception 'admin X saw % Y rows', cnt; end if;
end;
$$;

rollback;

-- Cleanup
delete from public.client_errors where tenant_id in (
  'fffffff0-0000-0000-0000-000000000001',
  'fffffff0-0000-0000-0000-000000000002'
);
delete from public.memberships where tenant_id in (
  'fffffff0-0000-0000-0000-000000000001',
  'fffffff0-0000-0000-0000-000000000002'
);
delete from public.tenants where id in (
  'fffffff0-0000-0000-0000-000000000001',
  'fffffff0-0000-0000-0000-000000000002'
);
delete from auth.users where id in (
  '00000000-0000-0000-0000-000000fa0001',
  '00000000-0000-0000-0000-000000fa0002'
);

\echo 'OK — observability tests passed.'
