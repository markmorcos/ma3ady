# Design

## Context

Once auth lands, users fall into one of three buckets after sign-in: zero memberships (need to onboard or were just a customer), one membership (auto-route), many (picker). Plus the team-invitation flow: owners need to add admins/staff to their tenant.

## Goals

- A new tenant owner can go from sign-in to "set up services" in under a minute.
- Slug availability is checked live as they type.
- Invitations work whether the invitee has signed up yet or not.
- Multi-tenant users get a clear picker.

## Non-Goals

- Custom domains per tenant beyond the subdomain (e.g., `bookings.acme.com`). Defer.
- Tenant team management UI beyond invitation (changing roles, removing members) — comes in the `implement-admin-mobile-dashboard` change (admin).
- Migration of an existing tenant's settings — N/A, fresh start.

## Decisions

1. **`pending_memberships` table**, not flagging on `memberships` rows or `auth.users` metadata. Simpler: pending invites are a different kind of thing (no user_id yet). The trigger promotes them on sign-up.
2. **Slug availability check is a separate cheap RPC**, not a side-effect of trying to claim. Decoupling check from action gives a snappier UX (typed feedback) and a cleaner failure mode (the actual claim might still race-fail — handled gracefully).
3. **Timezone pre-filled from device, never assumed**. The legacy app hardcoded `Europe/Berlin` and that bit us. Prompting for it on first set-up forces an explicit choice.
4. **Brand color is optional in onboarding**. Most tenants use the default ma3ady teal. Customizing is a "first impression" feature but not blocking — they can do it later in settings.
5. **Onboarding routes are their own group `(onboarding)`** so the boot logic can route there without unmounting the auth or tab stack. Mirrors stminaconnect.
6. **Auto-select on single membership**. Users with one tenant should never see a picker. Picker is friction.
7. **Invited-but-not-yet-signed-up users get a Supabase auth invite email**. They sign in via Google when they accept, the trigger promotes their pending membership. We don't ship a custom invitation acceptance UI — the existing sign-in flow is enough.
