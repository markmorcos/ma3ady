# services — Spec Delta

## ADDED Requirements

### Requirement: Services SHALL be defined per tenant with duration and policy fields

#### Scenario: minimum service definition
- **GIVEN** an owner of tenant `acme`
- **WHEN** they insert a service with `name = 'Consultation', duration_minutes = 30`
- **THEN** the row is created with default `buffer_before_min = 0, buffer_after_min = 0, min_notice_min = 60, max_advance_days = 60, active = true`

#### Scenario: invalid duration rejected
- **WHEN** an insert sets `duration_minutes = 0` or negative
- **THEN** the check constraint rejects the insert

### Requirement: Inactive services SHALL be invisible to anonymous browsers

#### Scenario: anon read filtered
- **GIVEN** a tenant has services A (`active = true`) and B (`active = false`)
- **WHEN** an anon client queries `select * from services where tenant_id = '<tenant>'`
- **THEN** only service A is returned (B is filtered by RLS)

#### Scenario: staff read sees both
- **GIVEN** a staff member of the same tenant
- **WHEN** they query the same
- **THEN** both services are returned
