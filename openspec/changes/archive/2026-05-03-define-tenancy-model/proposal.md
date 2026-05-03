# Define tenancy model

## Why

Multi-tenancy is the core architectural concern. Every domain table created in subsequent changes carries `tenant_id` and references RLS policies established here. Doing this once, correctly, prevents an expensive retrofit later.

Per `project.md` §3, tenants are identified by `slug`, served at `<slug>.ma3ady.com`, and isolated by Postgres Row-Level Security — not by application-level filters.

## What Changes

- **ADDED** migration `tenancy.sql` introducing:
  - `tenants(id uuid pk, slug text unique not null, name text not null, timezone text not null, default_locale text not null, brand_color text, created_at, updated_at)` — no `logo_url` in v1 (no storage layer; see `project.md` §1f)
  - `slug ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$'` check
  - `tenant_role enum('owner','admin','staff','customer')`
  - `memberships(id, user_id, tenant_id, role, created_at, unique(user_id, tenant_id))`
  - `profiles(id pk references auth.users, full_name, locale, created_at)`
  - `reserved_slugs(slug text pk)` table seeded with the reserved list from `project.md` §3
  - RLS policies on all three tables
  - Helper functions: `current_user_is_member_of(tenant uuid)`, `current_user_role_in(tenant uuid)`, `tenant_id_from_slug(slug text)`
  - Trigger on `auth.users` insert → upsert into `profiles`
- **ADDED** `src/services/api/tenants.ts` — typed wrappers (`getTenantBySlug`, `getMyMemberships`, `claimSlug`)
- **ADDED** `src/state/tenantStore.ts` — current tenant + role + switching
- **ADDED** Postgres function `assert_slug_available(slug text)` raising on collision with `tenants.slug` or `reserved_slugs.slug`
- **ADDED** seed entry in `preview-seed.sql`: `tenants` row for `demo`

## Impact

- Affects `tenancy` capability (initial spec).
- Required by the `define-availability-rules`, `define-services-and-appointments`, `implement-tenant-onboarding`, `implement-public-booking-flow` and `implement-admin-mobile-dashboard` changes.
- No user-facing UI yet — tenant switching UI lands in the `implement-tenant-onboarding` change.
