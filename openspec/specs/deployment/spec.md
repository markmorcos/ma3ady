# deployment Specification

## Purpose
TBD - created by archiving change setup-deployment-pipelines. Update Purpose after archive.
## Requirements
### Requirement: CI SHALL gate every PR with lint, typecheck, tests, and db-lint

The CI workflow SHALL run `lint`, `typecheck`, `test`, and `db-lint` jobs in parallel on every PR against `main`, and merging MUST be blocked until all four jobs are green.

#### Scenario: PR opened
- **GIVEN** a PR opened against `main`
- **WHEN** the CI workflow runs
- **THEN** the jobs `lint`, `typecheck`, `test`, and `db-lint` execute in parallel
- **AND** the PR cannot be merged until all four are green
- **AND** code coverage is reported in the PR comment

### Requirement: Marketing site deploys SHALL fire only on `marketing/` changes

The marketing deploy workflow's `paths:` filter SHALL match only `marketing/**`, build a Docker image tagged with the commit SHA, push it to `ghcr.io/markmorcos/ma3ady-marketing`, and MUST then `repository-dispatch` to `markmorcos/infrastructure` with the `marketing/deployment.yaml` payload.

#### Scenario: marketing change
- **GIVEN** a push to `main` that modifies a file under `marketing/`
- **WHEN** the workflow triggers
- **THEN** a Docker image tagged with the commit SHA is pushed to `ghcr.io/markmorcos/ma3ady-marketing`
- **AND** a `repository-dispatch` event is sent to `markmorcos/infrastructure` with `event-type: deploy-ma3ady-marketing` and the deployment.yaml as payload

#### Scenario: unrelated change
- **GIVEN** a push to `main` that modifies only `app/` files
- **WHEN** the workflow event is evaluated
- **THEN** the marketing deploy workflow does not run

### Requirement: Web app deploys SHALL fire on changes to the shared source tree or `web/` artifacts

The `deploy-web` workflow's `paths:` filter SHALL match any push to `app/**`, `src/**`, `assets/**`, `web/**`, `app.json`, `package.json`, or `pnpm-lock.yaml`. The workflow MUST build a Docker image from `web/Dockerfile` tagged with the commit SHA, push it to `ghcr.io/markmorcos/ma3ady-web`, and `repository-dispatch` to `markmorcos/infrastructure` with `web/deployment.preview.yaml` and `web/deployment.yaml` payloads.

#### Scenario: web-relevant change triggers the deploy
- **GIVEN** a push to `main` modifying a file under `app/**`, `src/**`, `assets/**`, `web/**`, or one of the listed root files
- **WHEN** the workflow event is evaluated
- **THEN** the `deploy-web` workflow runs
- **AND** a Docker image tagged with the commit SHA is pushed to `ghcr.io/markmorcos/ma3ady-web`
- **AND** a `repository-dispatch` event is sent to `markmorcos/infrastructure` with the deployment manifest as payload

#### Scenario: unrelated change skips the deploy
- **GIVEN** a push to `main` modifying only `marketing/**`
- **WHEN** the workflow event is evaluated
- **THEN** the `deploy-web` workflow does not run

### Requirement: Web deploys SHALL be sequential preview → production

The `deploy-web` workflow SHALL deploy to `preview-app.ma3ady.com` (namespace `ma3ady-preview`) first; the production deploy to `app.ma3ady.com` (namespace `ma3ady`) MUST only execute if the preview deploy succeeds. Manual `workflow_dispatch` with a `target` input (`preview` | `production` | `both`) MUST also be supported.

#### Scenario: preview-then-production on push
- **GIVEN** a push to `main` that triggers `deploy-web`
- **WHEN** the workflow runs
- **THEN** the preview deploy runs first against `preview-app.ma3ady.com`
- **AND** the production deploy runs only after preview success
- **AND** if preview fails, production does not run

### Requirement: The web image SHALL be a static SPA served by nginx with a client-side route fallback

`web/Dockerfile` SHALL be a multi-stage build: stage one runs `pnpm install --frozen-lockfile` and `pnpm expo export --platform web` producing `dist/`; stage two (`nginx:alpine`) serves `dist/` using `web/nginx.conf`. The nginx config MUST include the SPA fallback `try_files $uri $uri/ /index.html;` so deep-linked refresh resolves correctly, and MUST set baseline security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).

#### Scenario: deep-linked refresh resolves
- **GIVEN** an authenticated user on `https://app.ma3ady.com/admin/availability`
- **WHEN** they hit browser refresh
- **THEN** nginx serves `/index.html` (HTTP 200, not 404)
- **AND** the SPA hydrates onto `/admin/availability`

### Requirement: The web image SHALL NOT carry the Supabase service-role key

The web image's runtime environment SHALL include only `EXPO_PUBLIC_*` variables (notably `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`) injected at build time. `SUPABASE_SERVICE_ROLE_KEY` MUST NOT be present in either the runtime container environment or the static bundle.

#### Scenario: service-role key absent
- **GIVEN** the production web image
- **WHEN** the container's environment is inspected
- **THEN** `SUPABASE_SERVICE_ROLE_KEY` is not set
- **AND** a grep across the static bundle in `dist/` finds no occurrence of the service-role key value

### Requirement: A PR-time web-export job SHALL block merges on metro-web bundling regressions

A `web-export-check` CI job SHALL run `pnpm expo export --platform web` on every PR that touches `app/**`, `src/**`, `assets/**`, `web/**`, `app.json`, `package.json`, `pnpm-lock.yaml`, or the babel/metro/tsconfig. The PR MUST be blocked from merging until the job is green.

#### Scenario: a native-only import breaks the web bundle
- **GIVEN** a PR that adds `import * as SecureStore from 'expo-secure-store'` to a non-`.native.ts` file
- **WHEN** the `web-export-check` CI job runs
- **THEN** the build fails with a clear metro error
- **AND** the PR cannot be merged until the offending import is moved into a `.native.ts(x)` wrapper

### Requirement: Supabase deploy SHALL be sequential preview → production

The Supabase deploy workflow SHALL run `deploy-preview` first (linking to `SUPABASE_PROJECT_REF_PREVIEW`, running `db push` then `functions deploy`), and `deploy-production` MUST only execute if the preview job succeeds.

#### Scenario: migrations or functions change
- **GIVEN** a push to `main` modifying `supabase/migrations/**` or `supabase/functions/**`
- **WHEN** the workflow runs
- **THEN** the `deploy-preview` job runs first, linking to the preview project ref and running `db push` then `functions deploy`
- **AND** the `deploy-production` job runs only after preview succeeds
- **AND** if preview fails, production does not run

### Requirement: Mobile builds SHALL be manual

The `build-mobile.yml` workflow SHALL be `workflow_dispatch`-only with `profile` (`development|preview|production`) and `platform` (`ios|android|all`) inputs invoking `eas build --non-interactive --no-wait`; no path triggers MUST auto-build the mobile app on push.

#### Scenario: build trigger
- **GIVEN** a developer wants to build the mobile app
- **WHEN** they trigger `build-mobile.yml` via `gh workflow run`
- **THEN** they must specify `profile` (development | preview | production) and `platform` (ios | android | all)
- **AND** the workflow invokes `eas build --non-interactive --no-wait`
- **AND** there is no path that auto-triggers a mobile build on push

### Requirement: Production EAS profile SHALL assert real dispatcher env

The production EAS prebuild script SHALL fail with a clear error naming the offending variable when any of `EMAIL_DISPATCHER`, `WHATSAPP_DISPATCHER`, or `PUSH_DISPATCHER` is not `'real'`, and no artifact MUST be produced when the assertion trips.

#### Scenario: production build
- **GIVEN** an `eas build --profile production` invocation
- **WHEN** any of `EMAIL_DISPATCHER`, `WHATSAPP_DISPATCHER`, `PUSH_DISPATCHER` is not equal to `'real'`
- **THEN** the build fails before bundling with a clear error naming the offending variable
- **AND** the build does not produce an artifact

### Requirement: Secrets SHALL be environment-scoped

GitHub Actions environments SHALL bind preview-only secrets (e.g. `SUPABASE_PROJECT_REF_PREVIEW`) to the `preview` environment and prod-only secrets to `production`, so a `deploy-preview` job MUST NOT have access to production secrets.

#### Scenario: preview job cannot read prod secrets
- **GIVEN** the GitHub Actions environment configuration
- **WHEN** the `deploy-preview` job runs
- **THEN** it has access to `SUPABASE_PROJECT_REF_PREVIEW` only
- **AND** it does NOT have access to `SUPABASE_PROJECT_REF_PROD` or production-only secrets

### Requirement: Email deliverability SHALL be configured before `EMAIL_DISPATCHER=real`

`make dns-check` SHALL `dig` for SPF (`v=spf1 include:_spf.resend.com -all`), DKIM (`resend._domainkey.ma3ady.com`), and DMARC (`v=DMARC1; p=quarantine` with `rua`); the runbook MUST forbid setting `EMAIL_DISPATCHER=real` in production until that command exits zero.

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

