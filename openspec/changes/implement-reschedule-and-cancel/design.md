# Design

## Context

Three parties can mutate an appointment: staff (any role except customer), the appointment's authenticated customer, or an anonymous guest carrying a valid manage token. They share the same actions (reschedule, cancel) but reach them through different auth paths. We unify the logic in two Edge Functions (`update-appointment-status` for status, `reschedule-appointment` for time changes) and dispatch from each surface.

## Goals

- One source of truth for "is this state transition allowed?"
- One source of truth for "is this caller authorized to act on this appointment?"
- Reschedule UI is identical UX whether you're a guest, a customer, or staff.

## Non-Goals

- Partial reschedules (e.g., move only the start, keep duration the same) — we always recompute `ends_at` from service duration. This means reschedule respects current service config; if the service duration was updated since the booking, the reschedule uses the new duration.
- Multi-appointment "swap" operations.
- Customer-initiated cancellation policies (e.g., "no cancellations within 24h"). Defer.

## Decisions

1. **State machine is a function plus trigger**, not just enum-default constraints. Some transitions (cancelled → confirmed) are syntactically possible but semantically forbidden. The function makes the rules explicit and testable.
2. **`reschedule-appointment` is a separate Edge Function from `update-appointment-status`**. Different inputs, different validation. Combining them would be a god-function.
3. **`manage-appointment` delegates to the two unified functions**. Reduces duplication; the manage Edge Function is mostly a token-verifier wrapper.
4. **Reschedule preserves status**. A `confirmed` appointment stays `confirmed` after rescheduling. Most platforms do this; surprise factor of demoting back to `pending` outweighs the safety benefit.
5. **Reschedule preserves the manage token**. Same `manage_token_hash` survives. Guests don't have to remember a new link.
6. **`cancelled_by_user_id` is null when cancelled by a guest via token**. The DB-level `auth.uid()` returns null in that path. The audit log still has the event with payload `{by: "guest_token"}`.
7. **No reschedule limit** in v1. (Some products limit to N reschedules per booking.) Add later if abuse appears.
