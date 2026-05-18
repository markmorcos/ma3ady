-- Seed data for the Play Store review tenant.
--
-- Pairs with scripts/store/create-review-user.sh — that script
-- provisions one auth.users row for the review email; THIS file
-- gives that user a populated tenant to sign into so the reviewer
-- isn't greeted by an empty Today screen.
--
-- Idempotent: re-running deletes and re-creates only rows scoped to
-- the 'play-review' slug. Safe to re-run before each Play submission
-- to refresh the appointment timeline (dates are computed relative
-- to now() so the data never goes stale on its own).
--
-- Apply with the Supabase CLI once linked to the production project:
--
--   pnpm exec supabase link --project-ref <prod-ref>
--   pnpm exec supabase db query --linked --file supabase/play-review-seed.sql
--
-- Or paste into Supabase Studio → SQL Editor → Run.
--
-- Or via the Makefile shortcut (handles linking + confirms before
-- touching prod):
--
--   SUPABASE_PROJECT_REF=<prod-ref> make seed-play-review

\set ON_ERROR_STOP on

begin;

-- Tenant. Slug 'play-review' isn't on the reserved list
-- (openspec/project.md §3) so it claims cleanly.
insert into public.tenants (slug, name, timezone, default_locale, brand_color)
values ('play-review', 'Cleo''s Cut', 'Africa/Cairo', 'en', '#0F766E')
on conflict (slug) do update set
  name           = excluded.name,
  timezone       = excluded.timezone,
  default_locale = excluded.default_locale,
  brand_color    = excluded.brand_color;

do $$
declare
  -- The email is the same fixed value baked into
  -- scripts/store/create-review-user.sh — keep them in sync if either
  -- moves.
  v_review_email constant text := 'playreview-c0cfeed3-a751-4076-991a-d582188203ea@ma3ady.app';
  v_tenant uuid;
  v_user uuid;
  v_svc_cut uuid;
  v_svc_beard uuid;
  v_svc_colour uuid;
  v_svc_kids uuid;
  v_g_yara uuid;
  v_g_adam uuid;
  v_g_maya uuid;
  v_g_omar uuid;
  v_g_layla uuid;
  v_g_hadi uuid;
  v_g_sara uuid;
  v_g_noor uuid;
  -- Anchor all timestamps on Cairo "today" so the timeline looks
  -- right in the Today screen regardless of when the seed was last
  -- run. now() is tenant-tz-stable.
  v_today date := (now() at time zone 'Africa/Cairo')::date;
begin
  select id into v_tenant from public.tenants where slug = 'play-review';

  select id into v_user from auth.users where lower(email) = lower(v_review_email);
  if v_user is null then
    raise exception
      'Review user (%) not found in auth.users. Run scripts/store/create-review-user.sh first.',
      v_review_email;
  end if;

  -- Owner membership for the review user. Idempotent.
  insert into public.memberships (tenant_id, user_id, role)
  values (v_tenant, v_user, 'owner')
  on conflict (user_id, tenant_id) do update set role = excluded.role;

  -- Wipe child data in FK-safe order so re-running doesn't conflict.
  -- appointments → guest_contacts (FK from appointments) →
  -- availability → services (services FK from appointments is
  -- on delete restrict, hence the order).
  delete from public.appointments          where tenant_id = v_tenant;
  delete from public.guest_contacts        where tenant_id = v_tenant;
  delete from public.availability_exceptions where tenant_id = v_tenant;
  delete from public.availability_rules    where tenant_id = v_tenant;
  delete from public.services              where tenant_id = v_tenant;

  -- ---------- services ----------
  insert into public.services (tenant_id, name, description, duration_minutes, buffer_after_min)
  values (v_tenant, 'Signature Cut', 'Classic men''s cut with hot-towel finish.', 45, 15)
  returning id into v_svc_cut;

  insert into public.services (tenant_id, name, description, duration_minutes)
  values (v_tenant, 'Beard Trim', 'Precision beard tidy and shape.', 30)
  returning id into v_svc_beard;

  insert into public.services (tenant_id, name, description, duration_minutes, buffer_after_min, daily_cap)
  values (v_tenant, 'Colour & Cut', 'Full colour service plus cut.', 90, 30, 3)
  returning id into v_svc_colour;

  insert into public.services (tenant_id, name, description, duration_minutes)
  values (v_tenant, 'Kids'' Cut', 'Quick cut for under-12s.', 30)
  returning id into v_svc_kids;

  -- ---------- availability ----------
  -- Mon-Sat 09:00-18:00 (Cairo time). Sunday off — matches what
  -- the marketing copy implies for Cleo's Cut and gives the
  -- reviewer at least one "off" day to demonstrate the heatmap.
  insert into public.availability_rules (tenant_id, day_of_week, start_time, end_time)
  select v_tenant, dow, '09:00'::time, '18:00'::time
  from unnest(array[1, 2, 3, 4, 5, 6]) as dow;

  -- One holiday block in the near future so the heatmap shows an
  -- exception alongside the regular rules.
  insert into public.availability_exceptions (tenant_id, kind, starts_at, ends_at, reason)
  values (
    v_tenant,
    'block',
    ((v_today + 14)::text || ' 00:00')::timestamp at time zone 'Africa/Cairo',
    ((v_today + 15)::text || ' 00:00')::timestamp at time zone 'Africa/Cairo',
    'Eid'
  );

  -- ---------- guest contacts (the people who booked) ----------
  insert into public.guest_contacts (tenant_id, name, email, locale) values
    (v_tenant, 'Yara H.',  'yara.h@example.com',  'en') returning id into v_g_yara;
  insert into public.guest_contacts (tenant_id, name, email, locale) values
    (v_tenant, 'Adam S.',  'adam.s@example.com',  'en') returning id into v_g_adam;
  insert into public.guest_contacts (tenant_id, name, email, locale) values
    (v_tenant, 'Maya R.',  'maya.r@example.com',  'en') returning id into v_g_maya;
  insert into public.guest_contacts (tenant_id, name, email, locale) values
    (v_tenant, 'Omar K.',  'omar.k@example.com',  'ar') returning id into v_g_omar;
  insert into public.guest_contacts (tenant_id, name, email, locale) values
    (v_tenant, 'Layla M.', 'layla.m@example.com', 'ar') returning id into v_g_layla;
  insert into public.guest_contacts (tenant_id, name, email, locale) values
    (v_tenant, 'Hadi A.',  'hadi.a@example.com',  'ar') returning id into v_g_hadi;
  insert into public.guest_contacts (tenant_id, name, email, locale) values
    (v_tenant, 'Sara N.',  'sara.n@example.com',  'en') returning id into v_g_sara;
  insert into public.guest_contacts (tenant_id, name, email, locale) values
    (v_tenant, 'Noor T.',  'noor.t@example.com',  'ar') returning id into v_g_noor;

  -- ---------- appointments ----------
  --
  -- Spread across [yesterday .. today+3]:
  --   - 2 completed yesterday (proves history)
  --   - 1 cancelled yesterday (cancellation column visible somewhere)
  --   - 6 spread across today (mix of done, in-progress, pending,
  --     confirmed) so the Today screen renders a full timeline like
  --     the Play Store screenshots
  --   - 4 confirmed/pending in the next three days (Upcoming list)
  --
  -- starts_at is set in Cairo time and cast to timestamptz. The
  -- EXCLUDE constraint forbids overlapping non-cancelled rows per
  -- service so the slots are de-conflicted by service x time.
  -- manage_token_hash is randomly generated per row (the constraint
  -- is NOT NULL, no uniqueness requirement at the schema level).

  -- Yesterday — completed
  insert into public.appointments
    (tenant_id, service_id, guest_contact_id, starts_at, ends_at, status, manage_token_hash)
  values
    (v_tenant, v_svc_cut, v_g_sara,
      ((v_today - 1)::text || ' 10:00')::timestamp at time zone 'Africa/Cairo',
      ((v_today - 1)::text || ' 10:45')::timestamp at time zone 'Africa/Cairo',
      'completed', encode(gen_random_bytes(32), 'hex')),
    (v_tenant, v_svc_beard, v_g_noor,
      ((v_today - 1)::text || ' 14:30')::timestamp at time zone 'Africa/Cairo',
      ((v_today - 1)::text || ' 15:00')::timestamp at time zone 'Africa/Cairo',
      'completed', encode(gen_random_bytes(32), 'hex')),
    -- Yesterday — cancelled
    (v_tenant, v_svc_colour, v_g_omar,
      ((v_today - 1)::text || ' 16:00')::timestamp at time zone 'Africa/Cairo',
      ((v_today - 1)::text || ' 17:30')::timestamp at time zone 'Africa/Cairo',
      'cancelled', encode(gen_random_bytes(32), 'hex'));

  -- Today — completed (morning), then a now-ish confirmed colour,
  -- then later-today pending / confirmed
  insert into public.appointments
    (tenant_id, service_id, guest_contact_id, starts_at, ends_at, status, manage_token_hash)
  values
    (v_tenant, v_svc_beard, v_g_yara,
      (v_today::text || ' 09:00')::timestamp at time zone 'Africa/Cairo',
      (v_today::text || ' 09:30')::timestamp at time zone 'Africa/Cairo',
      'completed', encode(gen_random_bytes(32), 'hex')),
    (v_tenant, v_svc_cut, v_g_adam,
      (v_today::text || ' 10:00')::timestamp at time zone 'Africa/Cairo',
      (v_today::text || ' 10:45')::timestamp at time zone 'Africa/Cairo',
      'completed', encode(gen_random_bytes(32), 'hex')),
    (v_tenant, v_svc_colour, v_g_maya,
      (v_today::text || ' 11:00')::timestamp at time zone 'Africa/Cairo',
      (v_today::text || ' 12:30')::timestamp at time zone 'Africa/Cairo',
      'confirmed', encode(gen_random_bytes(32), 'hex')),
    (v_tenant, v_svc_cut, v_g_omar,
      (v_today::text || ' 13:00')::timestamp at time zone 'Africa/Cairo',
      (v_today::text || ' 13:45')::timestamp at time zone 'Africa/Cairo',
      'pending', encode(gen_random_bytes(32), 'hex')),
    (v_tenant, v_svc_kids, v_g_layla,
      (v_today::text || ' 14:00')::timestamp at time zone 'Africa/Cairo',
      (v_today::text || ' 14:30')::timestamp at time zone 'Africa/Cairo',
      'confirmed', encode(gen_random_bytes(32), 'hex')),
    (v_tenant, v_svc_cut, v_g_hadi,
      (v_today::text || ' 16:00')::timestamp at time zone 'Africa/Cairo',
      (v_today::text || ' 16:45')::timestamp at time zone 'Africa/Cairo',
      'confirmed', encode(gen_random_bytes(32), 'hex'));

  -- Tomorrow — confirmed
  insert into public.appointments
    (tenant_id, service_id, guest_contact_id, starts_at, ends_at, status, manage_token_hash)
  values
    (v_tenant, v_svc_cut, v_g_sara,
      ((v_today + 1)::text || ' 11:00')::timestamp at time zone 'Africa/Cairo',
      ((v_today + 1)::text || ' 11:45')::timestamp at time zone 'Africa/Cairo',
      'confirmed', encode(gen_random_bytes(32), 'hex')),
    (v_tenant, v_svc_beard, v_g_adam,
      ((v_today + 1)::text || ' 12:00')::timestamp at time zone 'Africa/Cairo',
      ((v_today + 1)::text || ' 12:30')::timestamp at time zone 'Africa/Cairo',
      'pending', encode(gen_random_bytes(32), 'hex')),
    -- Day after — confirmed
    (v_tenant, v_svc_colour, v_g_layla,
      ((v_today + 2)::text || ' 10:00')::timestamp at time zone 'Africa/Cairo',
      ((v_today + 2)::text || ' 11:30')::timestamp at time zone 'Africa/Cairo',
      'confirmed', encode(gen_random_bytes(32), 'hex')),
    -- Three days out — pending
    (v_tenant, v_svc_cut, v_g_noor,
      ((v_today + 3)::text || ' 15:00')::timestamp at time zone 'Africa/Cairo',
      ((v_today + 3)::text || ' 15:45')::timestamp at time zone 'Africa/Cairo',
      'pending', encode(gen_random_bytes(32), 'hex'));

  raise notice 'Seeded play-review tenant: % services, % availability rules, % appointments',
    (select count(*) from public.services where tenant_id = v_tenant),
    (select count(*) from public.availability_rules where tenant_id = v_tenant),
    (select count(*) from public.appointments where tenant_id = v_tenant);
end;
$$;

commit;
