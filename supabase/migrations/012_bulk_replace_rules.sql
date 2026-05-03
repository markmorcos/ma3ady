-- 012_bulk_replace_rules: SECURITY DEFINER RPC for atomically replacing all
-- tenant-wide availability rules for a given day-of-week. Used by the rules
-- grid editor so concurrent edits don't leave the tenant in a partial state.
-- Caller must be owner or admin of the tenant.

create or replace function public.bulk_replace_rules_for_day(
  p_tenant_id uuid,
  p_day_of_week int,
  p_bands jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.tenant_role;
  v_band jsonb;
begin
  if p_day_of_week < 0 or p_day_of_week > 6 then
    raise exception 'invalid_day_of_week' using errcode = '22023';
  end if;

  -- Auth check: caller must be owner/admin of this tenant.
  select role into v_role
    from public.memberships
   where tenant_id = p_tenant_id
     and user_id = auth.uid();

  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.availability_rules
   where tenant_id = p_tenant_id
     and day_of_week = p_day_of_week
     and service_id is null;

  for v_band in select * from jsonb_array_elements(p_bands)
  loop
    insert into public.availability_rules (
      tenant_id, service_id, day_of_week, start_time, end_time
    ) values (
      p_tenant_id,
      null,
      p_day_of_week,
      (v_band->>'start_time')::time,
      (v_band->>'end_time')::time
    );
  end loop;
end;
$$;

grant execute on function public.bulk_replace_rules_for_day(uuid, int, jsonb)
  to authenticated;
