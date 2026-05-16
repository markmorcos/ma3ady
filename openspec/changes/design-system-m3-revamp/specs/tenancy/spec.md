# tenancy spec delta

## ADDED Requirements

### Requirement: Tenants SHALL carry a vertical type, cancellation policy, and location

The `public.tenants` table SHALL include three additional columns to support the visual handoff and the public booking surface:

- `type tenant_type NOT NULL DEFAULT 'generic'`, where `tenant_type` is the enum `('generic', 'salon', 'clinic', 'auto')`
- `location text NULL` — a one-line freeform location string ("Cairo · Zamalek")
- `cancellation_policy text NULL` — plain-text policy shown on the public booking confirmation card

All three columns SHALL be readable by anonymous clients via the existing tenant-public RLS policy (they are part of the public tenant view), and writable only by tenant owners/admins.

#### Scenario: a public booking page reads the new columns
- **GIVEN** a tenant row with `type = 'clinic'` and `location = 'Cairo · Zamalek'`
- **WHEN** an anonymous client calls `getTenantBySlug(slug)`
- **THEN** the response includes `type = 'clinic'` and `location = 'Cairo · Zamalek'`

#### Scenario: only owners and admins may update the new columns
- **GIVEN** a user with `staff` role in a tenant
- **WHEN** the user attempts to update `tenants.cancellation_policy`
- **THEN** the update is rejected by RLS (no `staff`-level write policy covers the new columns)
