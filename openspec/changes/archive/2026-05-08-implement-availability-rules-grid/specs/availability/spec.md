# availability — Spec Delta

## ADDED Requirements

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
