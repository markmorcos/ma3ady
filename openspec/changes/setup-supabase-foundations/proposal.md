# Setup Supabase foundations

## Why

Every feature change after this one writes SQL migrations and / or Edge Functions. We need the Supabase project layout established once, with conventions for migrations, functions, seeds, and the local Docker stack.

## What Changes

- **ADDED** `supabase/config.toml` configured for local dev (`api.port = 54321`, `db.port = 54322`, `studio.port = 54323`, `auth.site_url`, mobile redirect URL placeholder)
- **ADDED** `supabase/.gitignore` ignoring `.branches/` and `.temp/`
- **ADDED** the initial migration `init` (created via `make migrate-new NAME=init` → `supabase/migrations/001_init.sql`) — initial extensions (`pgcrypto`, `btree_gist` for EXCLUDE constraints, `pg_cron` declared but enabled later in the `implement-notifications-pipeline` change)
- **ADDED** `supabase/seed.sql` — empty placeholder with conventions documented inline
- **ADDED** `supabase/preview-seed.sql` — placeholder with a single fixture tenant (slug `demo`)
- **ADDED** `supabase/functions/_shared/` directory convention (created in the `implement-notifications-pipeline` change with the first function; this change only documents it)
- **ADDED** `src/services/api/supabase.ts` — typed client factory with PKCE flow + SecureStore-backed session storage (mirrors stminaconnect)
- **ADDED** `src/state/authStore.ts` — zustand store skeleton (sign-in methods land in the `implement-google-oauth` change)
- **ADDED** Makefile target `migrate-new NAME=<slug>` implementation: finds the highest existing `<NNN>` prefix in `supabase/migrations/`, increments by 1, creates `<NNN+1>_<slug>.sql`. First-ever invocation produces `001_<slug>.sql`. Other Supabase targets (`dev-up`, `dev-down`, `migrate-up`, `seed`) come from the `setup-monorepo-and-tooling` change.
- **ADDED** `.env.example` entries: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, server-side `SUPABASE_SERVICE_ROLE_KEY`
- **ADDED** local-only `make seed` target convention: read service role key from `supabase status -o json | jq` and `psql` via the docker container

## Impact

- Affects `dev-tooling` capability (delta).
- Unblocks every schema change (the `define-tenancy-model`, `define-services-and-appointments` and `implement-notifications-pipeline` changes) and every Edge Function (the `implement-public-booking-flow` and `implement-notifications-pipeline` changes).
- No runtime behavior; this is plumbing.
