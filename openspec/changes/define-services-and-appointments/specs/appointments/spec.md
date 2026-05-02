# appointments — Spec Delta

## ADDED Requirements

### Requirement: Appointments SHALL belong to either an authenticated user OR a guest contact, never both

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

#### Scenario: same email, second booking
- **GIVEN** a guest contact `(tenant=acme, email=jane@example.com)` already exists
- **WHEN** a new `book_appointment` call uses the same tenant and email with a different name
- **THEN** the existing `guest_contacts` row is updated (name + phone refreshed)
- **AND** no second `guest_contacts` row is created

### Requirement: Appointments SHALL NEVER be hard-deleted

#### Scenario: delete attempt
- **GIVEN** any role attempting `delete from appointments where id = '<x>'`
- **WHEN** the operation runs
- **THEN** the policy denies the delete
- **AND** the only way to "remove" an appointment is to set `status = 'cancelled'`

### Requirement: Status changes SHALL produce audit events

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

#### Scenario: valid token verification
- **GIVEN** a non-cancelled appointment with a known plaintext manage token
- **WHEN** `verify_manage_token(plaintext)` is called
- **THEN** the function returns the appointment id

#### Scenario: cancelled appointment rejects token
- **GIVEN** the appointment was subsequently cancelled
- **WHEN** `verify_manage_token(plaintext)` is called with the same token
- **THEN** the function raises an "appointment unavailable" error
