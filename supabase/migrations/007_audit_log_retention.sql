-- 007_audit_log_retention: 24-month retention purge for tenant_audit_events.
-- The Supabase-managed pg_cron extension lives in the `cron` schema; we install
-- it here (idempotent) and schedule a daily purge.

create extension if not exists pg_cron with schema extensions;

create or replace function public.purge_old_audit_events()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted int;
begin
  delete from public.tenant_audit_events
  where created_at < now() - interval '24 months';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- Schedule daily at 03:20 UTC. The `cron.schedule` call is idempotent on name.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge-audit-events',
      '20 3 * * *',
      $sql$select public.purge_old_audit_events();$sql$
    );
  end if;
end;
$$;
