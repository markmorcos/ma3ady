# admin Specification

## Purpose
TBD - created by archiving change implement-admin-mobile-dashboard. Update Purpose after archive.
## Requirements
### Requirement: App mode SHALL be determined by current tenant role

The boot router SHALL inspect the active membership's `role` and route users with `owner`/`admin`/`staff` to `(admin)/(tabs)`, while users whose only memberships are `customer` (or none) MUST land on `(app)/(tabs)`.

#### Scenario: staff signs in
- **GIVEN** a signed-in user with `currentRole in ('owner', 'admin', 'staff')` for the active tenant
- **WHEN** the app boots
- **THEN** the user is routed to `(admin)/(tabs)` and sees admin tabs

#### Scenario: customer signs in
- **GIVEN** a signed-in user whose only memberships are `customer` (or none)
- **WHEN** the app boots
- **THEN** the user is routed to `(app)/(tabs)` (customer home)
- **AND** admin tabs are not accessible from the navigation

### Requirement: The Today screen SHALL show today's appointments and quick stats

The admin Today screen SHALL render today's appointments in chronological order using the tenant TZ via `useDisplayTimezone` and MUST show stat cards for today's count, this week's confirmed count, and 30-day no-show rate.

#### Scenario: rendering
- **GIVEN** a staff member of `acme` opens Today
- **WHEN** the screen mounts
- **THEN** today's appointments (in tenant timezone) are listed in chronological order
- **AND** stats cards show counts: today's appointments, this week's confirmed, no-show rate (last 30 days)

#### Scenario: empty day
- **GIVEN** no appointments scheduled today
- **WHEN** Today renders
- **THEN** an empty state shows "No appointments today" with a CTA to view upcoming days

### Requirement: Status changes SHALL go through the Edge Function with role check

Appointment status updates from admin surfaces SHALL invoke the `update-appointment-status` Edge Function rather than direct UPDATE, and the function MUST verify membership in the appointment's tenant before mutating, returning HTTP 403 on mismatch.

#### Scenario: staff marks complete
- **GIVEN** a staff member of `acme` viewing an appointment in `confirmed` status
- **WHEN** they tap "Mark complete"
- **THEN** `update-appointment-status` is invoked with `{ status: 'completed' }`
- **AND** the function verifies role and updates the row
- **AND** an `appointment_events` row of type `status_changed` is written

#### Scenario: cross-tenant attempt
- **GIVEN** a user who is staff of tenant X but not Y
- **WHEN** they (somehow) call the function with an appointment id from Y
- **THEN** the function returns HTTP 403
- **AND** no row is updated

### Requirement: Services SHALL be editable inline by owners and admins

Service edits (toggling `active`, changing duration/buffers/policies) SHALL be allowed for `owner` and `admin` roles only; `staff` MUST see read-only controls on the same screen.

#### Scenario: toggle active
- **GIVEN** an admin viewing the services tab
- **WHEN** they toggle a service's active switch
- **THEN** the row updates `services.active`
- **AND** the change is reflected on the public booking flow within the next refetch (TanStack Query stale time)

#### Scenario: staff cannot edit
- **GIVEN** a `staff` role viewing services
- **WHEN** they tap the active toggle
- **THEN** the toggle is disabled
- **AND** the same screen for owners/admins shows it enabled

### Requirement: Team management SHALL respect role hierarchy

The `invite-member` Edge Function SHALL allow `admin` to invite or promote members up to `admin`, while only an `owner` MUST be permitted to grant the `owner` role; attempts that exceed the caller's level return `forbidden_role`.

#### Scenario: admin invites staff
- **GIVEN** an admin
- **WHEN** they invite `bob@x.com` with role `staff`
- **THEN** the `invite-member` Edge Function accepts the request

#### Scenario: admin cannot grant owner
- **WHEN** an admin attempts to invite or promote a member to `owner`
- **THEN** the function rejects with `'forbidden_role'`

#### Scenario: owner promotes admin
- **GIVEN** an owner
- **WHEN** they change a `staff` member's role to `admin`
- **THEN** the membership row updates
- **AND** an audit row is written (deferred to compliance change)

### Requirement: Customer home SHALL list tenants the user has booked with

The customer home SHALL query `memberships` joined with `tenants` for the signed-in user and MUST render one card per tenant (with name and `brand_color`) that opens the public booking flow for that slug on tap.

#### Scenario: returning customer
- **GIVEN** a customer with appointments at tenants `acme` and `bravo`
- **WHEN** they open Home
- **THEN** both tenants appear with their brand colors as quick-access cards
- **AND** tapping a card opens the public booking flow for that tenant

