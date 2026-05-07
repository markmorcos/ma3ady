-- 018_push_tokens: store one row per (user, device-token) so the Expo Push
-- dispatcher can fan a single notification out to every active install for
-- the same user.

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  -- One row per (user, token). Re-registering the same token on the same
  -- account is a noop; cross-account collisions delete the older binding.
  constraint push_tokens_user_token_uq unique (user_id, token)
);

create index push_tokens_user_active_idx
  on public.push_tokens(user_id) where active;

create index push_tokens_token_idx
  on public.push_tokens(token);

alter table public.push_tokens enable row level security;

-- Users can read + insert + update their own rows. Inserts and updates from
-- the client go through the user-scoped client; the dispatcher uses the
-- service role and bypasses RLS.
create policy push_tokens_select_self
  on public.push_tokens
  for select
  using (user_id = auth.uid());

create policy push_tokens_insert_self
  on public.push_tokens
  for insert
  with check (user_id = auth.uid());

create policy push_tokens_update_self
  on public.push_tokens
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy push_tokens_delete_self
  on public.push_tokens
  for delete
  using (user_id = auth.uid());

grant select, insert, update, delete on public.push_tokens to authenticated;
