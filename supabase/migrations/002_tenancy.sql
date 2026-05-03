-- 002_tenancy: tenants, memberships, profiles, reserved_slugs, helpers, RLS.
-- See openspec/specs/tenancy/spec.md for the canonical requirements.

-- ============================================================================
-- enums
-- ============================================================================

create type public.tenant_role as enum ('owner', 'admin', 'staff', 'customer');

-- ============================================================================
-- tables
-- ============================================================================

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  timezone text not null,
  default_locale text not null,
  brand_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tenants_slug_format
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$'),
  constraint tenants_locale_supported
    check (default_locale in ('en', 'ar')),
  constraint tenants_brand_color_hex
    check (brand_color is null or brand_color ~ '^#[0-9a-fA-F]{6}$')
);

create index tenants_slug_idx on public.tenants(slug);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role public.tenant_role not null,
  created_at timestamptz not null default now(),

  unique (user_id, tenant_id)
);

create index memberships_user_idx on public.memberships(user_id);
create index memberships_tenant_idx on public.memberships(tenant_id);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  locale text,
  display_timezone_override text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Carry-over from setup-app-shell task 1.14: `display_timezone_override` is
  -- intended to hold an IANA zone (e.g. 'Asia/Dubai'). Postgres CHECK
  -- constraints can't reference pg_timezone_names (no subqueries allowed), so
  -- IANA validity is enforced at the API layer (the admin settings UI feeds
  -- COMMON_IANA_ZONES). The DB only enforces the gross shape.
  constraint profiles_display_timezone_override_shape
    check (
      display_timezone_override is null
      or display_timezone_override ~ '^[A-Za-z][A-Za-z0-9_+\-/]+$'
    ),
  constraint profiles_locale_supported
    check (locale is null or locale in ('en', 'ar'))
);

create table public.reserved_slugs (
  slug text primary key
);

-- Reserved slugs from project.md §3.
insert into public.reserved_slugs (slug) values
  ('www'), ('app'), ('admin'), ('auth'), ('api'),
  ('cdn'), ('static'), ('mail'), ('support'), ('status'),
  ('blog'), ('docs'), ('help'), ('dashboard'), ('console'),
  ('billing'), ('ma3ady'), ('public'), ('dev'), ('staging'),
  ('test'), ('preview'), ('beta');

-- ============================================================================
-- updated_at trigger (shared)
-- ============================================================================

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tenants_set_updated_at
  before update on public.tenants
  for each row execute function public.tg_set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- ============================================================================
-- handle_new_user trigger
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- helper functions
-- ============================================================================

create or replace function public.current_user_is_member_of(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid() and tenant_id = p_tenant
  );
$$;

create or replace function public.current_user_role_in(p_tenant uuid)
returns public.tenant_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.memberships
  where user_id = auth.uid() and tenant_id = p_tenant
  limit 1;
$$;

create or replace function public.tenant_id_from_slug(p_slug text)
returns uuid
language sql
stable
as $$
  select id from public.tenants where slug = p_slug;
$$;

create or replace function public.assert_slug_available(p_slug text)
returns void
language plpgsql
volatile
as $$
begin
  if p_slug !~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$' then
    raise exception 'slug invalid: must match ^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$' using errcode = '22023';
  end if;
  if exists (select 1 from public.reserved_slugs where slug = p_slug) then
    raise exception 'slug reserved' using errcode = '23505';
  end if;
  if exists (select 1 from public.tenants where slug = p_slug) then
    raise exception 'slug taken' using errcode = '23505';
  end if;
end;
$$;

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.tenants enable row level security;
alter table public.memberships enable row level security;
alter table public.profiles enable row level security;

-- ---- tenants ----

-- Anonymous + authenticated clients can read tenants. The booking flow
-- needs the tenant subdomain to resolve before sign-in.
create policy tenants_select_all
  on public.tenants
  for select
  using (true);

-- Tenant creation is denied at the policy level. The claim_slug Edge Function
-- (implement-tenant-onboarding) uses the service role to insert atomically
-- with a matching owner membership.
create policy tenants_insert_denied
  on public.tenants
  for insert
  with check (false);

create policy tenants_update_owner_or_admin
  on public.tenants
  for update
  using (public.current_user_role_in(id) in ('owner', 'admin'))
  with check (public.current_user_role_in(id) in ('owner', 'admin'));

create policy tenants_delete_owner
  on public.tenants
  for delete
  using (public.current_user_role_in(id) = 'owner');

-- ---- memberships ----

create policy memberships_select_self_or_tenant_admin
  on public.memberships
  for select
  using (
    user_id = auth.uid()
    or public.current_user_role_in(tenant_id) in ('owner', 'admin')
  );

-- Tenant admin or owner can insert. Granting `owner` requires existing owner.
create policy memberships_insert_tenant_admin
  on public.memberships
  for insert
  with check (
    public.current_user_role_in(tenant_id) in ('owner', 'admin')
    and (role <> 'owner' or public.current_user_role_in(tenant_id) = 'owner')
  );

create policy memberships_update_tenant_admin
  on public.memberships
  for update
  using (public.current_user_role_in(tenant_id) in ('owner', 'admin'))
  with check (
    public.current_user_role_in(tenant_id) in ('owner', 'admin')
    and (role <> 'owner' or public.current_user_role_in(tenant_id) = 'owner')
  );

create policy memberships_delete_tenant_admin
  on public.memberships
  for delete
  using (public.current_user_role_in(tenant_id) in ('owner', 'admin'));

-- ---- profiles ----

create policy profiles_select_self_or_shared_tenant
  on public.profiles
  for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.memberships m1
      join public.memberships m2 on m1.tenant_id = m2.tenant_id
      where m1.user_id = auth.uid()
        and m2.user_id = profiles.id
    )
  );

create policy profiles_update_self
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- profiles inserts happen via the handle_new_user trigger only; deny direct.
create policy profiles_insert_denied
  on public.profiles
  for insert
  with check (false);

-- ============================================================================
-- grants
-- ============================================================================

grant select on public.tenants to anon, authenticated;
grant select, insert, update, delete on public.memberships to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.reserved_slugs to anon, authenticated;

grant execute on function public.current_user_is_member_of(uuid) to authenticated;
grant execute on function public.current_user_role_in(uuid) to authenticated;
grant execute on function public.tenant_id_from_slug(text) to anon, authenticated;
grant execute on function public.assert_slug_available(text) to authenticated;
