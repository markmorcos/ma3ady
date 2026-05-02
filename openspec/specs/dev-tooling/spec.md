# dev-tooling Specification

## Purpose
TBD - created by archiving change setup-monorepo-and-tooling. Update Purpose after archive.
## Requirements
### Requirement: The repository SHALL be a pnpm workspace with a single root package

The repository SHALL use pnpm as its package manager and declare a single-root workspace. No `packages/` subprojects exist in v1; the workspace is reserved for future shared packages.

#### Scenario: pnpm install
- **GIVEN** a fresh clone of the repo
- **WHEN** a developer runs `pnpm install`
- **THEN** all dependencies install without warnings or peer-dependency errors
- **AND** `node_modules` is created at the workspace root only, not inside `app/` or `src/`

### Requirement: Daily commands SHALL be exposed via `make` targets

Every recurring developer command — install, local stack lifecycle, migrations, Expo start, EAS builds, lint/typecheck/test — SHALL have a named `make` target. Running `make` with no arguments MUST print a help index of every annotated target.

#### Scenario: discoverable help
- **GIVEN** a developer runs `make` with no arguments
- **THEN** the output lists every annotated target with its description
- **AND** at minimum the targets `install, dev-up, dev-down, migrate-new, migrate-up, seed, expo-start, expo-start-dev-client, build-dev-ios, build-dev-android, build-preview, build-prod, lint, typecheck, test, test-coverage` are present

#### Scenario: build-prod confirmation
- **GIVEN** a developer runs `make build-prod`
- **WHEN** the target executes
- **THEN** an interactive `read -p` prompt asks for explicit confirmation before invoking `eas build --profile production`
- **AND** declining the prompt aborts the build with a non-zero exit code

### Requirement: TypeScript paths SHALL alias `@/` to `src/`

The TypeScript config and Metro bundler SHALL both resolve `@/<path>` to `src/<path>`. No other path aliases exist; relative deep imports (`../../`) MUST be discouraged via lint rules.

#### Scenario: import using alias
- **GIVEN** a file in `app/index.tsx`
- **WHEN** it imports `import { Button } from '@/components/Button'`
- **THEN** TypeScript resolves the path to `src/components/Button`
- **AND** Metro bundler resolves the same path at runtime

### Requirement: Husky pre-commit hook SHALL block broken commits

A Husky `pre-commit` hook SHALL run `pnpm lint:fix && pnpm typecheck` on every commit. The commit MUST be rejected when either step fails.

#### Scenario: failing typecheck
- **GIVEN** a staged change that introduces a TypeScript error
- **WHEN** the developer runs `git commit`
- **THEN** the pre-commit hook runs `pnpm typecheck`
- **AND** the commit is rejected with a non-zero exit code
- **AND** the staged changes remain in the index

### Requirement: A `/dev/*` debug surface SHALL exist gated by an env flag

The app SHALL expose a `/dev/*` route group reachable only when `EXPO_PUBLIC_SHOW_DEV_TOOLS === '1'`. The index MUST list dev utilities (database inspector, design-system showcase, locale switcher); concrete implementations land in later changes.

#### Scenario: dev tools hidden by default
- **GIVEN** `EXPO_PUBLIC_SHOW_DEV_TOOLS` is unset or not equal to `'1'`
- **WHEN** the app boots
- **THEN** the `/dev/*` routes return 404 / "not found"

#### Scenario: dev tools visible when enabled
- **GIVEN** `EXPO_PUBLIC_SHOW_DEV_TOOLS='1'` in the environment
- **WHEN** a developer navigates to `/dev`
- **THEN** an index of dev utilities is displayed (database inspector, design-system showcase, locale switcher) — implementations land in later changes

### Requirement: Production EAS profile SHALL assert real dispatchers

The `production` profile in `eas.json` SHALL run a prebuild script that fails the build if any `EXPO_PUBLIC_*_DISPATCHER` env var is not set to `real`. This MUST prevent accidentally shipping a production build wired to mock notification surfaces.

#### Scenario: dispatcher mismatch on production build
- **GIVEN** an `eas build --profile production` invocation
- **WHEN** any `EXPO_PUBLIC_*_DISPATCHER` env is not `real`
- **THEN** the build fails before bundling with a clear error message naming the offending variable

### Requirement: All project secrets SHALL flow from a single master file

Every project secret SHALL be declared in `secrets/secrets.example.toml` (committed schema) and populated in `secrets/secrets.local.toml` (gitignored master). The example file MUST document each key with an inline comment and MUST NOT contain a non-empty value for any credential-shaped key.

#### Scenario: master file is gitignored
- **GIVEN** the repo
- **WHEN** `git check-ignore secrets/secrets.local.toml` runs
- **THEN** the file is reported as ignored
- **AND** `secrets/secrets.example.toml` is NOT ignored

#### Scenario: example file documents the schema
- **GIVEN** `secrets/secrets.example.toml`
- **WHEN** inspected
- **THEN** every required key is present with an empty (or default) value
- **AND** every key has an inline comment explaining its purpose
- **AND** no key has a non-empty value that looks like a credential (validated by the `validate.ts` script)

### Requirement: Validation SHALL catch missing keys before any sync runs

`make secrets-validate` SHALL parse the master file, compare it to the example schema, and exit non-zero if any required key is missing, empty, or extra. No destination MUST be touched when validation fails.

#### Scenario: missing key in master
- **GIVEN** a `secrets.local.toml` that omits `[github].EXPO_TOKEN`
- **WHEN** `make secrets-validate` runs
- **THEN** the script exits with status 1
- **AND** the error message names `github.EXPO_TOKEN` as missing

#### Scenario: extra key in master
- **GIVEN** a `secrets.local.toml` that defines a key not in the example
- **WHEN** `make secrets-validate` runs
- **THEN** the script reports the extra key as a warning
- **AND** still exits non-zero (master must match schema exactly)

### Requirement: Sync targets SHALL fan out to all destinations

`make secrets-sync ENV=<env>` SHALL push every section of the master to its corresponding destination — `[github]` to GitHub Actions via `gh`, `[supabase.<env>]` to the matching Supabase project via `supabase`, `[eas.<env>]` to EAS via `eas`. The aggregate command MUST exit zero only if all sub-commands succeed.

#### Scenario: full sync
- **GIVEN** a populated, valid `secrets.local.toml`
- **WHEN** `make secrets-sync ENV=preview` runs
- **THEN** every `[github]` key is set via `gh secret set`
- **AND** every `[supabase.preview]` key is set via `supabase secrets set --project-ref $PREVIEW_REF`
- **AND** every `[eas.preview]` key is set via `eas env:create` (or `secret:create`) with `--force`
- **AND** the command exits 0 only if all three sub-commands succeed

#### Scenario: per-destination sync
- **WHEN** `make secrets-sync-supabase ENV=production` runs
- **THEN** only the Supabase production project receives updates
- **AND** GitHub and EAS are untouched

### Requirement: Audit SHALL report drift between master and destinations read-only

`make secrets-audit` SHALL list secrets from each destination and report drift — keys present in master but missing from a destination, and keys in a destination not declared in master. The audit MUST never mutate any destination.

#### Scenario: drift detection
- **GIVEN** a master file with `RESEND_API_KEY = "abc"`
- **AND** the Supabase preview project has `RESEND_API_KEY = "xyz"`
- **WHEN** `make secrets-audit` runs
- **THEN** the output reports `[supabase.preview].RESEND_API_KEY: drift (master != deployed)`
- **AND** no destination is mutated

#### Scenario: extra in destination
- **GIVEN** Supabase preview has `OLD_KEY = "..."` not present in the master
- **WHEN** `make secrets-audit` runs
- **THEN** the output reports `[supabase.preview].OLD_KEY: EXTRA (in deployment, not in master)`

### Requirement: CI SHALL enforce schema-drift detection on every PR

The CI workflow SHALL run `scripts/secrets/validate.ts` against `secrets/secrets.example.toml` on every pull request. The job MUST fail the PR if the example contains a non-empty credential-shaped value, is missing a required top-level section, or declares a wrong `schema_version`.

#### Scenario: example file becomes invalid
- **GIVEN** a PR that adds `[github].NEW_KEY` to `secrets.example.toml` without a comment or with an example value
- **WHEN** the CI `validate-secrets-schema` job runs
- **THEN** the validation fails with a clear message
- **AND** the PR cannot merge until the example file is corrected

### Requirement: Sync SHALL not run if validation fails

The Makefile sync targets SHALL depend on `secrets-validate` and MUST abort before invoking `gh`, `supabase`, or `eas` if validation fails — guaranteeing no destination is partially updated.

#### Scenario: validate-then-sync ordering
- **GIVEN** a master file missing a required key
- **WHEN** `make secrets-sync ENV=preview` runs
- **THEN** validation runs first
- **AND** validation failure aborts the workflow before any `gh`/`supabase`/`eas` command is invoked
- **AND** no destination is partially updated

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

