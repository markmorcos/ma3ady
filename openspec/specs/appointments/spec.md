# appointments Specification

## Purpose
TBD - created by archiving change define-services-and-appointments. Update Purpose after archive.
## Requirements
### Requirement: Appointments SHALL belong to either an authenticated user OR a guest contact, never both

A check constraint on `appointments` SHALL enforce that exactly one of `user_id` or `guest_contact_id` is non-null — every appointment MUST have an identity, but never two.

#### Scenario: authenticated booking
- **GIVEN** an `appointments` row with `user_id` set and `guest_contact_id = null`
- **THEN** the check constraint passes

#### Scenario: guest booking
- **GIVEN** a row with `guest_contact_id` set and `user_id = null`
- **THEN** the check constraint passes

#### Scenario: invalid — both set
- **WHEN** an insert sets both `user_id` and `guest_contact_id`
- **THEN** the check constraint rejects the insert

#### Scenario: invalid — neither set
- **WHEN** an insert sets neither
- **THEN** the check constraint rejects the insert

### Requirement: Two non-cancelled appointments SHALL NEVER overlap for the same service in the same tenant

The `appointments` table SHALL carry a Postgres `EXCLUDE USING gist` constraint on `(tenant_id, service_id, tstzrange(starts_at, ends_at))` predicated on `status NOT IN ('cancelled', 'no_show')`, so concurrent inserts for the same range MUST resolve at the database level with the loser receiving a constraint violation.

#### Scenario: race condition resolved by EXCLUDE constraint
- **GIVEN** two concurrent transactions inserting appointments for the same `(tenant_id, service_id)` and overlapping `tstzrange`
- **WHEN** both call commit
- **THEN** exactly one transaction succeeds
- **AND** the other fails with the EXCLUDE violation
- **AND** the `book_appointment` function maps that error to a `'slot_taken'` exception for the caller

#### Scenario: cancelled appointment frees the range
- **GIVEN** an appointment from 10:00 to 10:30 with `status = 'cancelled'`
- **WHEN** another insert attempts the same range with `status = 'pending'`
- **THEN** the EXCLUDE constraint allows it (predicate excludes cancelled/no_show rows)

### Requirement: Booking SHALL go through the `book_appointment` function, not direct INSERT

RLS on `appointments` SHALL deny INSERT for all roles, and the `book_appointment` SECURITY DEFINER function MUST be the only path that creates rows — returning a plaintext `manage_token` while persisting only `sha256(manage_token)` in `manage_token_hash`.

#### Scenario: direct insert blocked
- **GIVEN** an authenticated user (any role)
- **WHEN** they attempt `insert into appointments(...) values (...)`
- **THEN** the policy denies the insert

#### Scenario: function-mediated booking succeeds
- **GIVEN** an anon client
- **WHEN** the client calls `book_appointment('acme', '<service-uuid>', '2026-05-12 10:00+02', 'Jane', 'jane@example.com', null)`
- **AND** the slot is available
- **THEN** an appointment is created
- **AND** the function returns `{ appointment_id, manage_token }`
- **AND** `manage_token` is a 32-byte URL-safe random string (returned plaintext)
- **AND** the database stores only `sha256(manage_token)` in `manage_token_hash`

### Requirement: Anonymous booking SHALL upsert into `guest_contacts` by `(tenant_id, email)`

`book_appointment` SHALL upsert the guest into `guest_contacts` keyed by `(tenant_id, email)` so repeat bookings from the same email MUST refresh the existing row rather than creating duplicates.

#### Scenario: same email, second booking
- **GIVEN** a guest contact `(tenant=acme, email=jane@example.com)` already exists
- **WHEN** a new `book_appointment` call uses the same tenant and email with a different name
- **THEN** the existing `guest_contacts` row is updated (name + phone refreshed)
- **AND** no second `guest_contacts` row is created

### Requirement: Appointments SHALL NEVER be hard-deleted

RLS on `appointments` SHALL deny DELETE for every role; cancellation MUST be modeled as a `status = 'cancelled'` update so business records remain intact.

#### Scenario: delete attempt
- **GIVEN** any role attempting `delete from appointments where id = '<x>'`
- **WHEN** the operation runs
- **THEN** the policy denies the delete
- **AND** the only way to "remove" an appointment is to set `status = 'cancelled'`

### Requirement: Status changes SHALL produce audit events

The `handle_appointment_status_change` trigger SHALL write a row to `appointment_events` for every status change or reschedule, capturing `event_type`, before/after payload, and `by_user_id = auth.uid()` so the lifecycle MUST be reconstructable from history.

#### Scenario: confirmation event
- **GIVEN** an appointment in `pending` status
- **WHEN** a staff member updates it to `confirmed`
- **THEN** the `handle_appointment_status_change` trigger writes a row to `appointment_events`
- **AND** the row has `event_type = 'status_changed'`, `payload = '{"from":"pending","to":"confirmed"}'`, `by_user_id = auth.uid()`

#### Scenario: rescheduling event
- **GIVEN** an appointment with `starts_at = 10:00`
- **WHEN** the row is updated to `starts_at = 11:00, ends_at = 11:30`
- **THEN** an `appointment_events` row is written with `event_type = 'rescheduled'` and old/new timestamps in payload

### Requirement: Manage tokens SHALL be single-use-purpose and verifiable

The `verify_manage_token(plaintext)` function SHALL hash the input, look up the matching `manage_token_hash`, and MUST return the appointment id only when the appointment is non-cancelled — raising "appointment unavailable" otherwise.

#### Scenario: valid token verification
- **GIVEN** a non-cancelled appointment with a known plaintext manage token
- **WHEN** `verify_manage_token(plaintext)` is called
- **THEN** the function returns the appointment id

#### Scenario: cancelled appointment rejects token
- **GIVEN** the appointment was subsequently cancelled
- **WHEN** `verify_manage_token(plaintext)` is called with the same token
- **THEN** the function raises an "appointment unavailable" error

### Requirement: Manage tokens SHALL also resolve to the full appointment row in one round-trip

The `get_appointment_by_token(plaintext)` SECURITY DEFINER function SHALL hash the input, look up the matching `manage_token_hash`, and MUST return the entire `public.appointments` row for non-cancelled appointments — raising "appointment unavailable" otherwise. This bypasses the RLS `appointments_select_self_or_staff` policy so anonymous guests can read their own booking using the token alone, without first authenticating. Execute is granted to `anon` and `authenticated`.

#### Scenario: guest opens a manage link before sign-in
- **GIVEN** an anonymous guest holding a plaintext manage token
- **WHEN** `get_appointment_by_token(plaintext)` is called via supabase-js with the anon key
- **THEN** the function returns the full appointment row (id, tenant_id, service_id, starts_at, ends_at, status, ...)
- **AND** the RLS select policy on `appointments` is bypassed because the function runs with definer privileges
- **AND** no further `select * from appointments` query is needed by the client

### Requirement: Status transitions SHALL be restricted to the defined state machine

The `validate_status_transition(from, to)` function SHALL allow only `pending → confirmed`, `pending → cancelled`, `confirmed → completed`, `confirmed → no_show`, `confirmed → cancelled`; terminal states (`completed`, `cancelled`, `no_show`) MUST reject every further change with `invalid_transition`.

#### Scenario: pending → confirmed
- **GIVEN** an appointment in `pending`
- **WHEN** a staff member sets it to `confirmed`
- **THEN** the transition is allowed
- **AND** the appointment row is updated

#### Scenario: pending → completed (forbidden)
- **GIVEN** an appointment in `pending`
- **WHEN** a status update to `completed` is requested
- **THEN** `validate_status_transition` returns false
- **AND** the Edge Function returns HTTP 422 with code `invalid_transition`
- **AND** the row is unchanged

#### Scenario: cancelled → anything (forbidden)
- **GIVEN** an appointment in `cancelled`
- **WHEN** any status update is attempted
- **THEN** the transition is rejected
- **AND** the row is unchanged

#### Scenario: completed → anything (forbidden)
- **GIVEN** an appointment in `completed`
- **WHEN** any status update is attempted
- **THEN** the transition is rejected

### Requirement: Reschedule SHALL be available to staff, owner customer, or token holder

The `reschedule-appointment` Edge Function SHALL authorize the request when the caller is the owning customer (`auth.uid() = appointments.user_id`), a tenant member with `staff`/`admin`/`owner` role, OR carries a valid manage token; everyone else MUST receive HTTP 403.

#### Scenario: customer reschedule via auth
- **GIVEN** a signed-in customer who owns the appointment
- **WHEN** they call `reschedule-appointment` with a new starts_at
- **THEN** authorization passes
- **AND** the appointment is updated if the new slot is available

#### Scenario: staff reschedule
- **GIVEN** a staff member of the tenant
- **WHEN** they call the function with a customer's appointment id
- **THEN** authorization passes

#### Scenario: third party rejected
- **GIVEN** a signed-in user who is neither the customer nor staff of the tenant
- **WHEN** they attempt to reschedule
- **THEN** the function returns HTTP 403

#### Scenario: guest with valid token
- **GIVEN** an anonymous request carrying a valid manage token in the body
- **WHEN** the request is made
- **THEN** the function verifies the token and proceeds
- **AND** authorization passes for that one appointment only

### Requirement: Reschedule SHALL preserve status and manage token

A successful reschedule SHALL leave `status` and `manage_token_hash` untouched, so a `confirmed` appointment MUST stay `confirmed` and the previously-issued manage link continues to work.

#### Scenario: confirmed reschedule
- **GIVEN** a `confirmed` appointment
- **WHEN** it is rescheduled to a new time
- **THEN** the resulting status is still `confirmed`
- **AND** `manage_token_hash` is unchanged
- **AND** the previously-issued manage link continues to work

### Requirement: Reschedule SHALL recompute ends_at from current service duration

The reschedule function SHALL set `ends_at = new_starts_at + services.duration_minutes` using the service's current value, and the resulting `tstzrange` MUST be re-checked against the EXCLUDE constraint.

#### Scenario: duration changed since booking
- **GIVEN** an appointment for service S originally booked when `S.duration_minutes = 30`
- **AND** S's duration has since been updated to 45 minutes
- **WHEN** the appointment is rescheduled
- **THEN** the new `ends_at = new_starts_at + 45 minutes`
- **AND** EXCLUDE constraint is checked against the new range

### Requirement: Cancellation SHALL record who cancelled and when

Every cancellation SHALL set `cancelled_at = now()` and `cancelled_by_user_id = auth.uid()` (or null for guest-token cancels, with the actor recorded in the `appointment_events` payload as `{by: "guest_token"}`).

#### Scenario: staff cancels
- **GIVEN** a staff member cancels an appointment
- **WHEN** the update is applied
- **THEN** `cancelled_at = now()`, `cancelled_by_user_id = auth.uid()`

#### Scenario: customer cancels via auth
- **GIVEN** the customer cancels their own appointment
- **THEN** `cancelled_at = now()`, `cancelled_by_user_id = auth.uid()`

#### Scenario: guest cancels via token
- **GIVEN** a guest cancels via manage token
- **THEN** `cancelled_at = now()`
- **AND** `cancelled_by_user_id = null`
- **AND** the `appointment_events` payload records the cancellation as `{by: "guest_token"}`

