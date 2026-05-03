-- 014_client_errors: mobile-side error reporting backend.
--
-- Inserts go through `report-client-error` Edge Function (service role) — RLS
-- denies direct inserts to keep the table from being abused as a write-anywhere
-- log sink. Reads are scoped to admins of the tagged tenant or the user
-- themselves.

create type public.client_error_kind as enum (
  'boundary',
  'unhandled_rejection',
  'manual',
  'network',
  'rls_denied'
);

create table public.client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  kind public.client_error_kind not null,
  message text not null,
  stack text,
  payload jsonb not null default '{}'::jsonb,
  app_version text,
  platform text,
  locale text,
  created_at timestamptz not null default now()
);

create index client_errors_tenant_created_idx
  on public.client_errors(tenant_id, created_at desc);
create index client_errors_user_created_idx
  on public.client_errors(user_id, created_at desc);
create index client_errors_kind_created_idx
  on public.client_errors(kind, created_at desc);

alter table public.client_errors enable row level security;

-- All client-facing inserts are denied; the report-client-error Edge Function
-- writes via the service role.
create policy client_errors_insert_denied
  on public.client_errors
  for insert
  with check (false);

create policy client_errors_select_self
  on public.client_errors
  for select
  using (user_id = auth.uid());

create policy client_errors_select_tenant_admins
  on public.client_errors
  for select
  using (
    tenant_id is not null
    and public.current_user_role_in(tenant_id) in ('owner', 'admin')
  );

create policy client_errors_update_denied
  on public.client_errors
  for update
  using (false)
  with check (false);

create policy client_errors_delete_denied
  on public.client_errors
  for delete
  using (false);
