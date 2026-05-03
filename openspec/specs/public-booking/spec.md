# public-booking Specification

## Purpose

Defines the **anonymous customer-facing booking flow**: the routes, screens, and server-side guarantees that let a guest land on a tenant via deep link, browse services, pick a slot, submit minimal contact info, and receive a token-protected manage link — all without ever creating an account. Once a guest book completes, the server-issued `manage_token` is the sole credential for cancel/reschedule until the customer optionally claims the booking via Google sign-in.

This capability is mobile-first (a parallel `web-booking-surface` capability covers the eventual web embed) and complements `appointments` (which owns the data model and `book_appointment` RPC), `availability` (which owns slot computation), and `auth` (which owns the post-booking claim flow). It does NOT cover staff-side appointment management, notifications delivery, or web-based booking — those live in their own capabilities.

## Requirements
### Requirement: Anonymous browsing SHALL work without authentication

The `(public)/[tenantSlug]` route group SHALL render tenant info and active services for the anon role using the public anon key, and unknown slugs MUST surface a friendly "Tenant not found" empty state without prompting sign-in.

#### Scenario: tenant by slug
- **GIVEN** a deep link `ma3ady://acme` (or in dev `exp://.../--/acme`)
- **WHEN** the app opens
- **THEN** the user lands on `(public)/[tenantSlug]` for `acme`
- **AND** the active services for that tenant are listed
- **AND** no sign-in prompt appears

#### Scenario: slug not found
- **GIVEN** a deep link to a non-existent tenant
- **WHEN** the app opens
- **THEN** a clear "Tenant not found" empty state is shown with a CTA to return home
- **AND** no booking flow is presented

### Requirement: Booking SHALL collect minimum viable contact info

The booking form SHALL require only `name` and `email` (phone and notes optional), validate the email shape client-side before submit, and MUST keep the submit button disabled until validation passes.

#### Scenario: guest fills the form
- **GIVEN** a guest on the book screen
- **WHEN** they submit `{ name, email }` only
- **THEN** the booking succeeds
- **AND** phone and notes remain null

#### Scenario: invalid email blocks submission
- **WHEN** the guest enters `not-an-email` and taps submit
- **THEN** the form shows a validation error before any network call
- **AND** the submit button remains disabled until corrected

### Requirement: Slot collisions SHALL produce a recoverable error

When `book_appointment` returns `slot_taken` (the EXCLUDE constraint losing path), the UI SHALL navigate the guest back to the slot picker, refetch availability, and MUST show a toast prompting them to pick another time.

#### Scenario: slot taken at submit time
- **GIVEN** a guest has selected slot S
- **AND** between selection and submit, another guest booked S
- **WHEN** the guest submits the form
- **THEN** the `book_appointment` RPC returns `slot_taken`
- **AND** the UI returns the guest to the slots screen
- **AND** a toast shows "That slot just got taken — please pick another"
- **AND** the slot S is no longer in the visible list (because availability is refetched)

### Requirement: The confirmation screen SHALL present a Manage booking action

After a successful booking, the confirmation screen SHALL render the appointment summary, a "Manage booking" primary action that routes internally to `/manage/[token]` (no OS deep-link round-trip), an "Add to my account" Google sign-in CTA, and MUST inform the user that email and WhatsApp messages are on the way. The plaintext `ma3ady://manage/<token>` deep link is reserved for server-rendered email and WhatsApp templates — it is not surfaced as raw text in the in-app confirmation.

#### Scenario: post-booking
- **GIVEN** a successful booking
- **WHEN** the confirmation screen renders
- **THEN** the user sees the appointment summary
- **AND** a "Manage booking" button routes to `/manage/[token]` via expo-router
- **AND** "Add to my account" prompts Google sign-in
- **AND** a notice tells the user an email and WhatsApp message are on the way

### Requirement: The manage screen SHALL operate without sign-in via signed token

The `ma3ady://manage/<token>` deep link (or in-app navigation to `/manage/[token]`) SHALL open a public manage screen that calls `get_appointment_by_token` — a SECURITY DEFINER RPC that hashes the plaintext token, returns the matching `appointments` row, and raises `appointment_unavailable` if missing or already cancelled — and renders Cancel/Reschedule actions on success; an invalid or cancelled-appointment token MUST show "This link is no longer valid" without exposing details. The RPC bypasses the RLS `appointments_select_self_or_staff` policy so anonymous guests can read their own booking using the token alone.

The `manage-appointment` Edge Function SHALL be configured with `verify_jwt = false` (the manage token IS the auth, validated server-side) and SHALL thread audit context via `set_app_context(p_request_id, p_is_guest_token := true)` so audit triggers can attribute the action to the originating Edge Function request.

#### Scenario: valid token opens manage view
- **GIVEN** a deep link `ma3ady://manage/<plaintext-token>` or internal route `/manage/<plaintext-token>`
- **WHEN** the screen mounts
- **THEN** `get_appointment_by_token` is called and returns the appointment row in one round-trip
- **AND** the appointment details and Cancel + Reschedule actions are rendered
- **AND** no sign-in prompt appears

#### Scenario: invalid token
- **GIVEN** the appointment was cancelled previously
- **WHEN** the manage link is opened
- **THEN** `get_appointment_by_token` raises `appointment_unavailable`
- **AND** the screen shows "This link is no longer valid"
- **AND** no appointment details are shown

#### Scenario: post-cancel navigation
- **GIVEN** a guest who just cancelled their booking
- **WHEN** the cancel succeeds
- **THEN** the cached appointment query is removed
- **AND** the user is routed to `/` (home) so they don't see the now-invalid manage screen
- **AND** a success toast confirms the cancellation

### Requirement: Cancellation via manage link SHALL be reversible only by re-booking

The `manage-appointment` Edge Function SHALL set `status = 'cancelled'` and `cancelled_at = now()` when called with a valid token; the slot is freed and the same token MUST stop working — recovery requires a brand-new booking.

#### Scenario: cancel
- **GIVEN** a guest on the manage screen for a `pending` appointment
- **WHEN** they tap Cancel and confirm
- **THEN** the `manage-appointment` Edge Function sets `status = 'cancelled'`, `cancelled_at = now()`
- **AND** the slot is freed (visible to other bookers)
- **AND** the manage link no longer works for this appointment

### Requirement: Rescheduling via manage link SHALL re-validate availability

A reschedule via manage token SHALL re-call `compute_available_slots` to verify the target slot is free, update `starts_at`/`ends_at` in place, write an `appointment_events` row of type `'rescheduled'`, and the same `manage_token_hash` MUST continue to authorize future actions.

#### Scenario: reschedule to a free slot
- **GIVEN** a guest selecting a new slot in the manage flow
- **WHEN** they confirm the reschedule
- **THEN** the function calls `compute_available_slots` to verify the new slot is free
- **AND** updates `starts_at`/`ends_at` on the existing appointment
- **AND** an `appointment_events` row of type `'rescheduled'` is written
- **AND** the same manage token continues to work for future actions

#### Scenario: reschedule to a taken slot
- **GIVEN** a guest selecting a slot that another booking grabbed in the meantime
- **WHEN** the function attempts the update
- **THEN** the EXCLUDE constraint rejects, the function maps to `slot_taken`
- **AND** the manage screen returns to slot picker with a clear message
