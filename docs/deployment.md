# Deployment

How code reaches production. Every workflow lives in `.github/workflows/`.

## Components

| Surface         | Build                              | Deployer                                                 | URL                                                        |
| --------------- | ---------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| Tenant landing  | `tenant-landing/Dockerfile`        | `deploy-tenant-landing.yml` → infra repo dispatch        | `ma3ady.com`, `preview.ma3ady.com`                         |
| Supabase DB     | migrations under `supabase/`        | `deploy-supabase.yml` (preview → production)             | Supabase project (preview, prod refs in env)               |
| Edge Functions  | `supabase/functions/<name>`         | same workflow                                            | `https://<ref>.supabase.co/functions/v1/<name>`            |
| Mobile          | `eas.json` profiles                 | `build-mobile.yml` (manual)                              | EAS build pipeline → TestFlight + Play Store               |

## CI

`ci.yml` runs on every PR and on push-to-main:

- `lint`, `typecheck`, `test` (Jest with coverage)
- `db-lint` boots a throwaway Postgres and applies every migration in order. Catches name-drift and SQL parse errors before they reach the cloud project.
- `validate-secrets-schema` ensures `secrets/secrets.example.toml` and `secrets/secrets.local.toml` agree.

A PR cannot merge until all four jobs pass.

## Tenant-landing deploy

Push to `main` touching `tenant-landing/**` triggers the workflow:

1. `deploy-preview` job — dispatches `tenant-landing/deployment.preview.yaml` to `markmorcos/infrastructure` (host `preview.ma3ady.com`, namespace `ma3ady-preview`).
2. `deploy-production` job — runs only if preview succeeded; dispatches `tenant-landing/deployment.yaml` (host `ma3ady.com`, namespace `ma3ady`).

Manual run: `gh workflow run deploy-tenant-landing.yml -f target=preview|production|both`.

Both pods read the same Supabase URL/anon/service-role secrets from k8s Secrets named `supabase-url`, `supabase-anon-key`, `supabase-service-role-key`. Populate per-environment with:

```bash
./scripts/k8s/apply-tenant-landing-secrets.sh production
./scripts/k8s/apply-tenant-landing-secrets.sh preview
```

### Rollback

Re-dispatch the previous SHA:

```bash
gh workflow run deploy-tenant-landing.yml \
  --ref <previous-sha-or-tag> \
  -f target=production
```

If a bad deploy is already serving traffic, pin the image tag in the infra repo to the previous good SHA and apply that.

## Supabase deploy

Push to `main` touching `supabase/migrations/**` or `supabase/functions/**` runs `deploy-supabase.yml`:

1. `deploy-preview` — `make deploy-migrations PROJECT=preview` then `make deploy-functions PROJECT=preview`.
2. `deploy-production` — same, gated by preview success, with `PROJECT=prod`.

Both jobs inherit `SUPABASE_ACCESS_TOKEN` and the env-scoped `SUPABASE_DB_PASSWORD_*` secret via the `preview` / `production` GitHub environments.

### Rollback

- **Code**: revert the PR and let the next push redeploy.
- **Migrations**: never edit a deployed migration. Author a *compensating* migration that undoes the bad change, push, and let CI deploy preview → production.
- **Edge Functions**: redeploying an older `index.ts` reverts since each deploy is full-replace.

## Mobile build

Manual only: `gh workflow run build-mobile.yml -f profile=preview -f platform=ios` (or `production`, `all`).

The production profile runs `scripts/assert-real-dispatchers.js` as a `prebuildCommand`, so the build aborts unless `EXPO_PUBLIC_*_DISPATCHER` are all `real`.

### Rollback

- **JS-only**: ship an EAS Update reverting the offending commit.
- **Native**: bump the version in `app.json`, build, submit. There is no in-place native rollback — the previous binary remains on already-installed devices until they update.

## DNS

Cloudflare is the source of truth. See `docs/dns-setup.md` for the record list. After changes, run `make dns-check` to verify SPF / DKIM / DMARC. The runbook stipulates `EMAIL_DISPATCHER=real` MUST NOT be set in production until that command exits zero.

## Initial bootstrap (one-time, per env)

1. Provision the Supabase project; copy the project ref into `secrets/secrets.local.toml` and run `make secrets-sync ENV=<env>`.
2. Add the namespace + base secrets to the infra cluster: `./scripts/k8s/apply-tenant-landing-secrets.sh <env>`.
3. Push to `main`: the deploy workflows fire automatically.
4. Configure Cloudflare DNS per `docs/dns-setup.md` and run `make dns-check`.
5. In Resend dashboard, verify the domain (paste the DKIM key returned in step 4 if not auto-detected).
