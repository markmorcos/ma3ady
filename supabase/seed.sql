-- Local-only seed. Idempotent. Truncate-and-insert per table.
-- Loaded by `supabase db reset` (per config.toml) and by `make seed`.
-- Runs as postgres so RLS doesn't apply.

truncate
  public.appointment_events,
  public.appointments,
  public.guest_contacts,
  public.services,
  public.availability_exceptions,
  public.availability_rules,
  public.tenants
restart identity cascade;

-- Demo tenant.
with t as (
  insert into public.tenants (slug, name, timezone, default_locale, brand_color)
  values ('demo', 'Demo Clinic', 'Europe/Berlin', 'en', '#0F766E')
  returning id
)
-- Mon–Fri 09:00–17:00 (day_of_week 1–5; Sunday is 0 per Postgres' extract(dow)).
insert into public.availability_rules (tenant_id, day_of_week, start_time, end_time)
select t.id, dow, '09:00'::time, '17:00'::time
from t, generate_series(1, 5) as dow;

-- Christmas Day 2026 block.
insert into public.availability_exceptions (tenant_id, kind, starts_at, ends_at, reason)
select
  id, 'block',
  ('2026-12-25 00:00'::timestamp at time zone 'Europe/Berlin'),
  ('2026-12-26 00:00'::timestamp at time zone 'Europe/Berlin'),
  'Christmas Day'
from public.tenants where slug = 'demo';

-- Two services.
insert into public.services (tenant_id, name, description, duration_minutes, min_notice_min, max_advance_days)
select id, 'Consultation', '30-minute initial consultation.', 30, 60, 60
from public.tenants where slug = 'demo';

insert into public.services (tenant_id, name, description, duration_minutes, buffer_after_min, daily_cap)
select id, 'Long Session', '60-minute focused session.', 60, 15, 4
from public.tenants where slug = 'demo';
