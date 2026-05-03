# Design

## Context

Two related domain entities. Services define "what you can book"; appointments are concrete bookings. The interesting design decisions are around: how to represent guest (anonymous) bookings, how to make double-booking impossible at the database layer, and how to keep the booking flow callable from the anon key without creating a privilege escalation.

## Goals

- Anonymous booking works without an `auth.users` row (guests are first-class).
- Double-booking is impossible — race conditions resolve at the database, not in application code.
- Cancelled and no-show appointments still occupy data history (for audit) but free the time slot.
- Manage tokens are securely stored (hashed) and bound to a single appointment.
- An audit trail tracks every status change.

## Non-Goals

- Calendar integrations (Google Calendar, Outlook) — deferred.
- Appointment notes that customers can edit post-booking (only staff edit notes in v1).
- Group bookings (one slot, multiple attendees).

## Decisions

1. **EXCLUDE constraint with `WHERE` clause**. The `where (status not in ('cancelled','no_show'))` predicate means cancelled rows don't block their range — exactly the semantic we want. Without it, cancelling a 10:00 booking wouldn't let anyone else book 10:00.
2. **`guest_contacts` as a separate table from `auth.users`**. Lets us model anonymous bookings cleanly. The `claimed_by_user_id` column closes the loop when a guest later signs in with the same email — the `implement-google-oauth` change fills this in via a `claim-bookings` Edge Function.
3. **Exactly one of `user_id` / `guest_contact_id`**. Enforced by check constraint. This keeps queries clean: "appointments for user X" is `where user_id = X`; "appointments for email Y" joins through `guest_contacts`.
4. **`book_appointment` is a SECURITY DEFINER function**, not a direct INSERT. Reasons: (a) we want to validate against `compute_available_slots` server-side; (b) we want anon-key callers; (c) we want to upsert `guest_contacts` and insert `appointments` in one transaction; (d) we want to centralize the "slot already taken" error mapping. RLS on `appointments` denies direct INSERT; the only path is through this function.
5. **Manage token hashing**. We store `sha256(token)` and never the plaintext. The plaintext is returned exactly once, at booking time, and lives only in the email/WhatsApp body. If a tenant's database is dumped, the tokens can't be reused.
6. **Manage token is single-purpose**. Bound to one appointment. No "user manage portal" with one token covering many bookings — that would centralize compromise.
7. **`appointment_events` as the audit log**. Insert + every status change writes a row. Notifications dispatcher (the `implement-notifications-pipeline` change) reads from this stream rather than from triggers on `appointments` — keeps the trigger logic minimal.
8. **No `delete` on appointments**. Cancellations are `status = 'cancelled'`. The data is retained for tenant analytics and GDPR-driven anonymization (the `setup-compliance-and-launch` change) handles PII removal.
9. **`min_notice_min`, `max_advance_days`, etc., on `services`, not on `tenants`**. A tenant might want different policies per service (e.g., haircut bookable 1 day out, surgery 2 weeks out). Per-service is more flexible at zero extra cost.
10. **Appointments have `notes`, services have `description`**. Different audiences — `description` is what customers see while browsing; `notes` is what the customer or staff jots about a specific appointment.
