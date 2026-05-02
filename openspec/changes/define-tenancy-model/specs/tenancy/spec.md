# tenancy — Spec Delta

## ADDED Requirements

### Requirement: Tenants SHALL be uniquely identified by a slug matching subdomain rules

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

#### Scenario: claiming a reserved slug
- **GIVEN** the reserved slug `admin` is present in `reserved_slugs`
- **WHEN** `assert_slug_available('admin')` is called
- **THEN** the function raises with message `"slug reserved"`

### Requirement: Tenants SHALL be isolated by Row-Level Security

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

#### Scenario: cross-tenant membership
- **GIVEN** user A holds `owner` membership in tenant X and `customer` membership in tenant Y
- **WHEN** A's client queries `select * from memberships`
- **THEN** both rows are returned
- **AND** RLS filtering does not collapse to a single row

### Requirement: Tenant public fields SHALL be readable by anonymous clients

#### Scenario: anonymous tenant lookup
- **GIVEN** an anonymous client with the public anon key
- **WHEN** the client queries `select slug, name, timezone, default_locale, brand_color from tenants where slug = 'acme'`
- **THEN** the row is returned if the tenant exists
- **AND** sensitive columns (none in v1) are excluded by the policy

### Requirement: A new `auth.users` row SHALL spawn a `profiles` row automatically

#### Scenario: first sign-in
- **GIVEN** a new user signs in via Google OAuth for the first time
- **WHEN** Supabase creates the `auth.users` row
- **THEN** the `handle_new_user` trigger fires
- **AND** a corresponding `profiles` row is created with `id = auth.users.id`
- **AND** `full_name` is populated from the OAuth metadata when present

### Requirement: Tenant creation SHALL go through `claim_slug`, not direct INSERT

#### Scenario: direct insert attempt
- **GIVEN** an authenticated user
- **WHEN** the user's client attempts `insert into tenants(slug, name, ...) values (...)`
- **THEN** the policy denies the insert
- **AND** the only path to tenant creation is the `claim_slug` Edge Function (defined in the `implement-tenant-onboarding` change)
