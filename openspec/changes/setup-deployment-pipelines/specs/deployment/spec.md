# deployment — Spec Delta

## ADDED Requirements

### Requirement: CI SHALL gate every PR with lint, typecheck, tests, and db-lint

#### Scenario: PR opened
- **GIVEN** a PR opened against `main`
- **WHEN** the CI workflow runs
- **THEN** the jobs `lint`, `typecheck`, `test`, and `db-lint` execute in parallel
- **AND** the PR cannot be merged until all four are green
- **AND** code coverage is reported in the PR comment

### Requirement: Marketing site deploys SHALL fire only on `marketing/` changes

#### Scenario: marketing change
- **GIVEN** a push to `main` that modifies a file under `marketing/`
- **WHEN** the workflow triggers
- **THEN** a Docker image tagged with the commit SHA is pushed to `ghcr.io/markmorcos/ma3ady-marketing`
- **AND** a `repository-dispatch` event is sent to `markmorcos/infrastructure` with `event-type: deploy-ma3ady-marketing` and the deployment.yaml as payload

#### Scenario: unrelated change
- **GIVEN** a push to `main` that modifies only `app/` files
- **WHEN** the workflow event is evaluated
- **THEN** the marketing deploy workflow does not run

### Requirement: Tenant-landing deploys SHALL mirror marketing

#### Scenario: tenant-landing change
- **GIVEN** a push to `main` that modifies a file under `tenant-landing/`
- **WHEN** the workflow runs
- **THEN** the image is pushed and infrastructure is dispatched analogously

### Requirement: Supabase deploy SHALL be sequential preview → production

#### Scenario: migrations or functions change
- **GIVEN** a push to `main` modifying `supabase/migrations/**` or `supabase/functions/**`
- **WHEN** the workflow runs
- **THEN** the `deploy-preview` job runs first, linking to the preview project ref and running `db push` then `functions deploy`
- **AND** the `deploy-production` job runs only after preview succeeds
- **AND** if preview fails, production does not run

### Requirement: Mobile builds SHALL be manual

#### Scenario: build trigger
- **GIVEN** a developer wants to build the mobile app
- **WHEN** they trigger `build-mobile.yml` via `gh workflow run`
- **THEN** they must specify `profile` (development | preview | production) and `platform` (ios | android | all)
- **AND** the workflow invokes `eas build --non-interactive --no-wait`
- **AND** there is no path that auto-triggers a mobile build on push

### Requirement: Production EAS profile SHALL assert real dispatcher env

#### Scenario: production build
- **GIVEN** an `eas build --profile production` invocation
- **WHEN** any of `EMAIL_DISPATCHER`, `WHATSAPP_DISPATCHER`, `PUSH_DISPATCHER` is not equal to `'real'`
- **THEN** the build fails before bundling with a clear error naming the offending variable
- **AND** the build does not produce an artifact

### Requirement: Secrets SHALL be environment-scoped

#### Scenario: preview job cannot read prod secrets
- **GIVEN** the GitHub Actions environment configuration
- **WHEN** the `deploy-preview` job runs
- **THEN** it has access to `SUPABASE_PROJECT_REF_PREVIEW` only
- **AND** it does NOT have access to `SUPABASE_PROJECT_REF_PROD` or production-only secrets

### Requirement: Email deliverability SHALL be configured before `EMAIL_DISPATCHER=real`

#### Scenario: SPF record present
- **GIVEN** the production domain `ma3ady.com`
- **WHEN** `dig TXT ma3ady.com +short` is run
- **THEN** the output includes a record matching `v=spf1 include:_spf.resend.com -all`

#### Scenario: DKIM record present
- **WHEN** `dig TXT resend._domainkey.ma3ady.com +short` is run
- **THEN** the output is the public key value Resend issued for the domain
- **AND** the Resend dashboard shows the domain as "Verified"

#### Scenario: DMARC record present
- **WHEN** `dig TXT _dmarc.ma3ady.com +short` is run
- **THEN** the output includes `v=DMARC1` with `p=quarantine` (or stricter) and a `rua` reporting address

#### Scenario: dispatcher flip is gated by verification
- **GIVEN** any of SPF, DKIM, or DMARC is missing or misconfigured
- **WHEN** `make dns-check` runs
- **THEN** the command exits non-zero with a list of missing/wrong records
- **AND** the runbook stipulates `EMAIL_DISPATCHER=real` must NOT be set in production until `make dns-check` passes
