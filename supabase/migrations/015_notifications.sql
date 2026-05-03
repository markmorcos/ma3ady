-- 015_notifications: persistent log of every notification we attempted to
-- send (audit trail + idempotency check). Inserts come from the
-- send-appointment-notification Edge Function and the pg_cron
-- notify_due_reminders() function.

create type public.notification_channel as enum ('email', 'whatsapp', 'push');
create type public.notification_status  as enum ('queued', 'sent', 'failed');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  channel public.notification_channel not null,
  event text not null,
  status public.notification_status not null default 'queued',
  provider_id text,
  payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index notifications_appointment_idx
  on public.notifications(appointment_id);
create index notifications_pending_idx
  on public.notifications(status, created_at)
  where status in ('queued', 'failed');
create index notifications_dedupe_idx
  on public.notifications(appointment_id, channel, event);

alter table public.notifications enable row level security;

-- Reads: tenant staff or the appointment's user.
create policy notifications_select
  on public.notifications
  for select
  using (
    exists (
      select 1
      from public.appointments a
      where a.id = notifications.appointment_id
        and (
          a.user_id = auth.uid()
          or public.current_user_role_in(a.tenant_id) in ('owner', 'admin', 'staff')
        )
    )
  );

-- All writes go through the send-appointment-notification Edge Function via
-- service role.
create policy notifications_insert_denied
  on public.notifications
  for insert
  with check (false);

create policy notifications_update_denied
  on public.notifications
  for update
  using (false)
  with check (false);

create policy notifications_delete_denied
  on public.notifications
  for delete
  using (false);
