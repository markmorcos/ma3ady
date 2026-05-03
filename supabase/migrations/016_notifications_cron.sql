-- 016_notifications_cron: pg_cron-driven reminder scheduler. Every 5 minutes
-- the job scans for appointments whose start time falls inside the T-24h or
-- T-1h windows and inserts a corresponding `notifications` row with status
-- 'queued'. The send-appointment-notification Edge Function picks queued rows
-- up via the existing trigger flow.

create extension if not exists pg_cron with schema extensions;

create or replace function public.notify_due_reminders()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
begin
  -- T-24h window: appointment starts in 23h45m..24h15m
  insert into public.notifications (appointment_id, channel, event, status, payload)
  select a.id, 'email'::public.notification_channel, 'reminder_24h', 'queued', '{}'::jsonb
    from public.appointments a
   where a.status in ('pending', 'confirmed')
     and a.starts_at between v_now + interval '23 hours 45 minutes'
                          and v_now + interval '24 hours 15 minutes'
     and not exists (
       select 1 from public.notifications n
        where n.appointment_id = a.id
          and n.event = 'reminder_24h'
          and n.status in ('queued', 'sent')
     );

  -- T-1h window: appointment starts in 55m..65m
  insert into public.notifications (appointment_id, channel, event, status, payload)
  select a.id, 'email'::public.notification_channel, 'reminder_1h', 'queued', '{}'::jsonb
    from public.appointments a
   where a.status in ('pending', 'confirmed')
     and a.starts_at between v_now + interval '55 minutes'
                          and v_now + interval '65 minutes'
     and not exists (
       select 1 from public.notifications n
        where n.appointment_id = a.id
          and n.event = 'reminder_1h'
          and n.status in ('queued', 'sent')
     );
end;
$$;

-- Schedule every 5 minutes. cron.schedule is idempotent on (jobname).
do $$
begin
  perform cron.schedule(
    'send-reminders',
    '*/5 * * * *',
    $cron$ select public.notify_due_reminders(); $cron$
  );
exception when undefined_function then
  -- pg_cron isn't available locally on some Supabase CLI versions; skip.
  null;
end;
$$;
