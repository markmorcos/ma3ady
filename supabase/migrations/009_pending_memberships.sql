-- 009_pending_memberships: invitations for users who haven't signed up yet,
-- plus the slug-availability RPC, plus the handle_new_user promotion logic.
--
-- Carry-over from setup-tenant-audit-log task 1.6: the after-insert trigger
-- on pending_memberships writes a `member.invited` audit event.

-- ============================================================================
-- pending_memberships
-- ============================================================================

create table public.pending_memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  role public.tenant_role not null,
  invited_by_user_id uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),

  primary key (tenant_id, email),
  constraint pending_memberships_email_lower
    check (email = lower(email))
);

create index pending_memberships_email_idx on public.pending_memberships(email);

-- ---- RLS ----

alter table public.pending_memberships enable row level security;

-- Tenant admins/owners can see invites for their tenant.
create policy pending_memberships_select_admin
  on public.pending_memberships
  for select
  using (public.current_user_role_in(tenant_id) in ('owner', 'admin'));

-- Inserts go through invite-member Edge Function (service role bypasses RLS);
-- direct admin inserts are also allowed for completeness.
create policy pending_memberships_insert_admin
  on public.pending_memberships
  for insert
  with check (public.current_user_role_in(tenant_id) in ('owner', 'admin'));

create policy pending_memberships_delete_admin
  on public.pending_memberships
  for delete
  using (public.current_user_role_in(tenant_id) in ('owner', 'admin'));

create policy pending_memberships_update_denied
  on public.pending_memberships
  for update
  using (false)
  with check (false);

grant select, insert, delete on public.pending_memberships to authenticated;

-- ============================================================================
-- audit trigger (carry-over from setup-tenant-audit-log 1.6)
-- ============================================================================

create or replace function public.tg_audit_pending_memberships()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    perform public.record_audit(
      new.tenant_id,
      'member.invited',
      'pending_membership',
      null,
      jsonb_build_object('email', new.email, 'role', new.role)
    );
    return new;
  end if;
  return null;
end;
$$;

create trigger pending_memberships_audit
  after insert on public.pending_memberships
  for each row execute function public.tg_audit_pending_memberships();

-- ============================================================================
-- handle_new_user — extend to promote pending memberships
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
begin
  -- 1. Insert profile (idempotent on conflict).
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    null
  )
  on conflict (id) do nothing;

  -- 2. Promote any pending memberships matching this user's email.
  v_email := lower(new.email);
  if v_email is not null then
    insert into public.memberships (tenant_id, user_id, role)
    select tenant_id, new.id, role
    from public.pending_memberships
    where email = v_email
    on conflict (user_id, tenant_id) do nothing;

    delete from public.pending_memberships where email = v_email;
  end if;

  return new;
end;
$$;

-- ============================================================================
-- check_slug_availability RPC
-- ============================================================================
--
-- Spec scenario (tenancy/spec.md): "Slug availability SHALL be queryable
-- without claiming … response time MUST be under 500ms at p95". Indexed
-- lookups on tenants.slug + reserved_slugs.slug; no DML; cheap.

create or replace function public.check_slug_availability(p_slug text)
returns table (
  available boolean,
  reason text
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    case
      when p_slug !~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$' then false
      when exists (select 1 from public.reserved_slugs where slug = p_slug) then false
      when exists (select 1 from public.tenants where slug = p_slug) then false
      else true
    end as available,
    case
      when p_slug !~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$' then 'invalid'
      when exists (select 1 from public.reserved_slugs where slug = p_slug) then 'reserved'
      when exists (select 1 from public.tenants where slug = p_slug) then 'taken'
      else null
    end as reason;
$$;

grant execute on function public.check_slug_availability(text) to anon, authenticated;
