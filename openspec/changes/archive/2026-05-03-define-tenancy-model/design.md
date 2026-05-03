# Design

## Context

Tenants are the unit of isolation. Every record in the system either belongs to a tenant or is global (auth users, profiles, reserved slugs). RLS is the enforcement boundary; the application code can be wrong about filters and the database still keeps tenants apart.

## Goals

- Tenants distinguished by a stable `slug` matching subdomain naming rules.
- Memberships cleanly model "this user has role X in tenant Y".
- A user can belong to multiple tenants with potentially different roles.
- Reserved slugs cannot be claimed (operational subdomains).
- RLS policies are the single source of truth for "who can read/write what."

## Non-Goals

- Tenant onboarding UI (the `implement-tenant-onboarding` change).
- Slug renaming (out of scope; if needed, becomes a separate change with redirects).
- Hierarchical tenants (parent/child orgs).
- Tenant deletion / data export (the `setup-compliance-and-launch` change covers GDPR-driven deletion only).

## Decisions

1. **Slug regex `^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$`**. 3–32 chars, lowercase alphanumeric + dashes, can't start or end with a dash, can't be a single character. Tighter than the legacy regex; rejects edge cases that bite in DNS.
2. **`reserved_slugs` as a table, not a hardcoded check**. Operationally we'll add to it (e.g., reserve `enterprise` later for a marketing landing page). A table makes that a one-row insert; a check constraint would require a migration.
3. **`memberships` is the only place tenant-role lives**. We don't denormalize role onto `tenants.owner_id` — multiple owners are fine (`role='owner'` on multiple memberships). Simpler invariants.
4. **Profiles separate from `auth.users`**. Supabase recommends not modifying `auth.users`. `profiles` is our public mirror with app fields.
5. **`current_user_*` helper functions over inlined `auth.uid()` joins** in policies. Easier to read, easier to optimize (Postgres can mark them `stable` for caching during a single query).
6. **Public read of public tenant fields**. The booking flow needs the tenant subdomain to resolve a tenant before sign-in. Limited columns: `slug, name, timezone, default_locale, brand_color`. No `logo_url` in v1 (per `project.md` §1f — no storage layer).
7. **`insert` on tenants is policy-denied**. Tenant creation must go through the `claim_slug` Edge Function (the `implement-tenant-onboarding` change) which calls a SECURITY DEFINER function. This centralizes slug validation, reservation checks, and the membership creation in one transaction.
8. **No `owner_id` foreign key on `tenants`**. Ownership is via `memberships.role='owner'`. The "owner" of a tenant in `project.md` is whoever has the owner membership; a tenant can have multiple owners, and an owner can leave (someone else must promote first).
9. **Trigger on `auth.users` for profile creation**. Mirrors stminaconnect. Uses `security definer` and is owned by the `postgres` role.
