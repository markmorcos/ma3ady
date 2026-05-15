-- 020_drop_pending_memberships: removes the team-invitation feature.
--
-- Drops the pending_memberships table and its dependencies (audit trigger
-- + tg_audit_pending_memberships function) and rewrites handle_new_user to
-- only manage profiles -- the pending-membership promotion path is gone.

drop trigger if exists pending_memberships_audit on public.pending_memberships;
drop function if exists public.tg_audit_pending_memberships();

drop policy if exists pending_memberships_select_admin on public.pending_memberships;
drop policy if exists pending_memberships_insert_admin on public.pending_memberships;
drop policy if exists pending_memberships_delete_admin on public.pending_memberships;
drop policy if exists pending_memberships_update_denied on public.pending_memberships;

drop table if exists public.pending_memberships;

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
