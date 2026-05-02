# Setup deployment pipelines

## Why

The repo and infrastructure exist; CI/CD wiring brings them together. Per `project.md` §8 and the deployment memory:

- Marketing + tenant-landing → Docker → GHCR → `repository-dispatch` to `markmorcos/infrastructure`
- Supabase → `supabase db push` + `supabase functions deploy` from GH Actions, two project refs (preview + production) sequentially
- Mobile → EAS Build, manual `workflow_dispatch` only

This change ships the GitHub Actions workflows, secret declarations, and the connect-the-pipes work. It also includes a CI workflow that lints, typechecks, and tests on every PR.

## What Changes

- **ADDED** `.github/workflows/`:
  - `ci.yml` — runs on PRs and main pushes: lint, typecheck, jest tests with coverage, supabase db lint
  - `deploy-marketing.yml` — on push to `marketing/**`, builds image, pushes to GHCR, dispatches to infrastructure
  - `deploy-tenant-landing.yml` — same for `tenant-landing/**`
  - `deploy-supabase.yml` — on push to `supabase/migrations/**` or `supabase/functions/**`, runs preview deploy then prod deploy sequentially
  - `build-mobile.yml` — `workflow_dispatch` only, inputs `profile` and `platform`, runs `eas build`
- **ADDED** `eas.json` profile assertions matching `project.md` §2 (production requires real dispatchers)
- **ADDED** secrets declaration (in repo settings, documented in `docs/secrets.md`):
  - GitHub: `INFRASTRUCTURE_DISPATCH_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF_PREVIEW`, `SUPABASE_PROJECT_REF_PROD`, `SUPABASE_DB_PASSWORD`, `EXPO_TOKEN`
  - Supabase: per-project secrets via `supabase secrets set` for `RESEND_API_KEY`, `WHATSAPP_*`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **ADDED** `docs/deployment.md` — runbook: how to do an initial deploy, how to roll back, how to rotate secrets
- **ADDED** `docs/secrets.md` — secret inventory + rotation procedure
- **ADDED** `Makefile` targets: `deploy-functions PROJECT_REF=...` (placeholder calling out to supabase CLI), `db-diff` (helper for migration generation against preview)

## Impact

- Affects `deployment` capability (initial spec).
- Required for production launch.
- No app behavior change.
