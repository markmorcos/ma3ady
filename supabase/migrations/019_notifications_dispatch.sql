-- 019_notifications_dispatch: AFTER-INSERT trigger on appointment_events
-- that posts (appointment_id, event) to the send-appointment-notification
-- Edge Function via pg_net. The missing piece from
-- implement-notifications-pipeline task 1.3 — without it, bookings never
-- produced any notification rows.
--
-- Mapping (per task 1.11):
--   appointment_events.event_type='created'                    → event='booked'
--   appointment_events.event_type='status_changed' to=cancelled → event='cancelled'
--   appointment_events.event_type='status_changed' to=confirmed → event='confirmed'
--   appointment_events.event_type='status_changed' to=completed → SKIP
--   appointment_events.event_type='status_changed' to=no_show   → SKIP
--   appointment_events.event_type='rescheduled'                → event='rescheduled'
--
-- The function URL + service-role bearer aren't baked into the migration
-- because they differ per-project. They live in supabase_vault under
-- `app.notify_url` and `app.service_role_key`. The trigger silently
-- no-ops if either secret is missing, so a fresh project still works
-- for everything except sending notifications until the operator
-- populates the vault.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_appointment_event()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault, pg_temp
as $$
declare
  v_url   text;
  v_key   text;
  v_event text;
  v_to    text;
begin
  -- Map event_type → notification event. Anything outside this mapping
  -- (e.g. completed / no_show transitions, admin-only events) returns
  -- null, which we treat as "skip this event".
  if new.event_type = 'created' then
    v_event := 'booked';
  elsif new.event_type = 'rescheduled' then
    v_event := 'rescheduled';
  elsif new.event_type = 'status_changed' then
    v_to := new.payload->>'to';
    if v_to = 'cancelled' then
      v_event := 'cancelled';
    elsif v_to = 'confirmed' then
      v_event := 'confirmed';
    end if;
  end if;

  if v_event is null then
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
    body    := jsonb_build_object(
                 'appointment_id', new.appointment_id,
                 'event', v_event
               )
  );

  return new;
exception when others then
  raise warning 'notify_appointment_event: dispatch failed (event=%, appt=%): %',
    new.event_type, new.appointment_id, SQLERRM;
  return new;
end;
$$;

drop trigger if exists notify_on_appointment_event on public.appointment_events;
create trigger notify_on_appointment_event
  after insert on public.appointment_events
  for each row execute function public.notify_appointment_event();
