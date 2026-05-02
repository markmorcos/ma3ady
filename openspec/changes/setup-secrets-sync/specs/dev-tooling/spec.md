# dev-tooling — Spec Delta

## ADDED Requirements

### Requirement: All project secrets SHALL flow from a single master file

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

#### Scenario: example file becomes invalid
- **GIVEN** a PR that adds `[github].NEW_KEY` to `secrets.example.toml` without a comment or with an example value
- **WHEN** the CI `validate-secrets-schema` job runs
- **THEN** the validation fails with a clear message
- **AND** the PR cannot merge until the example file is corrected

### Requirement: Sync SHALL not run if validation fails

#### Scenario: validate-then-sync ordering
- **GIVEN** a master file missing a required key
- **WHEN** `make secrets-sync ENV=preview` runs
- **THEN** validation runs first
- **AND** validation failure aborts the workflow before any `gh`/`supabase`/`eas` command is invoked
- **AND** no destination is partially updated
