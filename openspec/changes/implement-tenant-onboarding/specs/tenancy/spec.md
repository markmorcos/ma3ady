# tenancy — Spec Delta

## ADDED Requirements

### Requirement: A signed-in user SHALL be able to claim an available slug and become its owner

#### Scenario: successful claim
- **GIVEN** a signed-in user with no existing memberships
- **WHEN** they submit `claim-slug` with `{ slug: 'acme', name: 'Acme Clinic', timezone: 'Europe/Berlin', default_locale: 'en' }`
- **AND** no tenant or reserved entry uses `acme`
- **THEN** a new `tenants` row is created
- **AND** a `memberships` row with `role = 'owner'` is created for the user
- **AND** the response includes the tenant's id and slug

#### Scenario: collision
- **GIVEN** a tenant with slug `acme` already exists
- **WHEN** another user submits `claim-slug` with `{ slug: 'acme', ... }`
- **THEN** the function returns HTTP 409 with error code `slug_taken`
- **AND** no new tenant or membership row is created

#### Scenario: reserved slug
- **WHEN** a user submits `claim-slug` with `{ slug: 'admin', ... }`
- **THEN** the function returns HTTP 409 with error code `slug_reserved`

### Requirement: Slug availability SHALL be queryable without claiming

#### Scenario: live check during typing
- **GIVEN** a user typing `acme` in the slug field
- **WHEN** the input debounces and an availability RPC is called
- **THEN** the response is `{ available: true }` if the slug is free
- **AND** `{ available: false, reason: 'taken' | 'reserved' }` otherwise
- **AND** the response time is under 500ms at p95

### Requirement: Invitations SHALL accept both existing and new users

#### Scenario: invite an existing user
- **GIVEN** an owner of tenant `acme` invites `bob@example.com`
- **AND** Bob is already a Supabase auth user
- **WHEN** the function runs
- **THEN** a `memberships` row is inserted directly (`tenant_id = acme, user_id = bob.id, role = 'staff'`)
- **AND** the response is `{ status: 'added' }`

#### Scenario: invite a new user
- **GIVEN** an owner invites `cara@example.com` who has no auth.users row
- **WHEN** the function runs
- **THEN** Supabase Auth sends an invitation email to Cara
- **AND** a `pending_memberships` row is inserted

#### Scenario: pending membership promotes on first sign-in
- **GIVEN** Cara has a `pending_memberships` row for tenant `acme`
- **WHEN** Cara signs in via Google for the first time with `cara@example.com`
- **THEN** the `handle_new_user` trigger inserts a `memberships` row from the pending data
- **AND** the `pending_memberships` row is deleted
- **AND** Cara sees the acme tenant in her picker

### Requirement: Boot routing SHALL match membership cardinality

#### Scenario: zero memberships, fresh user
- **GIVEN** a newly signed-in user with zero memberships and zero claimed bookings
- **WHEN** the app boots
- **THEN** the user is routed to `(onboarding)/welcome`

#### Scenario: zero memberships, claimed customer
- **GIVEN** a newly signed-in user with zero `memberships` rows but with appointments where `user_id = auth.uid()` (claimed via the `implement-google-oauth` change)
- **WHEN** the app boots
- **THEN** the user is routed to the authenticated customer home, not onboarding

#### Scenario: one membership
- **GIVEN** a user with exactly one membership
- **WHEN** the app boots
- **THEN** that tenant is auto-selected
- **AND** the user is routed to home in the mode appropriate to their role

#### Scenario: multiple memberships
- **GIVEN** a user with two or more memberships
- **WHEN** the app boots
- **THEN** the tenant picker modal is presented
- **AND** selecting a tenant persists the choice in `AsyncStorage['app.tenantId']`
