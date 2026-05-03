-- 011_set_app_context: SECURITY DEFINER wrapper around set_config() so Edge
-- Functions can thread audit context (app.request_id, app.is_guest_token)
-- into the current transaction without exposing pg_catalog.set_config to the
-- network. Carry-over from setup-tenant-audit-log task 1.7 / 1.8.

create or replace function public.set_app_context(
  p_request_id uuid,
  p_is_guest_token boolean default false
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.request_id', p_request_id::text, true);
  perform set_config('app.is_guest_token', case when p_is_guest_token then 'true' else 'false' end, true);
end;
$$;

grant execute on function public.set_app_context(uuid, boolean)
  to anon, authenticated, service_role;
