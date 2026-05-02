# Design

## Context

One app, two modes. The mode is determined by `currentRole` from `tenantStore`. We deliberately don't ship a desktop admin in v1 — every admin task fits comfortably on a phone for the kinds of tenants we're targeting (small businesses).

## Goals

- An admin's daily flow ("see today, mark people as done, occasional cancel") takes <30 seconds.
- The customer-mode home is the simplest possible view: their next appointment + a way to browse tenants they've booked with.
- Adding/editing services takes <60 seconds.

## Non-Goals

- Desktop / tablet layouts (the same mobile screen renders on iPad — we don't optimize for it).
- Bulk operations (cancel many at once, reassign staff, etc.) — defer.
- Charts / analytics beyond simple stats — defer.
- Multi-staff scheduling — staff resources is a deferred capability.

## Decisions

1. **Two route groups: `(admin)` and `(app)` for customer**. Neat separation, makes routing logic simple. Boot picks one based on role.
2. **Today screen is timeline + stats**, not a calendar grid. A grid wastes screen space at the staff workstation. A vertical list of today's bookings, top to bottom, is what's actually scanned.
3. **Status actions live on appointment detail, not in the list**. Inline action buttons on every list row are visually noisy; the detail screen has room.
4. **Service CRUD is its own tab**, not buried in settings. Tenants edit services more often than tenant settings.
5. **Tenant settings lives at the bottom of the admin tab bar**. Following platform conventions.
6. **Customer "Home" surfaces tenants they've booked with**. Until we build a tenant directory (deferred), this is how customers re-find tenants. Pulled from `select distinct tenant_id from appointments where user_id = auth.uid()`.
7. **The audit log on appointment detail is collapsible**. Default-collapsed. Useful for staff to investigate "what happened?" without dominating the screen.
8. **No "delete service"**. Services are deactivated (`active = false`), not deleted, because past appointments reference them. The service edit screen has a "Deactivate" toggle; truly destructive deletion is not exposed.
