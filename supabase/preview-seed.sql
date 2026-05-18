-- Preview / production demo-tenant seed. Applied against shared cloud
-- Supabase projects (preview + production), not the local stack. The local
-- stack uses supabase/seed.sql instead — `supabase db reset` and `make seed`
-- both target that file (which is destructive: TRUNCATE + insert).
--
-- This file is idempotent and only touches rows scoped to slug='demo' so
-- it's safe to re-run against an env that has other real tenants.
--
-- Apply with the Supabase CLI once linked to the project:
--
--   pnpm exec supabase link --project-ref <ref>
--   pnpm exec supabase db query --linked --file supabase/preview-seed.sql
--
-- or via psql / Studio query editor with the same SQL.
--
-- Re-running after real bookings exist on demo will fail at the services
-- DELETE (FK on appointments is `on delete restrict`). That's intentional —
-- if the demo tenant has live appointments, treat the seed as historical
-- and edit the rows directly instead.

-- Note: no `\set ON_ERROR_STOP on` — that's a psql meta-command and the
-- Management API endpoint behind `supabase db query --linked` rejects it
-- with `syntax error at or near "\"`. The wrapping BEGIN/COMMIT plus the
-- exception semantics of the `do $$` block give the same fail-and-
-- rollback guarantee.

begin;

insert into public.tenants (slug, name, timezone, default_locale, brand_color)
values ('demo', 'Demo Clinic', 'Europe/Berlin', 'en', '#0F766E')
on conflict (slug) do update set
  name           = excluded.name,
  timezone       = excluded.timezone,
  default_locale = excluded.default_locale,
  brand_color    = excluded.brand_color;

do $$
declare v_tenant uuid;
begin
  select id into v_tenant from public.tenants where slug = 'demo';

  delete from public.availability_exceptions where tenant_id = v_tenant;
  delete from public.availability_rules     where tenant_id = v_tenant;
  delete from public.services               where tenant_id = v_tenant;

  insert into public.availability_rules (tenant_id, day_of_week, start_time, end_time)
  select v_tenant, dow, '09:00'::time, '17:00'::time
  from generate_series(1, 5) as dow;

  insert into public.availability_exceptions (tenant_id, kind, starts_at, ends_at, reason)
  values (
    v_tenant,
    'block',
    ('2026-12-25 00:00'::timestamp at time zone 'Europe/Berlin'),
    ('2026-12-26 00:00'::timestamp at time zone 'Europe/Berlin'),
    'Christmas Day'
  );

  insert into public.services (tenant_id, name, description, duration_minutes, min_notice_min, max_advance_days)
  values (v_tenant, 'Consultation', '30-minute initial consultation.', 30, 60, 60);

  insert into public.services (tenant_id, name, description, duration_minutes, buffer_after_min, daily_cap)
  values (v_tenant, 'Long Session', '60-minute focused session.', 60, 15, 4);
end;
$$;

commit;
