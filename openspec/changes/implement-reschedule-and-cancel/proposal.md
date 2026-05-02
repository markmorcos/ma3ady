# Implement reschedule and cancel flows

## Why

Cancel was implicitly covered by the manage-token flow (the `implement-public-booking-flow` change) and the admin status update (the `implement-admin-mobile-dashboard` change). This change formalizes the appointment status state machine, defines all valid transitions, and ships the authenticated reschedule flow (a customer with a Google account rescheduling their own booking from "My bookings"). Same UX as the guest manage flow, but using the user's auth instead of a token.

## What Changes

- **ADDED** Postgres enum-validation function `validate_status_transition(from appointment_status, to appointment_status) returns boolean`:
  - Allowed: `pending → confirmed | cancelled | no_show`
  - Allowed: `confirmed → cancelled | completed | no_show`
  - Allowed: `cancelled → (terminal)`
  - Allowed: `completed → (terminal)`
  - Allowed: `no_show → (terminal)`
- **MODIFIED** Edge Function `update-appointment-status/` (from the `implement-admin-mobile-dashboard` change) — adds the transition check
- **ADDED** Edge Function `reschedule-appointment/`:
  - Auth: caller is owner/staff of tenant OR caller is the appointment's `user_id` OR caller carries a valid manage token (passed in body)
  - Input: `{ appointment_id, new_starts_at }` (or `{ token, new_starts_at }`)
  - Validates new slot via `compute_available_slots`
  - Updates `starts_at`/`ends_at`, returns updated appointment
- **ADDED** authenticated customer reschedule UI:
  - `app/(app)/bookings/[id].tsx` — booking detail with "Reschedule" and "Cancel" CTAs
  - Reschedule opens slot picker (reuses `<SlotGrid>` from the `implement-public-booking-flow` change)
- **ADDED** admin reschedule UI:
  - `app/(admin)/appointment/[id].tsx` already shows status actions (the `implement-admin-mobile-dashboard` change); this adds a "Reschedule" CTA leading to the same slot picker
- **MODIFIED** the Cancel actions: they now write `cancelled_at` and `cancelled_by_user_id` consistently across all three callers (admin, customer, guest token)

## Impact

- Affects `appointments` capability (delta).
- Closes the customer-facing booking lifecycle.
- All notifications (confirmed, cancelled, rescheduled, completed, no_show) fire via the audit trigger and are picked up by the `implement-notifications-pipeline` change.
