# Implement tenant onboarding

## Why

After Google OAuth lands (the `implement-google-oauth` change), a signed-in user with no tenant memberships needs a path to either join an existing tenant (invitation) or create one. This change implements the "claim a slug, become owner" flow plus the tenant picker for users who belong to multiple tenants.

## What Changes

- **ADDED** Edge Function `claim-slug/`:
  - Input: `{ slug, name, timezone, default_locale, brand_color? }`
  - Validates slug via `assert_slug_available`
  - Inserts `tenants` row, inserts `memberships` row with `role='owner'` for the caller
  - Returns the new tenant
- **ADDED** Edge Function `invite-member/`:
  - Owner/admin-only
  - Input: `{ email, role }`
  - If user exists → insert `memberships` row directly
  - If not → call `supabase.auth.admin.inviteUserByEmail(email)` then insert pending membership row keyed by email (table `pending_memberships(tenant_id, email, role)`); upgraded to a real `memberships` row on the user's first sign-in via `claim-bookings` trigger
- **ADDED** migration `pending_memberships.sql` with the table + a trigger on `auth.users` insert that promotes pending rows to memberships when emails match
- **ADDED** screens:
  - `app/(onboarding)/_layout.tsx`
  - `app/(onboarding)/welcome.tsx` — "Sign up your business / Join an existing one"
  - `app/(onboarding)/claim-slug.tsx` — slug input with availability check (debounced RPC), name, timezone (pre-filled from device), locale, optional brand color picker
  - `app/(onboarding)/joined.tsx` — confirmation
- **ADDED** `app/(app)/tenants/picker.tsx` — modal tenant picker for users with multiple memberships
- **MODIFIED** `src/state/tenantStore.ts` — adds `createTenant` and `selectTenant` actions
- **MODIFIED** `app/_layout.tsx` boot sequence — after auth, if no `currentTenantId`: if user has 0 memberships → onboarding; if 1 → auto-select; if >1 → picker modal

## Impact

- Affects `tenancy` capability (delta).
- Required by changes 11 (admin) and 12 (rules grid) — admins need a tenant.
- Builds on 08 (auth) and 05 (tenancy schema).
