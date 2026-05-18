# deployment spec delta

## ADDED Requirements

### Requirement: Web app deploys SHALL fire on changes to the shared source tree or `web/` artifacts

The `deploy-web` workflow's `paths:` filter SHALL match any push to `app/**`, `src/**`, `assets/**`, `web/**`, `app.json`, `package.json`, or `pnpm-lock.yaml`. The workflow MUST build a Docker image from `web/Dockerfile` tagged with the commit SHA, push it to `ghcr.io/markmorcos/ma3ady-web`, and `repository-dispatch` to `markmorcos/infrastructure` with the matching `web/deployment.yaml` and `web/deployment.preview.yaml` payloads.

#### Scenario: web-relevant change triggers the deploy
- **GIVEN** a push to `main` modifying a file under `app/**`, `src/**`, `assets/**`, `web/**`, or one of the listed root files
- **WHEN** the workflow event is evaluated
- **THEN** the `deploy-web` workflow runs
- **AND** a Docker image tagged with the commit SHA is pushed to `ghcr.io/markmorcos/ma3ady-web`
- **AND** a `repository-dispatch` event is sent to `markmorcos/infrastructure` with `event-type: deploy-ma3ady-web` and the deployment manifests as payload

#### Scenario: unrelated change skips the deploy
- **GIVEN** a push to `main` modifying only `tenant-landing/**`
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

#### Scenario: targeted manual run
- **GIVEN** a developer wants to redeploy only production
- **WHEN** they trigger `deploy-web.yml` with `target=production`
- **THEN** the production deploy runs without re-running the preview deploy

### Requirement: The web image SHALL be a static SPA served by nginx with a client-side route fallback

`web/Dockerfile` SHALL be a multi-stage build: stage one (`node:20-alpine`) runs `pnpm install --frozen-lockfile` and `pnpm expo export --platform web` producing `dist/`; stage two (`nginx:alpine`) serves `dist/` using `web/nginx.conf`. The nginx config MUST include the SPA fallback `try_files $uri $uri/ /index.html;` so deep-linked refresh resolves correctly, and MUST set baseline security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).

#### Scenario: deep-linked refresh resolves
- **GIVEN** an authenticated user on `https://app.ma3ady.com/admin/availability`
- **WHEN** they hit browser refresh
- **THEN** nginx serves `/index.html` (HTTP 200, not 404)
- **AND** the SPA hydrates onto `/admin/availability`

#### Scenario: security headers present
- **GIVEN** a response from the deployed web image
- **WHEN** the response headers are inspected
- **THEN** `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and a `Content-Security-Policy` header are present

### Requirement: The web image SHALL NOT carry the Supabase service-role key

The web image's runtime environment SHALL include only `EXPO_PUBLIC_*` variables (notably `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`) injected at build time. `SUPABASE_SERVICE_ROLE_KEY` MUST NOT be present in either the runtime container environment or the static bundle, since every web operation goes through the user's JWT and the same RLS policies as mobile.

#### Scenario: service-role key absent from the image
- **GIVEN** the production web image
- **WHEN** the container's environment is inspected
- **THEN** `SUPABASE_SERVICE_ROLE_KEY` is not set
- **AND** a grep across the static bundle in `dist/` finds no occurrence of the service-role key value

### Requirement: A PR-time web-export job SHALL block merges on metro-web bundling regressions

A `web-export` CI job SHALL run `pnpm expo export --platform web` on every PR that touches `app/**`, `src/**`, `assets/**`, `web/**`, `app.json`, `package.json`, or `pnpm-lock.yaml`. The PR MUST be blocked from merging until the job is green.

#### Scenario: a native-only import breaks the web bundle
- **GIVEN** a PR that adds `import * as SecureStore from 'expo-secure-store'` to a non-`.native.ts` file
- **WHEN** the `web-export` CI job runs
- **THEN** the build fails with a clear metro error
- **AND** the PR cannot be merged until the offending import is moved into a `.native.ts(x)` wrapper

### Requirement: Universal Link verification files SHALL be served from the web image

The web image SHALL serve `/.well-known/apple-app-site-association` (Content-Type `application/json`, no extension) and `/.well-known/assetlinks.json` from `web/public/.well-known/` so that iOS and Android can verify the association between `app.ma3ady.com` and the mobile app bundle / package.

#### Scenario: AASA fetched by iOS
- **GIVEN** an iOS device installing or refreshing the mobile app
- **WHEN** the OS fetches `https://app.ma3ady.com/.well-known/apple-app-site-association`
- **THEN** the response is HTTP 200 with `Content-Type: application/json`
- **AND** the JSON payload lists the `ma3ady` bundle identifier under `applinks.details`

#### Scenario: assetlinks fetched by Android
- **GIVEN** an Android device performing app-link verification
- **WHEN** the OS fetches `https://app.ma3ady.com/.well-known/assetlinks.json`
- **THEN** the response is HTTP 200 with `Content-Type: application/json`
- **AND** the JSON payload lists the `com.ma3ady` package and the production signing fingerprint
