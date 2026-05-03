# tenancy Specification

## Purpose
TBD - created by archiving change define-tenancy-model. Update Purpose after archive.
## Requirements
### Requirement: Tenants SHALL be uniquely identified by a slug matching subdomain rules

`tenants.slug` SHALL be `UNIQUE` and constrained to match `^[a-z0-9](?:[a-z0-9-]{1,}[a-z0-9])$` (lowercase, 3+ chars, no leading/trailing dash); the `assert_slug_available` function MUST reject any value failing those rules or already taken.

#### Scenario: valid slug
- **GIVEN** a candidate slug `acme-clinic`
- **WHEN** `assert_slug_available('acme-clinic')` is called
- **AND** no existing tenant or reserved entry uses it
- **THEN** the function returns without error

#### Scenario: invalid slug — uppercase
- **GIVEN** a candidate slug `Acme`
- **WHEN** an insert is attempted
- **THEN** the slug check constraint rejects it with a check violation

#### Scenario: invalid slug — leading dash
- **GIVEN** a candidate slug `-acme`
- **WHEN** an insert is attempted
- **THEN** the slug check constraint rejects it

#### Scenario: invalid slug — too short
- **GIVEN** a candidate slug `a`
- **WHEN** an insert is attempted
- **THEN** the slug check constraint rejects it (minimum 3 characters)

### Requirement: Reserved slugs SHALL be unclaimable

A `reserved_slugs` table SHALL be seeded with the list in `project.md` §3 (`www, app, admin, auth, api, …`) and `assert_slug_available` MUST raise "slug reserved" when the candidate appears in it.

#### Scenario: claiming a reserved slug
- **GIVEN** the reserved slug `admin` is present in `reserved_slugs`
- **WHEN** `assert_slug_available('admin')` is called
- **THEN** the function raises with message `"slug reserved"`

### Requirement: Tenants SHALL be isolated by Row-Level Security

Every tenant-owned table SHALL carry a NOT NULL `tenant_id` and an RLS policy that scopes reads and writes to the caller's `memberships`; cross-tenant access MUST surface as an empty result, never as an error.

#### Scenario: cross-tenant read attempt
- **GIVEN** user A is a member of tenant X but not tenant Y
- **WHEN** user A's authenticated client queries `select * from memberships where tenant_id = '<Y>'`
- **THEN** the result is empty
- **AND** no error is raised (RLS silently filters)

#### Scenario: cross-tenant write attempt
- **GIVEN** user A is a `staff` member of tenant X
- **WHEN** user A's client attempts `update tenants set name = 'X' where id = '<Y>'`
- **THEN** zero rows are affected
- **AND** the user has not been informed of the existence of tenant Y

### Requirement: A user SHALL be able to hold memberships in multiple tenants

The `memberships` table SHALL be keyed on `(user_id, tenant_id)` with a `role` column, and a single `auth.users` row MUST be allowed multiple rows so a user can be owner of one tenant and customer of another.

#### Scenario: cross-tenant membership
- **GIVEN** user A holds `owner` membership in tenant X and `customer` membership in tenant Y
- **WHEN** A's client queries `select * from memberships`
- **THEN** both rows are returned
- **AND** RLS filtering does not collapse to a single row

### Requirement: Tenant public fields SHALL be readable by anonymous clients

The RLS select policy on `tenants` SHALL allow the anon role to read public-facing columns (`slug`, `name`, `timezone`, `default_locale`, `brand_color`) so the public booking flow MUST resolve a tenant by slug without authentication.

#### Scenario: anonymous tenant lookup
- **GIVEN** an anonymous client with the public anon key
- **WHEN** the client queries `select slug, name, timezone, default_locale, brand_color from tenants where slug = 'acme'`
- **THEN** the row is returned if the tenant exists
- **AND** sensitive columns (none in v1) are excluded by the policy

### Requirement: A new `auth.users` row SHALL spawn a `profiles` row automatically

A `handle_new_user` trigger on `auth.users` SHALL insert a matching `profiles` row keyed on the same id, populating `full_name` from OAuth metadata when present, so downstream tables MUST always find a profile to join against.

#### Scenario: first sign-in
- **GIVEN** a new user signs in via Google OAuth for the first time
- **WHEN** Supabase creates the `auth.users` row
- **THEN** the `handle_new_user` trigger fires
- **AND** a corresponding `profiles` row is created with `id = auth.users.id`
- **AND** `full_name` is populated from the OAuth metadata when present

### Requirement: Tenant creation SHALL go through `claim_slug`, not direct INSERT

RLS on `tenants` SHALL deny INSERT for all roles, and the `claim_slug` Edge Function (defined in `implement-tenant-onboarding`) MUST be the only path that creates a tenant + matching `owner` membership atomically.

#### Scenario: direct insert attempt
- **GIVEN** an authenticated user
- **WHEN** the user's client attempts `insert into tenants(slug, name, ...) values (...)`
- **THEN** the policy denies the insert
- **AND** the only path to tenant creation is the `claim_slug` Edge Function (defined in the `implement-tenant-onboarding` change)

### Requirement: A signed-in user SHALL be able to claim an available slug and become its owner

The `claim-slug` Edge Function SHALL atomically insert a `tenants` row and an `owner` `memberships` row for the caller; collisions with an existing tenant MUST return `slug_taken` and reserved-list hits MUST return `slug_reserved` (HTTP 409 in both cases).

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

A `check_slug_availability` RPC SHALL return `{ available, reason? }` for any candidate slug without side effects, and the response time MUST be under 500ms at p95 to keep the typing UI snappy.

#### Scenario: live check during typing
- **GIVEN** a user typing `acme` in the slug field
- **WHEN** the input debounces and an availability RPC is called
- **THEN** the response is `{ available: true }` if the slug is free
- **AND** `{ available: false, reason: 'taken' | 'reserved' }` otherwise
- **AND** the response time is under 500ms at p95

### Requirement: Invitations SHALL accept both existing and new users

The `invite-member` Edge Function SHALL insert a `memberships` row directly when the invitee already has an `auth.users` row, otherwise it MUST send a Supabase Auth invitation email and queue a `pending_memberships` row that the `handle_new_user` trigger promotes on first sign-in.

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

The boot router SHALL inspect the user's `memberships` count: zero with no claimed bookings routes to `(onboarding)/welcome`, one auto-selects that tenant, and two-or-more MUST surface the tenant picker modal that persists the choice in `AsyncStorage['app.tenantId']`.

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

