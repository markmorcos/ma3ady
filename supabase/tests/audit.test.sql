-- tenant_audit_events trigger + RLS tests.
-- Run via `make test-db`.

\set ON_ERROR_STOP on

\echo '== audit log =='

-- ----------------------------------------------------------------------------
-- Pre-test cleanup
-- ----------------------------------------------------------------------------

delete from public.availability_exceptions where tenant_id in (
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777'
);
delete from public.availability_rules where tenant_id in (
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777'
);
delete from public.services where tenant_id in (
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777'
);
delete from public.tenant_audit_events where tenant_id in (
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777'
);
delete from public.memberships where tenant_id in (
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777'
);
delete from public.tenants where id in (
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777'
);

-- ----------------------------------------------------------------------------
-- Setup: two tenants for cross-tenant isolation, two users.
-- ----------------------------------------------------------------------------

begin;

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-000000a00001', 'audit-admin@example.com'),
  ('00000000-0000-0000-0000-000000a00002', 'audit-staff@example.com')
on conflict (id) do nothing;

insert into public.tenants (id, slug, name, timezone, default_locale)
values
  ('66666666-6666-6666-6666-666666666666', 'audit-x', 'Audit X', 'Europe/Berlin', 'en'),
  ('77777777-7777-7777-7777-777777777777', 'audit-y', 'Audit Y', 'Europe/Berlin', 'en');

insert into public.memberships (tenant_id, user_id, role)
values
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000a00001', 'admin'),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000a00002', 'staff');

commit;

do $$
declare cnt int;
begin
  select count(*) into cnt from public.tenant_audit_events
  where tenant_id = '66666666-6666-6666-6666-666666666666' and kind = 'member.added';
  if cnt <> 2 then
    raise exception 'expected 2 member.added rows, got %', cnt;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- tenant.updated
-- ----------------------------------------------------------------------------

\echo '-- tenant.updated --'

update public.tenants set timezone = 'Europe/Paris'
where id = '66666666-6666-6666-6666-666666666666';

do $$
declare row_payload jsonb;
begin
  select payload into row_payload from public.tenant_audit_events
  where tenant_id = '66666666-6666-6666-6666-666666666666' and kind = 'tenant.updated'
  order by created_at desc limit 1;
  if row_payload is null then raise exception 'expected a tenant.updated row'; end if;
  if not (row_payload->'columns_changed' ? 'timezone') then
    raise exception 'expected timezone in columns_changed, got %', row_payload->'columns_changed';
  end if;
  if (row_payload#>>'{before,timezone}') <> 'Europe/Berlin'
     or (row_payload#>>'{after,timezone}') <> 'Europe/Paris' then
    raise exception 'before/after mismatch: %', row_payload;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- service.created + service.updated + service.deactivated
-- ----------------------------------------------------------------------------

\echo '-- services trigger --'

insert into public.services (id, tenant_id, name, duration_minutes)
values ('66666666-6666-6666-6666-aaaaa0000001', '66666666-6666-6666-6666-666666666666', 'Probe', 30);

update public.services set duration_minutes = 60
where id = '66666666-6666-6666-6666-aaaaa0000001';

update public.services set active = false
where id = '66666666-6666-6666-6666-aaaaa0000001';

do $$
declare a int; b int; c int;
begin
  select count(*) into a from public.tenant_audit_events
  where tenant_id = '66666666-6666-6666-6666-666666666666' and kind = 'service.created';
  if a <> 1 then raise exception 'expected 1 service.created, got %', a; end if;

  select count(*) into b from public.tenant_audit_events
  where tenant_id = '66666666-6666-6666-6666-666666666666' and kind = 'service.updated';
  if b <> 1 then raise exception 'expected 1 service.updated, got %', b; end if;

  select count(*) into c from public.tenant_audit_events
  where tenant_id = '66666666-6666-6666-6666-666666666666' and kind = 'service.deactivated';
  if c <> 1 then raise exception 'expected 1 service.deactivated, got %', c; end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- member.role_changed
-- ----------------------------------------------------------------------------

\echo '-- member.role_changed --'

update public.memberships set role = 'admin'
where tenant_id = '66666666-6666-6666-6666-666666666666'
  and user_id = '00000000-0000-0000-0000-000000a00002';

do $$
declare row_payload jsonb;
begin
  select payload into row_payload from public.tenant_audit_events
  where tenant_id = '66666666-6666-6666-6666-666666666666' and kind = 'member.role_changed'
  order by created_at desc limit 1;
  if row_payload->>'from' <> 'staff' or row_payload->>'to' <> 'admin' then
    raise exception 'expected from=staff to=admin, got %', row_payload;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- request_id GUC threading
-- ----------------------------------------------------------------------------

\echo '-- request_id threading --'

begin;
select set_config('app.request_id', 'req-abc-123', true);

insert into public.availability_rules (tenant_id, day_of_week, start_time, end_time)
values ('66666666-6666-6666-6666-666666666666', 1, '09:00', '17:00');

do $$
declare row_payload jsonb;
begin
  select payload into row_payload from public.tenant_audit_events
  where tenant_id = '66666666-6666-6666-6666-666666666666'
    and kind = 'availability_rule.created'
  order by created_at desc limit 1;
  if row_payload->>'request_id' <> 'req-abc-123' then
    raise exception 'expected request_id req-abc-123, got %', row_payload->>'request_id';
  end if;
end;
$$;

commit;

-- Without GUC.
insert into public.availability_rules (tenant_id, day_of_week, start_time, end_time)
values ('66666666-6666-6666-6666-666666666666', 2, '10:00', '11:00');

do $$
declare row_payload jsonb;
begin
  select payload into row_payload from public.tenant_audit_events
  where tenant_id = '66666666-6666-6666-6666-666666666666'
    and kind = 'availability_rule.created'
  order by created_at desc limit 1;
  if row_payload ? 'request_id' then
    raise exception 'expected no request_id, got %', row_payload->>'request_id';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Cross-tenant isolation
-- ----------------------------------------------------------------------------

\echo '-- cross-tenant isolation --'

insert into public.memberships (tenant_id, user_id, role)
values ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000a00001', 'admin');

insert into public.services (tenant_id, name, duration_minutes)
values ('77777777-7777-7777-7777-777777777777', 'Audit-Y service', 45);

begin;
set local role authenticated;
-- audit-staff has no membership in audit-y
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000a00002","role":"authenticated"}', true);

do $$
declare cnt int;
begin
  select count(*) into cnt from public.tenant_audit_events
  where tenant_id = '77777777-7777-7777-7777-777777777777';
  if cnt <> 0 then
    raise exception 'staff of audit-x should not see any audit-y rows, got %', cnt;
  end if;
end;
$$;

rollback;

-- ----------------------------------------------------------------------------
-- Staff scope: only target_kind = 'appointment' visible (none today => 0)
-- ----------------------------------------------------------------------------

\echo '-- staff scope --'

update public.memberships set role = 'staff'
where tenant_id = '66666666-6666-6666-6666-666666666666'
  and user_id = '00000000-0000-0000-0000-000000a00002';

begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000a00002","role":"authenticated"}', true);

do $$
declare cnt int;
begin
  select count(*) into cnt from public.tenant_audit_events
  where tenant_id = '66666666-6666-6666-6666-666666666666';
  if cnt <> 0 then
    raise exception 'staff should see only appointment events (none today), got %', cnt;
  end if;
end;
$$;

rollback;

-- ----------------------------------------------------------------------------
-- Immutability: admin cannot UPDATE or DELETE
-- ----------------------------------------------------------------------------

\echo '-- immutability --'

begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000a00001","role":"authenticated"}', true);

do $$
declare affected int;
begin
  update public.tenant_audit_events set kind = 'tenant.updated'
  where tenant_id = '66666666-6666-6666-6666-666666666666';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'expected RLS to deny UPDATE, got % rows', affected;
  end if;

  delete from public.tenant_audit_events
  where tenant_id = '66666666-6666-6666-6666-666666666666';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'expected RLS to deny DELETE, got % rows', affected;
  end if;
end;
$$;

rollback;

-- ----------------------------------------------------------------------------
-- Retention purge
-- ----------------------------------------------------------------------------

\echo '-- retention purge --'

insert into public.tenant_audit_events
  (tenant_id, kind, target_kind, target_id, payload, created_at)
values
  (
    '66666666-6666-6666-6666-666666666666',
    'tenant.updated', 'tenant',
    '66666666-6666-6666-6666-666666666666',
    '{}'::jsonb,
    now() - interval '25 months'
  );

do $$
declare deleted int; remaining_recent int;
begin
  select public.purge_old_audit_events() into deleted;
  if deleted < 1 then
    raise exception 'expected at least 1 row purged, got %', deleted;
  end if;
  select count(*) into remaining_recent from public.tenant_audit_events
  where tenant_id = '66666666-6666-6666-6666-666666666666'
    and created_at >= now() - interval '24 months';
  if remaining_recent = 0 then
    raise exception 'expected recent rows to remain';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Cleanup
-- ----------------------------------------------------------------------------

delete from public.availability_rules where tenant_id in (
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777'
);
delete from public.services where tenant_id in (
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777'
);
delete from public.tenant_audit_events where tenant_id in (
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777'
);
delete from public.memberships where tenant_id in (
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777'
);
delete from public.tenants where id in (
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777'
);
delete from auth.users where id in (
  '00000000-0000-0000-0000-000000a00001',
  '00000000-0000-0000-0000-000000a00002'
);

\echo 'OK — audit log tests passed.'
