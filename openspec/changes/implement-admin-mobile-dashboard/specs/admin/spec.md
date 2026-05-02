# admin — Spec Delta

## ADDED Requirements

### Requirement: App mode SHALL be determined by current tenant role

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

#### Scenario: returning customer
- **GIVEN** a customer with appointments at tenants `acme` and `bravo`
- **WHEN** they open Home
- **THEN** both tenants appear with their brand colors as quick-access cards
- **AND** tapping a card opens the public booking flow for that tenant
