-- 005_appointments: appointment_status, guest_contacts, appointments (with EXCLUDE),
-- appointment_events, the status-change trigger, book_appointment +
-- verify_manage_token RPCs, and the finalized compute_available_slots body.
--
-- See openspec/specs/appointments/spec.md.

-- ============================================================================
-- enums
-- ============================================================================

create type public.appointment_status as enum (
  'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
);

-- ============================================================================
-- guest_contacts
-- ============================================================================

create table public.guest_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  locale text,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (tenant_id, email),
  constraint guest_contacts_locale_supported
    check (locale is null or locale in ('en', 'ar'))
);

create index guest_contacts_claimed_idx on public.guest_contacts(claimed_by_user_id);

create trigger guest_contacts_set_updated_at
  before update on public.guest_contacts
  for each row execute function public.tg_set_updated_at();

-- ============================================================================
-- appointments
-- ============================================================================

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  guest_contact_id uuid references public.guest_contacts(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  notes text,
  manage_token_hash text not null,
  cancelled_at timestamptz,
  cancelled_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint appointments_time_order check (ends_at > starts_at),
  constraint appointments_identity_xor check (
    (user_id is not null and guest_contact_id is null)
    or (user_id is null and guest_contact_id is not null)
  ),

  -- The big one: prevent double-booking at the database. tstzrange's && operator
  -- gives us the overlap test; the WHERE predicate excludes cancelled / no_show
  -- rows so they don't block their range.
  constraint appointments_no_overlap
    exclude using gist (
      tenant_id with =,
      service_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    ) where (status not in ('cancelled', 'no_show'))
);

create index appointments_tenant_starts_idx on public.appointments(tenant_id, starts_at);
create index appointments_user_idx on public.appointments(user_id);
create index appointments_guest_idx on public.appointments(guest_contact_id);
create index appointments_status_starts_idx on public.appointments(status, starts_at);

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.tg_set_updated_at();

-- ============================================================================
-- appointment_events (audit)
-- ============================================================================

create table public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index appointment_events_appt_created_idx
  on public.appointment_events(appointment_id, created_at);

-- ============================================================================
-- handle_appointment_status_change trigger
-- ============================================================================

create or replace function public.handle_appointment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.appointment_events (appointment_id, event_type, payload, by_user_id)
    values (
      new.id,
      'created',
      jsonb_build_object(
        'status', new.status,
        'starts_at', new.starts_at,
        'ends_at', new.ends_at,
        'service_id', new.service_id
      ),
      auth.uid()
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.appointment_events (appointment_id, event_type, payload, by_user_id)
      values (
        new.id,
        'status_changed',
        jsonb_build_object('from', old.status, 'to', new.status),
        auth.uid()
      );
    end if;
    if new.starts_at is distinct from old.starts_at
       or new.ends_at is distinct from old.ends_at then
      insert into public.appointment_events (appointment_id, event_type, payload, by_user_id)
      values (
        new.id,
        'rescheduled',
        jsonb_build_object(
          'from', jsonb_build_object('starts_at', old.starts_at, 'ends_at', old.ends_at),
          'to',   jsonb_build_object('starts_at', new.starts_at, 'ends_at', new.ends_at)
        ),
        auth.uid()
      );
    end if;
    return new;
  end if;

  return null;
end;
$$;

create trigger on_appointment_status_change
  after insert or update on public.appointments
  for each row execute function public.handle_appointment_status_change();

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.guest_contacts enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_events enable row level security;

-- ---- guest_contacts ----

create policy guest_contacts_select_member_or_claimed
  on public.guest_contacts
  for select
  using (
    public.current_user_is_member_of(tenant_id)
    or claimed_by_user_id = auth.uid()
  );

-- Inserts and updates only via SECURITY DEFINER functions. No direct policy.
create policy guest_contacts_insert_denied
  on public.guest_contacts
  for insert
  with check (false);
create policy guest_contacts_update_denied
  on public.guest_contacts
  for update
  using (false)
  with check (false);
create policy guest_contacts_delete_denied
  on public.guest_contacts
  for delete
  using (false);

-- ---- appointments ----

create policy appointments_select_self_or_staff
  on public.appointments
  for select
  using (
    user_id = auth.uid()
    or public.current_user_role_in(tenant_id) in ('owner', 'admin', 'staff')
  );

-- Inserts denied — must go through book_appointment().
create policy appointments_insert_denied
  on public.appointments
  for insert
  with check (false);

create policy appointments_update_staff
  on public.appointments
  for update
  using (public.current_user_role_in(tenant_id) in ('owner', 'admin', 'staff'))
  with check (public.current_user_role_in(tenant_id) in ('owner', 'admin', 'staff'));

create policy appointments_delete_denied
  on public.appointments
  for delete
  using (false);

-- ---- appointment_events ----

create policy appointment_events_select_self_or_staff
  on public.appointment_events
  for select
  using (
    exists (
      select 1
      from public.appointments a
      where a.id = appointment_events.appointment_id
        and (
          a.user_id = auth.uid()
          or public.current_user_role_in(a.tenant_id) in ('owner', 'admin', 'staff')
        )
    )
  );

-- Events are written exclusively by the trigger.
create policy appointment_events_insert_denied
  on public.appointment_events
  for insert
  with check (false);
create policy appointment_events_update_denied
  on public.appointment_events
  for update
  using (false)
  with check (false);
create policy appointment_events_delete_denied
  on public.appointment_events
  for delete
  using (false);

grant select on public.guest_contacts to authenticated;
grant select on public.appointments to authenticated;
grant update on public.appointments to authenticated;
grant select on public.appointment_events to authenticated;

-- ============================================================================
-- compute_available_slots — finalized body
-- ============================================================================
--
-- Now that services + appointments exist, the function tiles raw availability
-- windows into per-service slots, applies buffers + notice + advance + daily
-- cap, and anti-joins against live appointments.

create or replace function public.compute_available_slots(
  p_tenant_slug text,
  p_service_id uuid,
  p_range_start timestamptz,
  p_range_end timestamptz
) returns table (
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_tenant   public.tenants;
  v_service  public.services;
  v_min_start timestamptz;
  v_max_start timestamptz;
begin
  select * into v_tenant from public.tenants where slug = p_tenant_slug;
  if not found then return; end if;

  if p_service_id is null then
    raise exception 'p_service_id is required for slot computation' using errcode = '22023';
  end if;

  select * into v_service
  from public.services
  where id = p_service_id and tenant_id = v_tenant.id and active = true;
  if not found then return; end if;

  v_min_start := now() + make_interval(mins => v_service.min_notice_min);
  v_max_start := now() + make_interval(days => v_service.max_advance_days);

  return query
  with rule_windows as (
    select tstzrange(
             (d::timestamp + r.start_time) at time zone v_tenant.timezone,
             (d::timestamp + r.end_time)   at time zone v_tenant.timezone,
             '[)'
           ) as rng
    from public.availability_rules r
    cross join generate_series(
      p_range_start::date,
      p_range_end::date,
      interval '1 day'
    ) as d
    where r.tenant_id = v_tenant.id
      and (r.service_id is null or r.service_id = p_service_id)
      and extract(dow from d)::int = r.day_of_week
      and (r.valid_from is null or d::date >= r.valid_from)
      and (r.valid_until is null or d::date <= r.valid_until)
  ),
  extras as (
    select tstzrange(e.starts_at, e.ends_at, '[)') as rng
    from public.availability_exceptions e
    where e.tenant_id = v_tenant.id
      and e.kind = 'extra'
      and (e.service_id is null or e.service_id = p_service_id)
      and tstzrange(e.starts_at, e.ends_at, '[)')
          && tstzrange(p_range_start, p_range_end, '[)')
  ),
  blocks as (
    select range_agg(tstzrange(e.starts_at, e.ends_at, '[)')) as ranges
    from public.availability_exceptions e
    where e.tenant_id = v_tenant.id
      and e.kind = 'block'
      and (e.service_id is null or e.service_id = p_service_id)
  ),
  candidates as (
    select range_agg(rng) as ranges
    from (
      select rng from rule_windows
      union all
      select rng from extras
    ) u
  ),
  available as (
    select unnest(
      coalesce((select ranges from candidates), '{}'::tstzmultirange)
      - coalesce((select ranges from blocks),     '{}'::tstzmultirange)
    ) as rng
  ),
  -- Tile each window into slots respecting buffers.
  -- Slot N start = (window_start + buffer_before) + N * (duration + buffer_after + buffer_before)
  -- Slot end     = slot_start + duration
  -- Stop when slot_end > (window_end - buffer_after).
  tiled as (
    select
      lower(rng) + make_interval(mins => v_service.buffer_before_min)
        + make_interval(mins => n * (v_service.duration_minutes
                                     + v_service.buffer_before_min
                                     + v_service.buffer_after_min)) as slot_start,
      lower(rng) + make_interval(mins => v_service.buffer_before_min)
        + make_interval(mins => n * (v_service.duration_minutes
                                     + v_service.buffer_before_min
                                     + v_service.buffer_after_min)
                                + v_service.duration_minutes) as slot_end
    from available a
    cross join generate_series(0,
      ceil(extract(epoch from (upper(a.rng) - lower(a.rng))) / 60)::int
        / greatest(v_service.duration_minutes
                   + v_service.buffer_before_min
                   + v_service.buffer_after_min, 1)
    ) as n
  ),
  windowed as (
    select
      t.slot_start,
      t.slot_end
    from tiled t
    join available a on tstzrange(t.slot_start, t.slot_end, '[)') <@ a.rng
    where t.slot_end <= upper(a.rng) - make_interval(mins => v_service.buffer_after_min)
      -- min_notice / max_advance
      and t.slot_start >= v_min_start
      and t.slot_start <= v_max_start
  ),
  available_slots as (
    select
      w.slot_start as starts_at,
      w.slot_end   as ends_at
    from windowed w
    -- Anti-join against live appointments
    where not exists (
      select 1 from public.appointments ap
      where ap.tenant_id = v_tenant.id
        and ap.service_id = p_service_id
        and ap.status not in ('cancelled', 'no_show')
        and tstzrange(ap.starts_at, ap.ends_at, '[)')
            && tstzrange(w.slot_start, w.slot_end, '[)')
    )
  ),
  capped as (
    select
      s.starts_at,
      s.ends_at,
      row_number() over (
        partition by ((s.starts_at at time zone v_tenant.timezone)::date)
        order by s.starts_at
      ) as rn
    from available_slots s
  )
  select c.starts_at, c.ends_at
  from capped c
  where v_service.daily_cap is null or c.rn <= v_service.daily_cap
  order by c.starts_at;
end;
$$;

-- ============================================================================
-- book_appointment
-- ============================================================================

create or replace function public.book_appointment(
  p_tenant_slug text,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text default null
) returns table (
  appointment_id uuid,
  manage_token text
)
language plpgsql
volatile
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_tenant     public.tenants;
  v_service    public.services;
  v_ends_at    timestamptz;
  v_guest_id   uuid;
  v_token      text;
  v_token_hash text;
  v_appt_id    uuid;
  v_slot_ok    boolean;
begin
  select * into v_tenant from public.tenants where slug = p_tenant_slug;
  if not found then
    raise exception 'tenant_not_found' using errcode = 'P0002';
  end if;

  select * into v_service
  from public.services
  where id = p_service_id and tenant_id = v_tenant.id and active = true;
  if not found then
    raise exception 'service_not_found' using errcode = 'P0002';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_service.duration_minutes);

  -- Confirm the slot is in the available set. Range is [starts_at, starts_at + 1 minute)
  -- to keep the comparison exact.
  select exists (
    select 1
    from public.compute_available_slots(
      p_tenant_slug, p_service_id,
      p_starts_at - interval '1 minute',
      v_ends_at + interval '1 minute'
    ) s
    where s.starts_at = p_starts_at and s.ends_at = v_ends_at
  ) into v_slot_ok;

  if not v_slot_ok then
    raise exception 'slot_unavailable' using errcode = '23514';
  end if;

  -- Upsert guest contact.
  insert into public.guest_contacts (tenant_id, name, email, phone)
  values (v_tenant.id, p_guest_name, p_guest_email, p_guest_phone)
  on conflict (tenant_id, email) do update
    set name = excluded.name,
        phone = excluded.phone,
        updated_at = now()
  returning id into v_guest_id;

  -- Generate 32-byte token, base64url-encoded, and SHA-256 hash for storage.
  v_token := translate(encode(gen_random_bytes(32), 'base64'), '+/=', '-_');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  begin
    insert into public.appointments (
      tenant_id, service_id, guest_contact_id,
      starts_at, ends_at, status, manage_token_hash
    )
    values (
      v_tenant.id, p_service_id, v_guest_id,
      p_starts_at, v_ends_at, 'pending', v_token_hash
    )
    returning id into v_appt_id;
  exception when exclusion_violation then
    raise exception 'slot_taken' using errcode = '23P01';
  end;

  appointment_id := v_appt_id;
  manage_token := v_token;
  return next;
end;
$$;

-- ============================================================================
-- verify_manage_token
-- ============================================================================

create or replace function public.verify_manage_token(p_token text)
returns uuid
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_hash text;
  v_id uuid;
  v_status public.appointment_status;
begin
  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  select id, status into v_id, v_status
  from public.appointments
  where manage_token_hash = v_hash;

  if v_id is null or v_status = 'cancelled' then
    raise exception 'appointment_unavailable' using errcode = 'P0002';
  end if;

  return v_id;
end;
$$;

-- ============================================================================
-- grants on RPCs
-- ============================================================================

grant execute on function public.book_appointment(text, uuid, timestamptz, text, text, text)
  to anon, authenticated;
grant execute on function public.verify_manage_token(text)
  to anon, authenticated;
