-- Preview-environment seed. Idempotent. Truncate-and-insert per table.
-- Single fixture tenant for QA. Schema reference values, not real data.
-- The `tenants` table is created in the define-tenancy-model change; until then this is a placeholder.

-- Example (commented out — uncomment after define-tenancy-model lands):
-- truncate tenants restart identity cascade;
-- insert into tenants (slug, name, timezone, default_locale)
-- values ('demo', 'Demo Clinic', 'Europe/Berlin', 'en');
