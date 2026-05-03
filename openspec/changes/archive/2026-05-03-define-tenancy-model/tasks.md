# Tasks

- [x] 1.1 `make migrate-new NAME=tenancy` → `supabase/migrations/002_tenancy.sql`
- [x] 1.2 In `002_tenancy.sql`, create `tenants` table with full schema and slug check constraint (`^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$`), locale check, brand_color hex check
- [x] 1.3 Create `tenant_role` enum: `owner | admin | staff | customer`
- [x] 1.4 Create `memberships` table with `unique (user_id, tenant_id)`
- [x] 1.5 Create `profiles` table referencing `auth.users(id)` on cascade — includes `display_timezone_override text` (carry-over from setup-app-shell 1.14). IANA-validity check at the DB level had to be relaxed to a regex shape check (`^[A-Za-z][A-Za-z0-9_+\-/]+$`); Postgres CHECK constraints can't reference `pg_timezone_names`. Real IANA validation lives at the API layer (admin settings UI feeds `COMMON_IANA_ZONES`).
- [x] 1.6 Create `reserved_slugs(slug primary key)` and seed it with the reserved list from `project.md` §3
- [x] 1.7 Trigger `handle_new_user()` on `auth.users` insert that inserts a `profiles` row with `id = new.id, full_name = coalesce(new.raw_user_meta_data->>'full_name', new.email)`
- [x] 1.8 Helper functions: `current_user_is_member_of(tenant uuid)`, `current_user_role_in(tenant uuid)`, `tenant_id_from_slug(slug text)`, `assert_slug_available(slug text)` (raises on invalid format / reserved / taken with appropriate SQLSTATEs)
- [x] 1.9 RLS enabled on `tenants`, `memberships`, `profiles`
- [x] 1.10 Policies on `tenants`: select-all (public read), insert denied (must go through `claim_slug` Edge Function later), update for owner/admin, delete for owner only
- [x] 1.11 Policies on `memberships`: select for self or tenant admin/owner; insert/update/delete restricted to owner/admin of the same tenant; granting `owner` requires existing owner
- [x] 1.12 Policies on `profiles`: select-self or shared-tenant; update-self only; insert denied at policy level (handled by `handle_new_user` trigger)
- [x] 1.13 `supabase/seed.sql` updated with the demo tenant (`demo`, `Europe/Berlin`, `en`, brand_color `#0F766E`). Note: original tasks.md said `preview-seed.sql` but `seed.sql` is the local-environment file (`supabase db reset` auto-loads it). `preview-seed.sql` is reserved for the preview cloud project, wired up in the deployment-pipelines change.
- [x] 1.14 Generated `src/types/database.ts` via `pnpm exec supabase gen types typescript --local`. Added `src/types/db.ts` with named aliases (`Tenant`, `TenantPublic`, `Membership`, `TenantRole`, etc.) so app code imports stable names rather than reaching into the generated nested shape.
- [x] 1.15 `src/services/api/tenants.ts` — `getTenantBySlug`, `getMyMemberships` (returns `TenantWithRole[]`), `claimSlug` stubbed (real impl in implement-tenant-onboarding)
- [x] 1.16 `src/state/tenantStore.ts` — zustand store with `tenants`, `currentTenantId`, `loading`, `refresh()`, `switchTenant(id)`, `reset()`. Persists `currentTenantId` to AsyncStorage `app.tenantId`. `useCurrentRole()` helper hook included.
- [x] 1.17 RLS policy tests at `supabase/tests/tenancy.test.sql`. Covers cross-tenant read isolation (alice can't see bob's tenant-y memberships when she's only customer there), cross-tenant write rejection, anon read access, `assert_slug_available` rejecting reserved/taken/malformed slugs. Run via `make test-db`. **All passing locally.**
- [x] 1.18 `make seed` populates the demo tenant — verified locally (`INSERT 0 1`).
