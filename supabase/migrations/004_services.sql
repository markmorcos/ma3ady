-- 004_services: services table + RLS + back-fill FK on availability tables.
-- See openspec/specs/services/spec.md.

create table public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes int not null,
  buffer_before_min int not null default 0,
  buffer_after_min int not null default 0,
  min_notice_min int not null default 60,
  max_advance_days int not null default 60,
  daily_cap int,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint services_duration_positive check (duration_minutes > 0),
  constraint services_buffer_before_nonneg check (buffer_before_min >= 0),
  constraint services_buffer_after_nonneg check (buffer_after_min >= 0),
  constraint services_min_notice_nonneg check (min_notice_min >= 0),
  constraint services_max_advance_positive check (max_advance_days > 0),
  constraint services_daily_cap_positive check (daily_cap is null or daily_cap > 0)
);

create index services_tenant_active_idx on public.services(tenant_id, active);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.tg_set_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.services enable row level security;

-- Anonymous + authenticated can read active services. Tenant members see all.
create policy services_select_active_or_member
  on public.services
  for select
  using (
    active = true
    or public.current_user_is_member_of(tenant_id)
  );

create policy services_insert_owner_admin
  on public.services
  for insert
  with check (public.current_user_role_in(tenant_id) in ('owner', 'admin'));

create policy services_update_owner_admin
  on public.services
  for update
  using (public.current_user_role_in(tenant_id) in ('owner', 'admin'))
  with check (public.current_user_role_in(tenant_id) in ('owner', 'admin'));

create policy services_delete_owner_admin
  on public.services
  for delete
  using (public.current_user_role_in(tenant_id) in ('owner', 'admin'));

grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;

-- ============================================================================
-- Back-fill FK constraints on availability tables (FK target now exists).
-- ============================================================================

alter table public.availability_rules
  add constraint availability_rules_service_id_fkey
  foreign key (service_id) references public.services(id) on delete cascade;

alter table public.availability_exceptions
  add constraint availability_exceptions_service_id_fkey
  foreign key (service_id) references public.services(id) on delete cascade;
