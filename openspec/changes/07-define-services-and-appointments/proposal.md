# Define services and appointments

## Why

Services are the bookable unit (each tenant defines what customers can book — "Consultation", "Haircut", "Tutoring session"). Appointments are the actual reservations. Together they complete the core domain model alongside availability rules.

This change establishes the schema, the EXCLUDE-based double-booking guard, the appointment status state machine, and an audit-friendly `appointment_events` log. Status-transition flows (cancel, reschedule, complete, no-show) and customer-facing booking land in changes 10 and 13; this change is data + RPC primitives.

## What Changes

- **ADDED** migration `003_services.sql`:
  - `services(id, tenant_id, name, description, duration_minutes, buffer_before_min int default 0, buffer_after_min int default 0, min_notice_min int default 60, max_advance_days int default 60, daily_cap int nullable, active boolean default true, created_at, updated_at)`
  - Check constraints: `duration_minutes > 0`, `buffer_*_min >= 0`, `min_notice_min >= 0`, `max_advance_days > 0`
  - RLS: read public for `active = true`; write owner/admin only
- **ADDED** migration `004_appointments.sql`:
  - `appointment_status enum('pending','confirmed','cancelled','completed','no_show')`
  - `guest_contacts(id, tenant_id, name, email, phone nullable, locale, claimed_by_user_id nullable references auth.users, created_at, updated_at, unique(tenant_id, email))`
  - `appointments(id, tenant_id, service_id, user_id nullable references auth.users, guest_contact_id nullable references guest_contacts, starts_at timestamptz, ends_at timestamptz, status appointment_status default 'pending', notes text, manage_token_hash text not null, cancelled_at, cancelled_by_user_id, created_at, updated_at)`
  - Check: exactly one of `user_id` / `guest_contact_id` is non-null
  - **EXCLUDE constraint**: `using gist (tenant_id with =, service_id with =, tstzrange(starts_at, ends_at) with &&) where (status not in ('cancelled','no_show'))`
  - Indexes: `(tenant_id, starts_at)`, `(user_id)`, `(guest_contact_id)`, `(status, starts_at)`
  - `appointment_events(id, appointment_id, event_type, payload jsonb, by_user_id nullable, created_at)` — audit trail
  - RLS: customer (or guest via signed token) sees own; staff+ sees all in their tenant
- **ADDED** trigger `handle_appointment_status_change()` writing to `appointment_events` on insert + status transition
- **ADDED** Postgres function `book_appointment(p_tenant_slug, p_service_id, p_starts_at, p_guest_name, p_guest_email, p_guest_phone)` callable with anon key, returns `(appointment_id, manage_token plaintext)` — enforces availability via `compute_available_slots`, hashes and stores manage token
- **ADDED** `src/services/api/appointments.ts` typed wrappers
- **ADDED** seed: a couple of services for the demo tenant

## Impact

- Affects `services` and `appointments` capabilities (initial specs).
- Required by changes 10, 11, 13, 14.
- Finalizes the body of `compute_available_slots` from change 06 (services + appointments now exist).
