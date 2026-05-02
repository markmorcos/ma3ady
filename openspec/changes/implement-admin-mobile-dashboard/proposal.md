# Implement admin mobile dashboard

## Why

Per `project.md` §3 and the user's decision, ma3ady is mobile-first admin: one app, mode determined by the user's role in the active tenant. Owners, admins, and staff don't need a desktop — their daily flow (today's bookings, mark complete, mark no-show, occasional rule edits) fits a phone.

This change implements the admin home + appointment list + appointment detail with status actions. Service CRUD and rule grid are separate changes (12) for scope reasons.

## What Changes

- **ADDED** route group `app/(admin)/`:
  - `_layout.tsx` — admin tabs
  - `(tabs)/index.tsx` — Today: today's appointments timeline + quick stats (today count, week count, fill rate)
  - `(tabs)/upcoming.tsx` — upcoming appointments grouped by day
  - `(tabs)/services.tsx` — services CRUD list
  - `(tabs)/team.tsx` — team members + invite (uses `invite-member` from the `implement-tenant-onboarding` change)
  - `(tabs)/settings.tsx` — tenant settings (name, timezone, brand color, locale)
  - `appointment/[id].tsx` — detail with status actions: confirm, cancel, complete, mark no-show
  - `service/[id].tsx` — service edit form
  - `service/new.tsx` — service create form
- **MODIFIED** `app/_layout.tsx` boot routing: when `currentRole in ('owner', 'admin', 'staff')`, route to `(admin)`; when `customer`, route to `(app)/(tabs)` (customer mode)
- **ADDED** Edge Function `update-appointment-status/`:
  - Verifies caller is staff+ of the appointment's tenant
  - Validates state transition (defined in the `implement-reschedule-and-cancel` change's state machine)
  - Updates status; trigger writes audit
- **ADDED** `src/services/api/admin.ts` — `getTodayAppointments`, `getUpcomingAppointments`, `updateAppointmentStatus`, `getTenantStats`
- **ADDED** `src/features/admin/AppointmentTimeline.tsx`, `StatsCard.tsx`, `ServiceForm.tsx`, `TeamMemberRow.tsx`

## Impact

- Affects `admin` capability (initial spec).
- Sets the stage for the `implement-availability-rules-grid` change (rules grid editor inside admin) and the `implement-reschedule-and-cancel` change (reschedule/cancel which reuses the status state machine).
- Customer (mode `customer` or unauthenticated guest) uses a separate `(app)/(tabs)` group which lands in this change as the customer home (My bookings list).
