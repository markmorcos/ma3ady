# tenant-landing

Next.js 15 (App Router) workspace that serves the public booking surface for
ma3ady. One image serves both `ma3ady.com` (production) and
`preview.ma3ady.com` (preview), with tenants resolved at runtime by the path
segment `/t/<slug>`.

## Run locally

```bash
# from repo root, with `make dev-up` already running
cd tenant-landing
SUPABASE_URL=http://127.0.0.1:54321 \
  SUPABASE_ANON_KEY=$(pnpm -C .. exec supabase status -o json | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s);process.stdout.write(j.PUBLISHABLE_KEY||j.ANON_KEY||"")})') \
  SUPABASE_SERVICE_ROLE_KEY=$(pnpm -C .. exec supabase status -o json | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s);process.stdout.write(j.SERVICE_ROLE_KEY||j.SECRET_KEY||"")})') \
  pnpm dev
```

Open http://localhost:3000/t/demo to see the seeded `demo` tenant. The
`make seed` target populates that row.

## Tests

```bash
pnpm jest --selectProjects tenant-landing
```

Covers slug validation, tenant cache behavior, locale resolution, and
en/ar parity. Page-level integration goes through the SQL test suite
(`make test-db`).

## Deployment

Two manifests, dispatched by `.github/workflows/deploy-tenant-landing.yml`:

- `deployment.preview.yaml` — `preview.ma3ady.com`, namespace `ma3ady-preview`
- `deployment.yaml`         — `ma3ady.com`,         namespace `ma3ady`

Both pull `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
from k8s Secrets named `supabase-url`, `supabase-anon-key`,
`supabase-service-role-key`. Use `scripts/k8s/apply-tenant-landing-secrets.sh`
to populate them per-environment.

The push to `main` deploys both: preview first, then production gated by
preview success. Manual runs via `gh workflow run deploy-ma3ady-landing.yml
-f target=preview|production|both` are also wired.

## Architecture

- `src/app/t/[slug]/page.tsx` — tenant landing (server component)
- `src/app/t/[slug]/book/` — service + slot picker, booking submit, confirm
- `src/app/manage/[token]/` — guest-token manage flow (cancel/reschedule)
- `src/lib/tenant.ts` — slug validation + tenant cache
- `src/lib/locale.ts` — i18n primitives (en/ar) shared with the mobile app
- `src/lib/supabase.ts` — anon + service-role clients (lazy)

`src/locales/{en,ar}.json` is parity-tested against itself; if the keys
diverge, the parity test fails. Keep these in sync with the mobile bundle
when the wording changes.
