# Define availability rules (rules-based, not pre-generated slots)

## Why

The legacy app pre-generated `availability_slot` rows. Per `project.md` §4 we replace that model: availability is described as recurring rules + one-off exceptions, and slots are computed on read. This makes schedule changes 1-row updates, eliminates the cleanup cron, and handles DST correctly.

## What Changes

- **ADDED** migration `002_availability.sql`:
  - `availability_rules(id, tenant_id, service_id nullable, day_of_week int 0–6, start_time time, end_time time, valid_from date nullable, valid_until date nullable, created_at)` — `service_id` null means "applies to every service for this tenant"
  - `availability_exceptions(id, tenant_id, service_id nullable, kind enum('block','extra'), starts_at timestamptz, ends_at timestamptz, reason text)`
  - Check: `end_time > start_time` on rules; `ends_at > starts_at` on exceptions
  - Index on `(tenant_id, day_of_week)` for rule lookup, on `(tenant_id, starts_at)` for exception lookup
  - RLS: read public for active tenants (booking flow needs it); write owner/admin only
- **ADDED** Postgres function `compute_available_slots(p_tenant_slug text, p_service_id uuid, p_range_start timestamptz, p_range_end timestamptz) returns table(starts_at timestamptz, ends_at timestamptz)`
  - Resolves tenant + timezone
  - Expands rules over the date range in tenant TZ
  - Subtracts `block` exceptions, adds `extra` exceptions
  - Tiles into `service.duration_minutes` slots respecting `buffer_before_min`, `buffer_after_min`, `min_notice_min`, `max_advance_days`
  - Subtracts existing non-cancelled appointments for the service
  - Applies `daily_cap` if set
- **NOTE**: depends on changes 05 (tenants) and 07 (services + appointments). This change creates rules + exceptions schema; the function body is finalized when 07 lands. Both can be in same migration if the `define-services-and-appointments` change is implemented immediately after.
- **ADDED** `src/services/api/availability.ts` — `getAvailableSlots({ tenantSlug, serviceId, from, to })` calls the RPC
- **ADDED** seed data in `preview-seed.sql`: a few rules for the demo tenant (Mon–Fri 09:00–17:00) and a sample block exception

## Impact

- Affects `availability` capability (initial spec).
- Required by changes 07 (appointments validation), 10 (booking flow), 12 (rules grid editor).
