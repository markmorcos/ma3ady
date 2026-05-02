# Setup deployment pipelines

## Why

The repo and infrastructure exist; CI/CD wiring brings them together. Per `project.md` §8 and the deployment memory:

- Marketing + tenant-landing → Docker → GHCR → `repository-dispatch` to `markmorcos/infrastructure`
- Supabase → `supabase db push` + `supabase functions deploy` from GH Actions, two project refs (preview + production) sequentially
- Mobile → EAS Build, manual `workflow_dispatch` only

This change ships the GitHub Actions workflows, the connect-the-pipes work, **email deliverability DNS records** (SPF/DKIM/DMARC for Resend on `ma3ady.com`), and a CI workflow that lints, typechecks, and tests on every PR. Secret management itself lives in the `setup-secrets-sync` change — this change just consumes the resulting secrets.

## What Changes

- **ADDED** `.github/workflows/`:
  - `ci.yml` — runs on PRs and main pushes: lint, typecheck, jest tests with coverage, supabase db lint
  - `deploy-marketing.yml` — on push to `marketing/**`, builds image, pushes to GHCR, dispatches to infrastructure
  - `deploy-tenant-landing.yml` — same for `tenant-landing/**`
  - `deploy-supabase.yml` — on push to `supabase/migrations/**` or `supabase/functions/**`, runs preview deploy then prod deploy sequentially
  - `build-mobile.yml` — `workflow_dispatch` only, inputs `profile` and `platform`, runs `eas build`
- **ADDED** `eas.json` profile assertions matching `project.md` §2 (production requires real dispatchers)
- **CONSUMES** secrets populated by the `setup-secrets-sync` change (GitHub repo secrets, Supabase project secrets, EAS secrets)
- **ADDED** `docs/deployment.md` — runbook: how to do an initial deploy, how to roll back
- **ADDED** `docs/dns-setup.md` — runbook for Cloudflare DNS records:
  - `ma3ady.com` → infrastructure ingress (apex + `www` + `auth` + `*` wildcard)
  - **SPF**: `TXT @ "v=spf1 include:_spf.resend.com -all"`
  - **DKIM**: Resend-provided `TXT resend._domainkey ...` record
  - **DMARC**: `TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:dmarc@ma3ady.com; pct=100"`
  - Verification step: `dig TXT ma3ady.com` and Resend dashboard "verified" badge before going live
- **ADDED** Makefile targets: `deploy-functions PROJECT_REF=...` (placeholder calling out to supabase CLI), `db-diff` (helper for migration generation against preview), `dns-check` (runs `dig` against required records and reports status)

## Impact

- Affects `deployment` capability (initial spec).
- Required for production launch.
- No app behavior change.
