# appointments — Spec Delta

## ADDED Requirements

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
