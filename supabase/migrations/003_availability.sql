-- 003_availability: rules-based availability + compute_available_slots.
--
-- See openspec/specs/availability/spec.md.
--
-- compute_available_slots(p_tenant_slug, p_service_id, p_range_start, p_range_end)
-- returns the available time windows for a tenant + (optional) service over the
-- requested range, in UTC. The body in this migration handles rule expansion
-- (in tenant timezone) plus extra/block exception application. Tiling into
-- discrete service-duration slots, buffers, min_notice/max_advance filtering,
-- daily_cap, and the anti-join against `appointments` are added in
-- define-services-and-appointments via `create or replace function`.
--
-- Example:
--   select * from compute_available_slots('demo', null, now(), now() + interval '7 days');

-- ============================================================================
-- enums
-- ============================================================================

create type public.availability_exception_kind as enum ('block', 'extra');

-- ============================================================================
-- tables
-- ============================================================================

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  -- service_id null = applies to all services for this tenant (FK added when
  -- services table lands in define-services-and-appointments).
  service_id uuid,
  day_of_week smallint not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  valid_from date,
  valid_until date,
  created_at timestamptz not null default now(),

  constraint availability_rules_dow_range
    check (day_of_week between 0 and 6),
  constraint availability_rules_time_order
    check (end_time > start_time),
  constraint availability_rules_valid_order
    check (valid_from is null or valid_until is null or valid_until >= valid_from)
);

create index availability_rules_tenant_dow_idx
  on public.availability_rules(tenant_id, day_of_week);
create index availability_rules_tenant_service_idx
  on public.availability_rules(tenant_id, service_id);

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  service_id uuid,
  kind public.availability_exception_kind not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),

  constraint availability_exceptions_time_order
    check (ends_at > starts_at)
);

create index availability_exceptions_tenant_starts_idx
  on public.availability_exceptions(tenant_id, starts_at);
create index availability_exceptions_tenant_service_kind_idx
  on public.availability_exceptions(tenant_id, service_id, kind);

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;

-- ---- availability_rules ----

create policy availability_rules_select_public
  on public.availability_rules
  for select
  using (true);

create policy availability_rules_insert_owner_admin
  on public.availability_rules
  for insert
  with check (public.current_user_role_in(tenant_id) in ('owner', 'admin'));

create policy availability_rules_update_owner_admin
  on public.availability_rules
  for update
  using (public.current_user_role_in(tenant_id) in ('owner', 'admin'))
  with check (public.current_user_role_in(tenant_id) in ('owner', 'admin'));

create policy availability_rules_delete_owner_admin
  on public.availability_rules
  for delete
  using (public.current_user_role_in(tenant_id) in ('owner', 'admin'));

-- ---- availability_exceptions ----

create policy availability_exceptions_select_public
  on public.availability_exceptions
  for select
  using (true);

create policy availability_exceptions_insert_owner_admin
  on public.availability_exceptions
  for insert
  with check (public.current_user_role_in(tenant_id) in ('owner', 'admin'));

create policy availability_exceptions_update_owner_admin
  on public.availability_exceptions
  for update
  using (public.current_user_role_in(tenant_id) in ('owner', 'admin'))
  with check (public.current_user_role_in(tenant_id) in ('owner', 'admin'));

create policy availability_exceptions_delete_owner_admin
  on public.availability_exceptions
  for delete
  using (public.current_user_role_in(tenant_id) in ('owner', 'admin'));

-- ============================================================================
-- compute_available_slots
-- ============================================================================

create or replace function public.compute_available_slots(
  p_tenant_slug text,
  p_service_id uuid,
  p_range_start timestamptz,
  p_range_end timestamptz
) returns table (
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant public.tenants;
begin
  select * into v_tenant from public.tenants where slug = p_tenant_slug;
  if not found then
    return;
  end if;

  return query
  with rule_windows as (
    select tstzrange(
             (d::timestamp + r.start_time) at time zone v_tenant.timezone,
             (d::timestamp + r.end_time) at time zone v_tenant.timezone,
             '[)'
           ) as rng
    from public.availability_rules r
    cross join generate_series(
      p_range_start::date,
      p_range_end::date,
      interval '1 day'
    ) as d
    where r.tenant_id = v_tenant.id
      and (r.service_id is null or r.service_id = p_service_id)
      and extract(dow from d)::int = r.day_of_week
      and (r.valid_from is null or d::date >= r.valid_from)
      and (r.valid_until is null or d::date <= r.valid_until)
  ),
  extras as (
    select tstzrange(e.starts_at, e.ends_at, '[)') as rng
    from public.availability_exceptions e
    where e.tenant_id = v_tenant.id
      and e.kind = 'extra'
      and (e.service_id is null or e.service_id = p_service_id)
      and tstzrange(e.starts_at, e.ends_at, '[)')
          && tstzrange(p_range_start, p_range_end, '[)')
  ),
  blocks as (
    select range_agg(tstzrange(e.starts_at, e.ends_at, '[)')) as ranges
    from public.availability_exceptions e
    where e.tenant_id = v_tenant.id
      and e.kind = 'block'
      and (e.service_id is null or e.service_id = p_service_id)
  ),
  candidates as (
    select range_agg(rng) as ranges
    from (
      select rng from rule_windows
      union all
      select rng from extras
    ) u
  )
  select
    lower(r) as starts_at,
    upper(r) as ends_at
  from (
    select unnest(
      coalesce((select ranges from candidates), '{}'::tstzmultirange)
      - coalesce((select ranges from blocks),     '{}'::tstzmultirange)
    ) as r
  ) x
  where lower(r) >= p_range_start
    and upper(r) <= p_range_end
  order by lower(r);
end;
$$;

-- ============================================================================
-- grants
-- ============================================================================

grant select on public.availability_rules to anon, authenticated;
grant insert, update, delete on public.availability_rules to authenticated;

grant select on public.availability_exceptions to anon, authenticated;
grant insert, update, delete on public.availability_exceptions to authenticated;

grant execute on function public.compute_available_slots(text, uuid, timestamptz, timestamptz)
  to anon, authenticated;
