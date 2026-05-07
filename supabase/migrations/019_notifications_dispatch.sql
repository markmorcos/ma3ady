-- 019_notifications_dispatch: AFTER-INSERT trigger on appointment_events
-- that posts the event id to the send-appointment-notification Edge Function
-- via pg_net. This is the missing piece from implement-notifications-pipeline
-- task 1.3 — without it, bookings never produce notification rows.
--
-- The function URL + service-role bearer aren't baked into the migration
-- because they differ per-project. They live in supabase_vault under the
-- names `app.notify_url` and `app.service_role_key`. The trigger silently
-- no-ops if either secret is missing, so a fresh project still works for
-- everything except sending notifications until the operator populates
-- the vault. Provisioning runbook lives next to the seed at
-- `supabase/preview-seed.sql`.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_appointment_event()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault, pg_temp
as $$
declare
  v_url text;
  v_key text;
  v_to  text;
begin
  -- Filter to event types that should trigger a notification per the
  -- implement-notifications-pipeline 1.11 mapping. Completed / no_show
  -- transitions are admin-only and never page the customer.
  if new.event_type = 'status_changed' then
    v_to := new.payload->>'to';
    if v_to is null or v_to in ('completed', 'no_show') then
      return new;
    end if;
  elsif new.event_type not in ('created', 'rescheduled') then
    return new;
  end if;

  -- Pull URL + service-role key from Vault. If either is missing
  -- (typical for a fresh test env), bail without raising — failing the
  -- appointment write because the notifier isn't wired would be worse.
  begin
    select decrypted_secret into v_url
      from vault.decrypted_secrets where name = 'app.notify_url';
    select decrypted_secret into v_key
      from vault.decrypted_secrets where name = 'app.service_role_key';
  exception when others then
    return new;
  end;

  if v_url is null or v_key is null then
    return new;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || v_key
               ),
    body    := jsonb_build_object('event_id', new.id)
  );

  return new;
exception when others then
  raise warning 'notify_appointment_event: dispatch failed (%): %',
    new.id, SQLERRM;
  return new;
end;
$$;

drop trigger if exists notify_on_appointment_event on public.appointment_events;
create trigger notify_on_appointment_event
  after insert on public.appointment_events
  for each row execute function public.notify_appointment_event();
