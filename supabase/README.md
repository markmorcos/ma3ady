# supabase/

Local-first Supabase project — `config.toml`, migrations, seeds, and (later) Edge Functions live here.

## Layout

```
supabase/
├── config.toml             # local stack config (ports, auth, providers)
├── migrations/             # `<NNN>_<slug>.sql` — applied in lexical order
├── functions/              # Edge Functions (added in implement-notifications-pipeline)
│   └── _shared/            # shared helpers (logging, etc.)
├── seed.sql                # local-only seed; idempotent
├── preview-seed.sql        # preview-environment seed; one fixture tenant
└── .env                    # gitignored — local Google OAuth client/secret
```

## Migration naming

- **Format**: `<NNN>_<snake_case_slug>.sql` where `<NNN>` is a zero-padded 3-digit sequential prefix (`001`, `002`, …).
- **Always generate via** `make migrate-new NAME=<slug>`. Never use `supabase migration new` directly — that produces a timestamp prefix we don't use.
- The slug must match `^[a-z][a-z0-9_]*$` (lowercase, underscores, no spaces or dashes).
- The number is computed by listing existing `^[0-9]{3}_` files, sorting, taking the last, parsing the integer, and incrementing — never by counting files. Gaps from rare deletions are preserved.

### Editing rules

- **Never edit a merged migration.** Always add a new one.
- **PR collisions**: if two PRs each add `008_*.sql`, the second-to-merge rebases and re-runs `make migrate-new` to claim `009`. The conflict resolves cleanly: one rename, no SQL change.

## Local workflow

```bash
make dev-up           # boot the local stack (Docker)
make migrate-up       # apply migrations
make seed             # load seed.sql
make dev-down         # stop the local stack
```

`supabase status` after `dev-up` shows the API URL, DB URL, anon key, and service-role key. The anon key goes into `.env.local` as `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The service-role key is never bundled into the mobile app — it's read from `supabase status` for `make seed` and from `supabase secrets` in production.

## Auth providers

- **Google OAuth**: `[auth.external.google]` is enabled. Real `client_id` / `secret` come from `supabase/.env` locally and `supabase secrets set` in preview/production. Wiring lands in the `implement-google-oauth` change.
- **Email / password / magic link**: disabled (`[auth.email].enable_signup = false`). Google is the only sign-in path in v1.
