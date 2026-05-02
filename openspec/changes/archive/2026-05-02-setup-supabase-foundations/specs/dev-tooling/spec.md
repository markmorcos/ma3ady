# dev-tooling — Spec Delta

## ADDED Requirements

### Requirement: The Supabase project SHALL be self-bootstrapped via Makefile targets

`make dev-up` SHALL boot the local Supabase stack (Docker) and report API/DB/Studio/Auth as healthy within 30 seconds, and the printed `API URL` + `anon key` MUST be sufficient to wire the mobile app's `.env.local`.

#### Scenario: cold-start local stack
- **GIVEN** a developer with Docker running and `pnpm install` complete
- **WHEN** they run `make dev-up`
- **THEN** Supabase boots within 30 seconds
- **AND** `supabase status` reports `API`, `DB`, `Studio`, `Auth` as healthy
- **AND** the printed `API URL` and `anon key` can be pasted into `.env.local` to connect the mobile app

### Requirement: Migration filenames SHALL be auto-numbered with a 3-digit prefix

`make migrate-new NAME=<slug>` SHALL create `supabase/migrations/<NNN>_<slug>.sql` where `NNN` is the next 3-digit prefix (computed by listing existing `^[0-9]{3}_` files, sorting, and incrementing the last); CI `db-lint` MUST reject any timestamp-prefixed migration that bypasses the helper.

#### Scenario: first migration in a fresh repo
- **GIVEN** an empty `supabase/migrations/` directory
- **WHEN** a developer runs `make migrate-new NAME=init`
- **THEN** the file `supabase/migrations/001_init.sql` is created
- **AND** `make migrate-new` exits 0 and prints the path

#### Scenario: subsequent migration
- **GIVEN** the highest existing migration is `007_pg_cron_setup.sql`
- **WHEN** a developer runs `make migrate-new NAME=client_errors`
- **THEN** the file `supabase/migrations/008_client_errors.sql` is created
- **AND** the prefix is computed by listing `^[0-9]{3}_` files, sorting, taking the last, parsing the integer, and incrementing — never by counting files (gaps from rare deletions are preserved)

#### Scenario: NAME validation
- **GIVEN** `make migrate-new` invoked without `NAME=` or with an invalid slug (uppercase, spaces, leading/trailing dash)
- **WHEN** the target runs
- **THEN** it exits non-zero with a message describing the expected `^[a-z][a-z0-9_]*$` pattern
- **AND** no file is created

#### Scenario: rejected timestamp prefix
- **GIVEN** a PR that introduces `supabase/migrations/20260512_foo.sql`
- **WHEN** the CI `db-lint` step runs
- **THEN** the PR is rejected with a message referencing the `<NNN>_<slug>.sql` convention
- **AND** the developer is directed to use `make migrate-new` to regenerate the filename

#### Scenario: number collision on parallel PRs
- **GIVEN** two open PRs each adding `008_<slug>.sql`
- **WHEN** the second PR is being rebased after the first merges
- **THEN** the rebase is expected to surface the conflict
- **AND** the developer re-runs `make migrate-new NAME=<their-slug>` to claim `009`
- **AND** the conflict resolves cleanly (one rename, no SQL change)

### Requirement: The Supabase client SHALL be configured once with PKCE + SecureStore

`@/services/api/supabase` SHALL be the single `createClient(...)` call in the codebase, wired with PKCE flow and SecureStore-backed session storage so prior sessions MUST be restored on cold start.

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

`supabase/config.toml` SHALL set `enable_signup = false` for the email provider so any attempt at `/auth/v1/signup` MUST receive HTTP 400/422 with "signups disabled".

#### Scenario: blocked sign-up attempt
- **GIVEN** a curl call to `/auth/v1/signup` against the local Supabase
- **WHEN** the request is sent
- **THEN** the response is HTTP 400 or 422 with a "signups disabled" error

### Requirement: The service role key SHALL NEVER be present in the mobile bundle

`EXPO_PUBLIC_SUPABASE_ANON_KEY` SHALL be the only Supabase key referenced from mobile code, and a grep of any `eas build` artifact for the literal `service_role` MUST return zero matches.

#### Scenario: bundle inspection
- **GIVEN** an `eas build` output
- **WHEN** the bundle is grepped for the string `service_role`
- **THEN** zero matches are found
- **AND** `EXPO_PUBLIC_SUPABASE_ANON_KEY` is the only Supabase key bundled
