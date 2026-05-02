# Design

## Context

We mirror stminaconnect's Supabase layout exactly so muscle memory transfers. Two deviations: Google OAuth is enabled (stminaconnect uses magic link only), and we plan for `pg_cron` from day one (used in the `implement-notifications-pipeline` change for reminder emails).

## Goals

- Local Supabase boots in one command (`make dev-up`).
- Migration file naming is enforced by convention — sequential numeric prefix, `snake_case`, no timestamps.
- The Supabase JS client is configured once in `src/services/api/supabase.ts`; nothing else creates clients.
- Auth state lives in a single zustand store; everything else reads from it.

## Non-Goals

- Implementing Google OAuth (the `implement-google-oauth` change).
- Defining domain tables (the `define-tenancy-model` and `define-services-and-appointments` changes).
- Writing Edge Functions (the `implement-notifications-pipeline` change introduces the first one).
- Configuring Supabase secrets in production (the `setup-deployment-pipelines` change).

## Decisions

1. **Sequential migration numbers, no timestamps**. stminaconnect convention. Easier to read in a list, prevents merge conflicts where two devs both add `20260512_*.sql`. Trade-off: requires coordination on PRs. Acceptable for a small team.
2. **`btree_gist` extension up front**. Required for the EXCLUDE constraint on appointments (the `define-services-and-appointments` change). Cheap to enable now.
3. **`auth.site_url = "ma3ady://"`**. The mobile app is the only auth consumer. We don't expose web sign-in. The `auth.ma3ady.com/callback` redirect URI gets added in the `implement-google-oauth` change once Google OAuth is wired.
4. **Email/password and magic link disabled**. The only sign-in path will be Google OAuth. Locking it down here prevents accidental re-enabling.
5. **`auth` capability and the `authStore` are seeded here as skeletons**. Real sign-in methods land in the `implement-google-oauth` change. Reason: the `define-tenancy-model` and `define-services-and-appointments` changes reference RLS policies that depend on `auth.uid()`, and we want a clear story even before sign-in works.
6. **Service role key never bundled**. `supabase status -o json | jq` reads it locally for `make seed`; production reads it from `supabase secrets`. Mobile app gets only the anon key.
