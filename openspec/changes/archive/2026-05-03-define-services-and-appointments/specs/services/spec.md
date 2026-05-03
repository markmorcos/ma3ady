# services — Spec Delta

## ADDED Requirements

### Requirement: Services SHALL be defined per tenant with duration and policy fields

A `services` row SHALL carry `tenant_id`, `name`, `duration_minutes`, and policy fields (`buffer_before_min`, `buffer_after_min`, `min_notice_min`, `max_advance_days`, `daily_cap`, `active`) with sensible defaults; a positive `duration_minutes` MUST be enforced by check constraint.

#### Scenario: minimum service definition
- **GIVEN** an owner of tenant `acme`
- **WHEN** they insert a service with `name = 'Consultation', duration_minutes = 30`
- **THEN** the row is created with default `buffer_before_min = 0, buffer_after_min = 0, min_notice_min = 60, max_advance_days = 60, active = true`

#### Scenario: invalid duration rejected
- **WHEN** an insert sets `duration_minutes = 0` or negative
- **THEN** the check constraint rejects the insert

### Requirement: Inactive services SHALL be invisible to anonymous browsers

The RLS select policy on `services` SHALL restrict the anon role to rows where `active = true`, while tenant members MUST see both active and inactive services for management.

#### Scenario: anon read filtered
- **GIVEN** a tenant has services A (`active = true`) and B (`active = false`)
- **WHEN** an anon client queries `select * from services where tenant_id = '<tenant>'`
- **THEN** only service A is returned (B is filtered by RLS)

#### Scenario: staff read sees both
- **GIVEN** a staff member of the same tenant
- **WHEN** they query the same
- **THEN** both services are returned
