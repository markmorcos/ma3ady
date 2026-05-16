-- 023_tenant_branding_extensions: adds three columns to public.tenants for
-- the M3 visual revamp (design-system-m3-revamp).
--
-- * `type`                — small enum so the public tenant header can render
--                            the right vertical icon + label ("salon", "clinic",
--                            "auto", or "generic"). NOT NULL with default
--                            'generic' so every existing row passes.
-- * `location`            — single-line freeform location string, shown as the
--                            subtitle on the public tenant home ("Cairo · Zamalek").
-- * `cancellation_policy` — plain-text policy displayed on the public booking
--                            confirmation card.
--
-- All three are part of the public tenant view (the existing
-- `tenants_public_select` RLS policy from 002_tenancy.sql is column-agnostic
-- and continues to apply). The columns are additionally writable by owners
-- and admins via the existing membership-based update policy.

-- ---------------------------------------------------------------------------
-- enum
-- ---------------------------------------------------------------------------

create type public.tenant_type as enum ('generic', 'salon', 'clinic', 'auto');

-- ---------------------------------------------------------------------------
-- columns
-- ---------------------------------------------------------------------------

alter table public.tenants
  add column type public.tenant_type not null default 'generic',
  add column location text,
  add column cancellation_policy text,
  add constraint tenants_location_length check (location is null or char_length(location) <= 120),
  add constraint tenants_policy_length check (cancellation_policy is null or char_length(cancellation_policy) <= 2000);

create index tenants_type_idx on public.tenants(type);

-- No data migration: existing rows take the 'generic' default; location and
-- cancellation_policy stay null until set in the admin settings UI.
