# availability Specification

## Purpose
TBD - created by archiving change define-availability-rules. Update Purpose after archive.
## Requirements
### Requirement: Availability SHALL be modeled as rules + exceptions, not pre-generated slots

The schema SHALL contain `availability_rules` (recurring local-time bands) and `availability_exceptions` (one-off `block`/`extra` windows) and MUST NOT contain any pre-materialized `availability_slots` table — slots are computed on read by `compute_available_slots`.

#### Scenario: schema shape
- **GIVEN** the database schema
- **WHEN** queried for the existence of `availability_slots`
- **THEN** no such table exists (rejected by design)
- **AND** the tables `availability_rules` and `availability_exceptions` are present

### Requirement: A rule SHALL describe a recurring local-time window

Each `availability_rules` row SHALL store `day_of_week`, `start_time`, and `end_time` as `time without time zone` in the tenant's IANA timezone, and `compute_available_slots` MUST combine them with the tenant TZ at compute time so DST transitions are honored.

#### Scenario: weekly opening hours
- **GIVEN** a tenant in timezone `Europe/Berlin`
- **WHEN** a rule with `day_of_week = 1` (Monday), `start_time = '09:00'`, `end_time = '17:00'` is inserted
- **THEN** the row is stored in tenant local time
- **AND** subsequent slot computation produces slots starting at 09:00 Berlin local time on every Monday in the requested range

### Requirement: Exceptions SHALL adjust the computed availability

`availability_exceptions` of `kind = 'block'` SHALL subtract their `tstzrange` from the candidate intervals produced by the rules, and rows of `kind = 'extra'` MUST add intervals outside the weekly grid.

#### Scenario: blocking a window
- **GIVEN** an `extra` exception is unset and a `block` exception covers `2026-12-25 00:00 — 2026-12-26 00:00 UTC` for a tenant
- **WHEN** `compute_available_slots` is called over a range that includes Dec 25
- **THEN** no slots are returned for that day

#### Scenario: opening an extra window
- **GIVEN** a tenant whose rules do not cover Saturdays
- **AND** an `extra` exception covering `2026-05-09 14:00 — 16:00 Europe/Berlin`
- **WHEN** `compute_available_slots` is called for the week of 2026-05-04
- **THEN** the computation produces slots inside that Saturday window

### Requirement: `compute_available_slots` SHALL respect service constraints

The function SHALL tile each available interval into `service.duration_minutes` slots honoring `buffer_before_min`/`buffer_after_min`, filter to `now() + min_notice_min ≤ slot_start ≤ now() + max_advance_days`, and MUST cap returned slots per tenant-TZ day when `daily_cap` is set.

#### Scenario: minimum notice
- **GIVEN** a service with `min_notice_min = 60`
- **WHEN** `compute_available_slots` is called at 09:30 local time
- **THEN** no slot starting before 10:30 local time is returned

#### Scenario: maximum advance
- **GIVEN** a service with `max_advance_days = 30`
- **WHEN** `compute_available_slots` is called for a range extending 60 days out
- **THEN** no slot more than 30 days from the call time is returned

#### Scenario: buffer respected
- **GIVEN** a service with `duration_minutes = 30, buffer_before_min = 10, buffer_after_min = 10`
- **AND** a rule from 09:00 to 11:00
- **WHEN** slots are tiled
- **THEN** the first slot starts at 09:10 (after the leading buffer)
- **AND** consecutive slots are separated by 10 + 10 minutes of buffer
- **AND** the last slot ends no later than 10:50

#### Scenario: daily cap
- **GIVEN** a service with `daily_cap = 5` and rules that would produce 8 candidate slots on a given day
- **WHEN** `compute_available_slots` is called for that day
- **THEN** at most 5 slots are returned for that tenant-TZ day

### Requirement: `compute_available_slots` SHALL exclude slots overlapping live appointments

The function SHALL subtract any slot whose `tstzrange` overlaps a non-cancelled, non-no-show `appointments` row for the same `(tenant_id, service_id)`, and MUST re-offer slots that overlap only cancelled or no-show appointments.

#### Scenario: existing appointment blocks its slot
- **GIVEN** a `confirmed` appointment from 10:00 to 10:30
- **WHEN** `compute_available_slots` runs over a range that includes 10:00
- **THEN** no slot starting in that range overlaps the appointment

#### Scenario: cancelled appointment frees the slot
- **GIVEN** an appointment in the same window with `status = 'cancelled'`
- **WHEN** `compute_available_slots` runs
- **THEN** the slot is offered again

### Requirement: Rules SHALL be visible to anonymous clients via RLS

`compute_available_slots` SHALL be `SECURITY DEFINER` and callable with the public anon key so the public booking flow MUST be able to fetch slots for a tenant slug without authentication.

#### Scenario: anonymous availability fetch
- **GIVEN** an anonymous client (anon key)
- **WHEN** the client calls `compute_available_slots('demo', '<service-uuid>', now(), now() + interval '7 days')`
- **THEN** the function returns the available slots
- **AND** no authentication is required

### Requirement: The availability editor SHALL atomically replace a day's rules

Saving a day's bands SHALL go through the `bulk_replace_rules_for_day` RPC which deletes all existing tenant-wide rules for that `day_of_week` and inserts the new bands in a single transaction; partial saves MUST never persist.

#### Scenario: replacing Monday bands
- **GIVEN** Monday currently has bands `09:00–12:00, 13:00–17:00`
- **WHEN** an admin submits new bands `08:00–14:00`
- **THEN** the `bulk_replace_rules_for_day` RPC executes in a transaction
- **AND** all prior Monday rules (with `service_id IS NULL`) are deleted
- **AND** the new band is inserted
- **AND** if any step fails, no changes are persisted

### Requirement: Empty state SHALL offer a one-tap default

When a tenant has zero `availability_rules`, the editor SHALL render an empty state with a "Set Mon–Fri 09:00–17:00" CTA that MUST insert the five default bands in one transaction.

#### Scenario: new tenant with no rules
- **GIVEN** a tenant with zero `availability_rules`
- **WHEN** the availability screen renders
- **THEN** an empty state is shown with a CTA "Set Mon–Fri 09:00–17:00"
- **AND** tapping it inserts the corresponding rules in one transaction

### Requirement: Copy-day SHALL apply identical bands to chosen target days

The copy-day action SHALL call `bulk_replace_rules_for_day` once per selected target day, and every target's rules MUST be replaced with an exact copy of the source day's bands.

#### Scenario: copy Monday to Tue–Fri
- **GIVEN** Monday has bands `09:00–17:00`
- **WHEN** the admin selects "Copy Monday → Tue, Wed, Thu, Fri" and confirms
- **THEN** each of Tue/Wed/Thu/Fri has its rules replaced with the same band

### Requirement: Adding a block exception SHALL remove slots within its window

Adding an `availability_exceptions` row of `kind = 'block'` SHALL cause subsequent `compute_available_slots` calls to omit any slot in the blocked range, and existing appointments inside the window MUST NOT be auto-cancelled.

#### Scenario: vacation block
- **GIVEN** weekly rules cover Monday 09:00–17:00
- **WHEN** an admin adds a `block` exception covering `2026-12-22` to `2026-12-31`
- **THEN** subsequent calls to `compute_available_slots` for that range return no slots
- **AND** existing appointments in that window are not auto-cancelled (admin handles manually)

### Requirement: Adding an extra exception SHALL produce slots outside the weekly schedule

Adding a row of `kind = 'extra'` SHALL surface slots inside the new range even when no `availability_rules` row covers that day, so `compute_available_slots` MUST return slots tiled inside the extra window.

#### Scenario: weekend pop-up
- **GIVEN** weekly rules do not cover Saturday
- **WHEN** an admin adds an `extra` exception for `2026-06-13 10:00–14:00`
- **THEN** `compute_available_slots` for that day yields slots within `10:00–14:00`

### Requirement: Editing rules SHALL respect role hierarchy

Edits to rules and exceptions SHALL be permitted to `owner` and `admin` only; `staff` MUST see the screen in read-only mode with a "Read-only — ask an admin" notice.

#### Scenario: staff cannot edit
- **GIVEN** a `staff` member viewing the availability screen
- **WHEN** they attempt to add or modify a band
- **THEN** the controls are disabled
- **AND** the screen shows a "Read-only — ask an admin" notice

#### Scenario: admin can edit
- **GIVEN** an `admin` member
- **WHEN** they edit a band
- **THEN** the change persists via `bulk_replace_rules_for_day`

