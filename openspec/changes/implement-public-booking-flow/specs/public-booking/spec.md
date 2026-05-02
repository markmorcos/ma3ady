# public-booking — Spec Delta

## ADDED Requirements

### Requirement: Anonymous browsing SHALL work without authentication

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

#### Scenario: slot taken at submit time
- **GIVEN** a guest has selected slot S
- **AND** between selection and submit, another guest booked S
- **WHEN** the guest submits the form
- **THEN** the `book_appointment` RPC returns `slot_taken`
- **AND** the UI returns the guest to the slots screen
- **AND** a toast shows "That slot just got taken — please pick another"
- **AND** the slot S is no longer in the visible list (because availability is refetched)

### Requirement: The confirmation screen SHALL present the manage link

#### Scenario: post-booking
- **GIVEN** a successful booking
- **WHEN** the confirmation screen renders
- **THEN** the user sees the appointment summary
- **AND** the manage link (`ma3ady://manage/<token>`) is presented with a "copy" action
- **AND** "Add to my account" prompts Google sign-in
- **AND** a notice tells the user an email and WhatsApp message are on the way

### Requirement: The manage screen SHALL operate without sign-in via signed token

#### Scenario: valid token opens manage view
- **GIVEN** a deep link `ma3ady://manage/<plaintext-token>`
- **WHEN** the app opens
- **THEN** `verify_manage_token` is called
- **AND** if valid, the appointment details and Cancel + Reschedule actions are rendered
- **AND** no sign-in prompt appears

#### Scenario: invalid token
- **GIVEN** the appointment was cancelled previously
- **WHEN** the manage link is opened
- **THEN** the screen shows "This link is no longer valid"
- **AND** no appointment details are shown

### Requirement: Cancellation via manage link SHALL be reversible only by re-booking

#### Scenario: cancel
- **GIVEN** a guest on the manage screen for a `pending` appointment
- **WHEN** they tap Cancel and confirm
- **THEN** the `manage-appointment` Edge Function sets `status = 'cancelled'`, `cancelled_at = now()`
- **AND** the slot is freed (visible to other bookers)
- **AND** the manage link no longer works for this appointment

### Requirement: Rescheduling via manage link SHALL re-validate availability

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
