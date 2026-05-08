# notifications Specification

## Purpose
TBD - created by archiving change implement-notifications-pipeline. Update Purpose after archive.
## Requirements
### Requirement: Every notification attempt SHALL be recorded in the `notifications` table

The `send-appointment-notification` Edge Function SHALL persist a `notifications` row for every dispatched attempt with `(channel, event, status, provider_id, error, sent_at)`, and a provider failure MUST be recorded as `status = 'failed'` without re-throwing.

#### Scenario: successful send
- **GIVEN** a booking is created and the email dispatcher succeeds
- **WHEN** `send-appointment-notification` runs
- **THEN** a `notifications` row exists with `channel = 'email', event = 'booked', status = 'sent', provider_id` set
- **AND** `sent_at` is non-null

#### Scenario: failed send
- **GIVEN** the email provider returns an error
- **WHEN** the dispatcher captures the failure
- **THEN** the row is updated to `status = 'failed'` with `error` populated
- **AND** the function does not re-throw (other channels still attempt)

### Requirement: Idempotency SHALL prevent duplicate sends

The function SHALL skip a send when a `notifications` row already exists for the same `(appointment_id, channel, event)` with `status = 'sent'`; rows with `status = 'failed'` MUST allow retries.

#### Scenario: trigger fires twice
- **GIVEN** a `notifications` row with `(appointment_id, channel, event) = (X, 'email', 'booked'), status = 'sent'`
- **WHEN** `send-appointment-notification` is invoked again for the same event
- **THEN** no second row is inserted
- **AND** no second send is attempted

#### Scenario: retrying a failed send
- **GIVEN** a row with status `failed`
- **WHEN** the function is invoked again
- **THEN** a new attempt is made (the failed row does not block retries)

### Requirement: Recipient locale SHALL drive message language

Notification composition SHALL resolve the locale from `profiles.locale` (authenticated) or `guest_contacts.locale` (anonymous), falling back to `tenants.default_locale`; subject, body, WhatsApp template params, and `.ics` SUMMARY MUST all render in that resolved locale.

#### Scenario: signed-in customer with `profiles.locale = 'ar'`
- **WHEN** a notification is composed
- **THEN** the email subject, body, WhatsApp template params, and push body use the Arabic locale
- **AND** any `.ics` attachment uses Arabic for `SUMMARY` and localized day/month names

#### Scenario: guest with `guest_contacts.locale = 'en'`
- **WHEN** a guest booking generates a notification
- **THEN** the message uses English regardless of `tenants.default_locale`

#### Scenario: fallback to tenant default
- **GIVEN** a guest with no locale set
- **WHEN** a notification is composed
- **THEN** the locale is `tenants.default_locale`

### Requirement: Reminders SHALL fire once per appointment per kind

A `pg_cron` job SHALL evaluate upcoming non-cancelled appointments and queue a reminder when one falls within the T-24h window; the idempotency check on `(appointment_id, channel, event = 'reminder_24h')` MUST prevent duplicates across cron ticks.

#### Scenario: T-24h reminder
- **GIVEN** an appointment starting in exactly 24 hours
- **WHEN** the cron job runs at T-24h ± 5 minutes
- **THEN** a `notifications` row is queued with `event = 'reminder_24h'`
- **AND** the dispatcher sends the reminder

#### Scenario: cron job runs again 5 minutes later
- **GIVEN** the previous reminder was sent
- **WHEN** the cron job re-evaluates
- **THEN** no second `reminder_24h` row is created for the same appointment

#### Scenario: cancelled before reminder
- **GIVEN** an appointment cancelled 23 hours ahead
- **WHEN** the T-24h window passes
- **THEN** no reminder is queued (cancelled appointments are excluded from the cron query)

### Requirement: Mock dispatchers SHALL behave identically except for the side effect

When any of `EMAIL_DISPATCHER`, `WHATSAPP_DISPATCHER`, or `PUSH_DISPATCHER` equals `mock`, the dispatcher SHALL render the full payload, persist a `notifications` row with `status = 'sent'`, and MUST skip the network call so dev/preview reproduces production output without external traffic.

#### Scenario: dev environment send
- **GIVEN** `EMAIL_DISPATCHER=mock`
- **WHEN** an email notification fires
- **THEN** the `notifications` row is inserted with `status = 'sent'`
- **AND** the `payload` JSON contains the rendered subject + html + text bodies
- **AND** no HTTPS call is made to Resend
- **AND** the test/inspection of the rendered message is identical to what the real path would produce

### Requirement: WhatsApp messages SHALL use the existing approved template

The real WhatsApp dispatcher SHALL POST to the Meta Cloud API using template `event_notification` with parameters `(appointment_date, appointment_time, tenant_name, action)`, and any non-2xx response MUST be captured as `failed` with the provider error in `error`.

#### Scenario: WhatsApp send via Meta
- **GIVEN** `WHATSAPP_DISPATCHER=real`
- **WHEN** the dispatcher runs
- **THEN** the API call uses template `event_notification`
- **AND** parameters are mapped per the documented schema (`appointment_date, appointment_time, tenant_name, action`)
- **AND** a non-2xx response is captured as `failed` with the provider error in `error`

