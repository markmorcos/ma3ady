# availability — Spec Delta

## ADDED Requirements

### Requirement: Availability SHALL be modeled as rules + exceptions, not pre-generated slots

#### Scenario: schema shape
- **GIVEN** the database schema
- **WHEN** queried for the existence of `availability_slots`
- **THEN** no such table exists (rejected by design)
- **AND** the tables `availability_rules` and `availability_exceptions` are present

### Requirement: A rule SHALL describe a recurring local-time window

#### Scenario: weekly opening hours
- **GIVEN** a tenant in timezone `Europe/Berlin`
- **WHEN** a rule with `day_of_week = 1` (Monday), `start_time = '09:00'`, `end_time = '17:00'` is inserted
- **THEN** the row is stored in tenant local time
- **AND** subsequent slot computation produces slots starting at 09:00 Berlin local time on every Monday in the requested range

### Requirement: Exceptions SHALL adjust the computed availability

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

#### Scenario: existing appointment blocks its slot
- **GIVEN** a `confirmed` appointment from 10:00 to 10:30
- **WHEN** `compute_available_slots` runs over a range that includes 10:00
- **THEN** no slot starting in that range overlaps the appointment

#### Scenario: cancelled appointment frees the slot
- **GIVEN** an appointment in the same window with `status = 'cancelled'`
- **WHEN** `compute_available_slots` runs
- **THEN** the slot is offered again

### Requirement: Rules SHALL be visible to anonymous clients via RLS

#### Scenario: anonymous availability fetch
- **GIVEN** an anonymous client (anon key)
- **WHEN** the client calls `compute_available_slots('demo', '<service-uuid>', now(), now() + interval '7 days')`
- **THEN** the function returns the available slots
- **AND** no authentication is required
