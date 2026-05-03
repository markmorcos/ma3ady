-- Local-only seed. Idempotent. Truncate-and-insert per table.
-- Loaded by `supabase db reset` (per config.toml) and by `make seed`.

-- The seed runs as the postgres role, which bypasses RLS — so the
-- tenants_insert_denied policy doesn't apply here.
truncate public.tenants restart identity cascade;

insert into public.tenants (slug, name, timezone, default_locale, brand_color)
values ('demo', 'Demo Clinic', 'Europe/Berlin', 'en', '#0F766E');
