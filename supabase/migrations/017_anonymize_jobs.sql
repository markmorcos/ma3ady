-- 017_anonymize_jobs: scheduled retention pass.
--
-- Spec retention table (privacy policy):
--   - cancelled appointments: anonymize after 90 days
--   - no_show / completed appointments: anonymize after 18 months (548 days)
--
-- "Anonymize" means: hash the guest contact's email (one-way), null name,
-- null phone, null appointment notes. The appointment row itself stays so
-- aggregate metrics keep working.

create or replace function public.anonymize_old_appointments()
returns table(touched_appointments int, touched_contacts int)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_appt_count int := 0;
  v_contact_count int := 0;
begin
  -- 1. Null `notes` on aged appointments.
  update public.appointments
     set notes = null
   where notes is not null
     and (
       (status = 'cancelled' and starts_at < v_now - interval '90 days')
       or (status in ('completed', 'no_show') and starts_at < v_now - interval '548 days')
     );
  get diagnostics v_appt_count = row_count;

  -- 2. Anonymize guest_contacts whose appointments are all aged enough.
  -- Email is replaced with sha256 of original (one-way). Name + phone nulled.
  update public.guest_contacts gc
     set email = '__anon__:' || encode(extensions.digest(coalesce(gc.email, ''), 'sha256'), 'hex'),
         name  = '__anonymized__',
         phone = null
   where gc.email is not null
     and not gc.email like '__anon__:%'
     and not exists (
       select 1
         from public.appointments a
        where a.guest_contact_id = gc.id
          and (
            (a.status = 'cancelled' and a.starts_at >= v_now - interval '90 days')
            or (a.status in ('completed', 'no_show') and a.starts_at >= v_now - interval '548 days')
            or a.status in ('pending', 'confirmed')
          )
     );
  get diagnostics v_contact_count = row_count;

  return query select v_appt_count, v_contact_count;
end;
$$;

-- Schedule daily at 03:15 UTC. cron.schedule is idempotent on the jobname,
-- so re-running this migration is a no-op.
do $$
begin
  perform cron.schedule(
    'anonymize-old',
    '15 3 * * *',
    $cron$ select public.anonymize_old_appointments(); $cron$
  );
exception when undefined_function then
  -- pg_cron not present in some local stacks — skip silently.
  null;
end;
$$;
