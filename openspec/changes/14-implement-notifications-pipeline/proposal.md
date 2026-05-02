# Implement notifications pipeline

## Why

Customers and tenants depend on transactional notifications: booking confirmations, reschedule announcements, reminders, etc. Per `project.md` §2 (mock-first dispatchers) and §1d (audit trail), this change ships:

1. A dispatcher pattern for email + WhatsApp + push that toggles between mock and real implementations via env vars.
2. A `notifications` table that records every send (audit + idempotency).
3. An Edge Function `send-appointment-notification` triggered by audit events on appointments.
4. A `pg_cron` schedule for reminders (T-24h, T-1h).

Push is wired via the dispatcher interface but defaults to `mock` (in-app toasts) until a dev client ships in change 18.

## What Changes

- **ADDED** migration `006_notifications.sql`:
  - `notifications(id, appointment_id, channel enum('email','whatsapp','push'), event text, status enum('queued','sent','failed'), provider_id text, payload jsonb, error text, created_at, sent_at)`
  - Index `(appointment_id)`, `(status, created_at)` for cron-driven retries
- **ADDED** migration `007_pg_cron_setup.sql`:
  - `create extension if not exists pg_cron;`
  - Cron job `'send-reminders' every 5 minutes` invoking `notify_due_reminders()` SQL function
  - `notify_due_reminders()`: finds appointments with `starts_at` between `now()+23h45m` and `now()+24h15m` (T-24h window) or T-1h window with no prior reminder of that kind in `notifications`, inserts queued rows
- **ADDED** Edge Function `send-appointment-notification/`:
  - Triggered via `pg_net` HTTP call from a trigger on `appointment_events` insert
  - Reads the event, determines channels (email, whatsapp, push), resolves recipient (user or guest), composes localized body, dispatches via the configured dispatcher
  - Updates `notifications` row to `sent` or `failed`
- **ADDED** dispatcher modules in `supabase/functions/_shared/dispatchers/`:
  - `email.ts`: `MockEmailDispatcher` (logs to `notifications.payload`), `ResendEmailDispatcher`
  - `whatsapp.ts`: `MockWhatsAppDispatcher`, `MetaWhatsAppDispatcher` (reuses existing `event_notification` template + WABA from legacy app)
  - `push.ts`: `MockPushDispatcher`, `ExpoPushDispatcher` (deferred to change 18)
- **ADDED** templates:
  - Email: React Email components rendered to HTML — booking confirmed (en, ar), rescheduled, cancelled, reminder
  - WhatsApp: parameter mapping for the existing template
- **ADDED** localized `.ics` generator using the `ics` Deno module
- **ADDED** env vars: `EMAIL_DISPATCHER`, `WHATSAPP_DISPATCHER`, `PUSH_DISPATCHER` (mock | real per `project.md`), `RESEND_API_KEY`, `RESEND_FROM`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME` (= `event_notification`)

## Impact

- Affects `notifications` capability (initial spec).
- Required by full launch.
- `mock` mode is the default in dev/preview; production EAS profile assertion already enforces `real` (change 01).
