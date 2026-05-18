# Deployment

How code reaches production. Every workflow lives in `.github/workflows/`.

## Components

| Surface         | Build                              | Deployer                                                 | URL                                                        |
| --------------- | ---------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| Marketing       | `marketing/Dockerfile`              | `deploy-marketing.yml` → infra repo dispatch             | `ma3ady.com`, `preview.ma3ady.com`                         |
| Web app         | `web/Dockerfile`                    | `deploy-web.yml` → infra repo dispatch                   | `app.ma3ady.com`, `preview-app.ma3ady.com`                 |
| Supabase DB     | migrations under `supabase/`        | `deploy-supabase.yml` (preview → production)             | Supabase project (preview, prod refs in env)               |
| Edge Functions  | `supabase/functions/<name>`         | same workflow                                            | `https://<ref>.supabase.co/functions/v1/<name>`            |
| Mobile          | `eas.json` profiles                 | `build-mobile.yml` (manual)                              | EAS build pipeline → TestFlight + Play Store               |

## CI

`ci.yml` runs on every PR and on push-to-main:

- `lint`, `typecheck`, `test` (Jest with coverage)
- `db-lint` boots a throwaway Postgres and applies every migration in order. Catches name-drift and SQL parse errors before they reach the cloud project.
- `validate-secrets-schema` ensures `secrets/secrets.example.toml` and `secrets/secrets.local.toml` agree.

A PR cannot merge until all four jobs pass.

## Marketing deploy

Push to `main` touching `marketing/**` triggers the workflow:

1. `deploy-preview` job — dispatches `marketing/deployment.preview.yaml` to `markmorcos/infrastructure` (host `preview.ma3ady.com`, namespace `ma3ady-preview`).
2. `deploy-production` job — runs only if preview succeeded; dispatches `marketing/deployment.yaml` (host `ma3ady.com`, namespace `ma3ady`).

Manual run: `gh workflow run deploy-marketing.yml -f target=preview|production|both`.

The marketing pods don't read Supabase secrets — they're a static / locale-aware content site only. The public booking surface and the rest of the product live on `app.ma3ady.com`.

### Rollback

Re-dispatch the previous SHA:

```bash
gh workflow run deploy-marketing.yml \
  --ref <previous-sha-or-tag> \
  -f target=production
```

If a bad deploy is already serving traffic, pin the image tag in the infra repo to the previous good SHA and apply that.

## Web app deploy

Push to `main` touching `app/**`, `src/**`, `assets/**`, `web/**`, `app.json`, `package.json`, `pnpm-lock.yaml`, or the babel/metro/tsconfig triggers `deploy-web.yml`:

1. `deploy-preview` job — dispatches `web/deployment.preview.yaml` (host `preview-app.ma3ady.com`, namespace `ma3ady-preview`).
2. `deploy-production` job — runs only if preview succeeded; dispatches `web/deployment.yaml` (host `app.ma3ady.com`, namespace `ma3ady`).

`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are baked into the static bundle at build time from the same k8s Secrets the rest of the stack uses (`supabase-url`, `supabase-anon-key`). Populate per-environment with:

```bash
./scripts/k8s/apply-marketing-secrets.sh production
./scripts/k8s/apply-marketing-secrets.sh preview
```

## Supabase deploy

Push to `main` touching `supabase/migrations/**` or `supabase/functions/**` runs `deploy-supabase.yml`:

1. `deploy-preview` — `make deploy-migrations PROJECT=preview` then `make deploy-functions PROJECT=preview`.
2. `deploy-production` — same, gated by preview success, with `PROJECT=prod`.

Both jobs inherit `SUPABASE_ACCESS_TOKEN` (repo-level — single PAT spans both projects) plus `SUPABASE_DB_PASSWORD` and `SUPABASE_PROJECT_REF`, both stored unsuffixed under the `preview` / `production` GitHub Environments so the same name resolves to the right value per job.

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
2. Add the namespace + base secrets to the infra cluster: `./scripts/k8s/apply-marketing-secrets.sh <env>`.
3. Push to `main`: the deploy workflows fire automatically.
4. Configure Cloudflare DNS per `docs/dns-setup.md` and run `make dns-check`.
5. In Resend dashboard, verify the domain (paste the DKIM key returned in step 4 if not auto-detected).
