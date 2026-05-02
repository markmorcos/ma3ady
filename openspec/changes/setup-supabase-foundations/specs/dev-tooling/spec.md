# dev-tooling — Spec Delta

## ADDED Requirements

### Requirement: The Supabase project SHALL be self-bootstrapped via Makefile targets

#### Scenario: cold-start local stack
- **GIVEN** a developer with Docker running and `pnpm install` complete
- **WHEN** they run `make dev-up`
- **THEN** Supabase boots within 30 seconds
- **AND** `supabase status` reports `API`, `DB`, `Studio`, `Auth` as healthy
- **AND** the printed `API URL` and `anon key` can be pasted into `.env.local` to connect the mobile app

### Requirement: Migration files SHALL follow `NNN_snake_case.sql` naming

#### Scenario: creating a new migration
- **WHEN** a developer runs `make migrate-new NAME=add_appointments`
- **THEN** a file `supabase/migrations/NNN_add_appointments.sql` is created
- **AND** `NNN` is the next sequential 3-digit number after the latest existing migration

#### Scenario: rejected timestamp prefix
- **GIVEN** a PR that introduces `supabase/migrations/20260512_foo.sql`
- **WHEN** the lint step runs
- **THEN** the PR is rejected with a message referencing the convention

### Requirement: The Supabase client SHALL be configured once with PKCE + SecureStore

#### Scenario: client factory single-source
- **GIVEN** the codebase
- **WHEN** any file imports the Supabase client
- **THEN** it imports from `@/services/api/supabase`
- **AND** there is no other file that calls `createClient(...)`

#### Scenario: session persistence
- **GIVEN** a signed-in user closes and reopens the app
- **WHEN** the app boots and `authStore.refresh()` runs
- **THEN** the prior session is restored from SecureStore
- **AND** `supabase.auth.getSession()` returns a non-null session

### Requirement: Email/password and magic-link sign-up SHALL be disabled in `config.toml`

#### Scenario: blocked sign-up attempt
- **GIVEN** a curl call to `/auth/v1/signup` against the local Supabase
- **WHEN** the request is sent
- **THEN** the response is HTTP 400 or 422 with a "signups disabled" error

### Requirement: The service role key SHALL NEVER be present in the mobile bundle

#### Scenario: bundle inspection
- **GIVEN** an `eas build` output
- **WHEN** the bundle is grepped for the string `service_role`
- **THEN** zero matches are found
- **AND** `EXPO_PUBLIC_SUPABASE_ANON_KEY` is the only Supabase key bundled
