-- 006_tenant_audit_events: tenant-wide audit trail.
-- See openspec/specs/audit-log/spec.md.

-- ============================================================================
-- enums
-- ============================================================================

create type public.tenant_audit_event_kind as enum (
  'tenant.updated',
  'member.invited',
  'member.added',
  'member.role_changed',
  'member.removed',
  'service.created',
  'service.updated',
  'service.deactivated',
  'service.activated',
  'service.removed',
  'availability_rule.created',
  'availability_rule.updated',
  'availability_rule.deleted',
  'availability_exception.created',
  'availability_exception.updated',
  'availability_exception.deleted'
);

create type public.tenant_audit_actor_kind as enum ('user', 'system', 'guest_token');

-- ============================================================================
-- tenant_audit_events table
-- ============================================================================

create table public.tenant_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind public.tenant_audit_event_kind not null,
  by_user_id uuid references auth.users(id) on delete set null,
  by_kind public.tenant_audit_actor_kind not null default 'system',
  target_kind text not null,
  target_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index tenant_audit_events_tenant_created_idx
  on public.tenant_audit_events(tenant_id, created_at desc);
create index tenant_audit_events_actor_created_idx
  on public.tenant_audit_events(by_user_id, created_at desc);
create index tenant_audit_events_target_idx
  on public.tenant_audit_events(target_kind, target_id);

-- ============================================================================
-- RLS — immutable from app POV; insert via SECURITY DEFINER triggers only
-- ============================================================================

alter table public.tenant_audit_events enable row level security;

-- Owner/admin see everything for their tenant. Staff sees only target_kind = 'appointment'.
create policy tenant_audit_events_select_member_scoped
  on public.tenant_audit_events
  for select
  using (
    public.current_user_role_in(tenant_id) in ('owner', 'admin')
    or (
      public.current_user_role_in(tenant_id) = 'staff'
      and target_kind = 'appointment'
    )
  );

create policy tenant_audit_events_insert_denied
  on public.tenant_audit_events
  for insert
  with check (false);

create policy tenant_audit_events_update_denied
  on public.tenant_audit_events
  for update
  using (false)
  with check (false);

create policy tenant_audit_events_delete_denied
  on public.tenant_audit_events
  for delete
  using (false);

grant select on public.tenant_audit_events to authenticated;

-- ============================================================================
-- record_audit helper (SECURITY DEFINER bypasses the insert-denied policy)
-- ============================================================================

create or replace function public.record_audit(
  p_tenant_id uuid,
  p_kind text,
  p_target_kind text,
  p_target_id uuid,
  p_payload jsonb
) returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_request_id text;
  v_is_guest text;
  v_uid uuid;
  v_by_kind public.tenant_audit_actor_kind;
  v_payload jsonb;
begin
  v_request_id := nullif(current_setting('app.request_id', true), '');
  v_is_guest   := nullif(current_setting('app.is_guest_token', true), '');
  v_uid        := auth.uid();

  v_by_kind := case
    when v_uid is not null then 'user'::public.tenant_audit_actor_kind
    when v_is_guest = 'true' then 'guest_token'::public.tenant_audit_actor_kind
    else 'system'::public.tenant_audit_actor_kind
  end;

  v_payload := coalesce(p_payload, '{}'::jsonb);
  if v_request_id is not null then
    v_payload := v_payload || jsonb_build_object('request_id', v_request_id);
  end if;

  insert into public.tenant_audit_events
    (tenant_id, kind, by_user_id, by_kind, target_kind, target_id, payload)
  values
    (p_tenant_id, p_kind::public.tenant_audit_event_kind, v_uid, v_by_kind, p_target_kind, p_target_id, v_payload);
end;
$$;

-- ============================================================================
-- changed-columns helper — returns the keys whose values differ between two
-- jsonb representations of a row.
-- ============================================================================

create or replace function public.tg_jsonb_diff_keys(p_before jsonb, p_after jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(k order by k), '{}'::text[])
  from (
    select key as k
    from jsonb_each(p_before) b
    full outer join jsonb_each(p_after) a using (key)
    where b.value is distinct from a.value
  ) x;
$$;

-- ============================================================================
-- trigger: tenants
-- ============================================================================

create or replace function public.tg_audit_tenants_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_before jsonb := to_jsonb(old);
  v_after  jsonb := to_jsonb(new);
  v_changed text[];
begin
  v_changed := public.tg_jsonb_diff_keys(v_before, v_after);
  -- Only audit if a meaningful column actually changed.
  if array_length(v_changed, 1) is null
     or v_changed = array['updated_at']::text[] then
    return new;
  end if;

  perform public.record_audit(
    new.id,
    'tenant.updated',
    'tenant',
    new.id,
    jsonb_build_object(
      'columns_changed', to_jsonb(v_changed),
      'before', v_before - 'updated_at',
      'after',  v_after  - 'updated_at'
    )
  );
  return new;
end;
$$;

create trigger tenants_audit_update
  after update on public.tenants
  for each row execute function public.tg_audit_tenants_update();

-- ============================================================================
-- trigger: memberships (insert / role change / delete)
-- ============================================================================

create or replace function public.tg_audit_memberships()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    perform public.record_audit(
      new.tenant_id, 'member.added', 'membership', new.id,
      jsonb_build_object('user_id', new.user_id, 'role', new.role)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      perform public.record_audit(
        new.tenant_id, 'member.role_changed', 'membership', new.id,
        jsonb_build_object('user_id', new.user_id, 'from', old.role, 'to', new.role)
      );
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    perform public.record_audit(
      old.tenant_id, 'member.removed', 'membership', old.id,
      jsonb_build_object('user_id', old.user_id, 'role', old.role)
    );
    return old;
  end if;
  return null;
end;
$$;

create trigger memberships_audit
  after insert or update or delete on public.memberships
  for each row execute function public.tg_audit_memberships();

-- ============================================================================
-- trigger: services
-- ============================================================================

create or replace function public.tg_audit_services()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_changed text[];
begin
  if tg_op = 'INSERT' then
    perform public.record_audit(
      new.tenant_id, 'service.created', 'service', new.id,
      jsonb_build_object('after', to_jsonb(new) - 'created_at' - 'updated_at')
    );
    return new;
  elsif tg_op = 'UPDATE' then
    v_before := to_jsonb(old);
    v_after  := to_jsonb(new);
    v_changed := public.tg_jsonb_diff_keys(v_before - 'updated_at', v_after - 'updated_at');
    if array_length(v_changed, 1) is null then
      return new;
    end if;

    if new.active is distinct from old.active then
      perform public.record_audit(
        new.tenant_id,
        case when new.active then 'service.activated' else 'service.deactivated' end,
        'service', new.id,
        jsonb_build_object('columns_changed', to_jsonb(v_changed))
      );
    else
      perform public.record_audit(
        new.tenant_id, 'service.updated', 'service', new.id,
        jsonb_build_object(
          'columns_changed', to_jsonb(v_changed),
          'before', v_before - 'updated_at',
          'after',  v_after  - 'updated_at'
        )
      );
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    perform public.record_audit(
      old.tenant_id, 'service.removed', 'service', old.id,
      jsonb_build_object('before', to_jsonb(old) - 'created_at' - 'updated_at')
    );
    return old;
  end if;
  return null;
end;
$$;

create trigger services_audit
  after insert or update or delete on public.services
  for each row execute function public.tg_audit_services();

-- ============================================================================
-- trigger: availability_rules
-- ============================================================================

create or replace function public.tg_audit_availability_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    perform public.record_audit(
      new.tenant_id, 'availability_rule.created', 'availability_rule', new.id,
      jsonb_build_object('after', to_jsonb(new) - 'created_at')
    );
    return new;
  elsif tg_op = 'UPDATE' then
    perform public.record_audit(
      new.tenant_id, 'availability_rule.updated', 'availability_rule', new.id,
      jsonb_build_object(
        'before', to_jsonb(old) - 'created_at',
        'after',  to_jsonb(new) - 'created_at'
      )
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform public.record_audit(
      old.tenant_id, 'availability_rule.deleted', 'availability_rule', old.id,
      jsonb_build_object('before', to_jsonb(old) - 'created_at')
    );
    return old;
  end if;
  return null;
end;
$$;

create trigger availability_rules_audit
  after insert or update or delete on public.availability_rules
  for each row execute function public.tg_audit_availability_rules();

-- ============================================================================
-- trigger: availability_exceptions
-- ============================================================================

create or replace function public.tg_audit_availability_exceptions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    perform public.record_audit(
      new.tenant_id, 'availability_exception.created', 'availability_exception', new.id,
      jsonb_build_object('after', to_jsonb(new) - 'created_at')
    );
    return new;
  elsif tg_op = 'UPDATE' then
    perform public.record_audit(
      new.tenant_id, 'availability_exception.updated', 'availability_exception', new.id,
      jsonb_build_object(
        'before', to_jsonb(old) - 'created_at',
        'after',  to_jsonb(new) - 'created_at'
      )
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform public.record_audit(
      old.tenant_id, 'availability_exception.deleted', 'availability_exception', old.id,
      jsonb_build_object('before', to_jsonb(old) - 'created_at')
    );
    return old;
  end if;
  return null;
end;
$$;

create trigger availability_exceptions_audit
  after insert or update or delete on public.availability_exceptions
  for each row execute function public.tg_audit_availability_exceptions();
