# Design

## Context

Notifications are the most common source of bugs and the most-watched feature by tenants. We treat them as first-class with audit trail, idempotency, and a mock layer that lets us develop the entire flow without sending real messages.

## Goals

- Every notification we attempted to send has a row in `notifications`.
- A repeated trigger never produces duplicate sends.
- Dev work doesn't spam real email/WhatsApp.
- Switching from mock to real is a config change, not a code change.
- Reminders fire at T-24h and T-1h with 5-minute resolution.

## Non-Goals

- Customer notification preferences (opt out of WhatsApp, etc.) — defer.
- Templating editor for tenants to customize messages — defer.
- Multi-language reminder rotation — recipient's resolved locale wins.
- SMS — phone-tier fallback to plain SMS when WhatsApp fails. Defer.

## Decisions

1. **Audit-event-driven, not status-trigger-driven**. The `appointment_events` table is the canonical sequence of "things that happened." Notifications listen to it. This decouples the trigger logic from the notification logic; future channels (Slack? webhooks for tenants?) plug in by reading the same stream.
2. **`pg_net` from a trigger to call the Edge Function**. Standard Supabase pattern. Async — the database insert returns immediately even if the Edge Function takes a second to fire.
3. **Idempotency via `(appointment_id, channel, event)` composite check**. We don't UNIQUE-constrain it (allow retries on `failed`), but we filter on the `queued`+`sent` set before re-inserting.
4. **Reminders run server-side only**. `pg_cron` every 5 minutes scans for windows. We tolerate ±5 minutes — the customer doesn't care about exact precision.
5. **`reminder_24h` is a 30-minute scan window**. We look for `starts_at` between `now()+23h45m` and `now()+24h15m`. Wider than the cron interval to avoid missing edges.
6. **Email is always attempted**, WhatsApp only if phone present, push only if a push token is registered. Recipients without any contact info cause the function to log a warning and skip — never throw.
7. **Locale resolution order**: `profiles.locale` (authenticated user) → `guest_contacts.locale` (guest) → `tenants.default_locale`. The recipient's preference wins.
8. **`.ics` always attached to email**. Helps both customer (calendar import) and email previews.
9. **Push is a stub in v1**. The dispatcher exists; the real impl waits for the dev client. Mock writes to `notifications` so the audit trail is consistent.
10. **WhatsApp template parameter mapping is fixed to the existing `event_notification` template** to avoid Meta re-approval. We swap message body via parameters: `{appointment_date}, {appointment_time}, {tenant_name}, {action: booked|confirmed|cancelled|rescheduled}`.
