# Design

## Context

Editing weekly availability on a phone is a UX challenge. A literal week-grid (columns = days, rows = hours) doesn't fit. We adopt a vertical list of days with time bands per day — closer to how iOS Calendar's "working hours" interface looks. Power moves: copy a day's bands to other days; add exceptions inline.

## Goals

- A new tenant can set Mon–Fri 09:00–17:00 in <30 seconds (one CTA pre-fills the template).
- Bands inside a day are visually clear and easy to edit.
- Exceptions are first-class but live below the weekly section to keep them out of the way.
- Edits are atomic — partial saves don't leave the schedule in a weird state.

## Non-Goals

- Per-service rule overrides (deferred — most v1 tenants don't need it; service-level constraints are mostly captured via `min_notice_min` etc.).
- Multi-week or seasonal schedules (use date-bound rules with `valid_from`/`valid_until` for that — UI for it is deferred).
- Drag-to-resize bands on the same screen (deferred; tap-to-edit covers it).

## Decisions

1. **Bulk replace over per-rule mutation**. The mental model is "this is what Mondays look like." Letting users edit individual `availability_rules` rows leaks the database model into the UX. The `bulk_replace_rules_for_day` RPC takes the desired state and reconciles atomically.
2. **Time bands are stored as multiple rules**, not as a single rule with a complex shape. SQL stays simple; the UI does the bands aggregation.
3. **Tenant-wide rules only in this change**. `service_id IS NULL` rules cover 90% of the v1 use case (tenant operates the same hours for all services). Per-service overrides are a follow-up change.
4. **Day order respects locale week-start**. In Arabic locales, the week may start on Saturday or Sunday; `date-fns/locale/ar`'s `weekStartsOn` is honored. Visual order matches the user's mental model.
5. **Exceptions section is below the weekly grid, not a separate screen**. Tenants think of availability holistically; one screen beats two.
6. **The "Block time" picker accepts ranges, not single days**. A vacation is one row, not seven.
7. **Copy-day uses an action sheet with checkboxes**, not a separate screen. Mobile users prefer short interactions over wizards.
