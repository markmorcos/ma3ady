# Tasks

- [x] 1.1 Create `secrets/` directory; add to `.gitignore`: `secrets/secrets.local.toml`, `secrets/*.local.toml`, `secrets/*.bak`, `secrets/*.encrypted` (encrypted backups committable later if we adopt age)
- [x] 1.2 Install runtime deps: `pnpm add -D @iarna/toml zod tsx` (also added `@types/node` and `ts-jest` to support node-side TS scripts and tests)
- [x] 1.3 Write `secrets/secrets.example.toml` (committed) with the full schema:
  ```toml
  # Master secrets schema for ma3ady.
  # Populate `secrets/secrets.local.toml` with the same shape; that file is gitignored.
  # `make secrets-sync ENV=preview` fans this out to GitHub Actions, Supabase, and EAS.

  schema_version = "1"

  [github]
  # Used by GH Actions workflows; written via `gh secret set`.
  INFRASTRUCTURE_DISPATCH_TOKEN = ""        # peter-evans/repository-dispatch token
  EXPO_TOKEN = ""                           # for build-mobile.yml
  SUPABASE_ACCESS_TOKEN = ""                # personal access token for `supabase link`
  SUPABASE_PROJECT_REF_PREVIEW = ""
  SUPABASE_PROJECT_REF_PROD = ""
  SUPABASE_DB_PASSWORD_PREVIEW = ""
  SUPABASE_DB_PASSWORD_PROD = ""
  GHCR_PUSH_TOKEN = ""                      # for marketing/tenant-landing image push

  [supabase.preview]
  # Server-side secrets readable by Edge Functions; written via `supabase secrets set --project-ref <preview>`.
  GOOGLE_CLIENT_ID = ""
  GOOGLE_CLIENT_SECRET = ""
  RESEND_API_KEY = ""
  RESEND_FROM = "Ma3ady <hello@ma3ady.com>"
  WHATSAPP_ACCESS_TOKEN = ""
  WHATSAPP_PHONE_NUMBER_ID = ""
  WHATSAPP_TEMPLATE_NAME = "event_notification"
  EMAIL_DISPATCHER = "mock"
  WHATSAPP_DISPATCHER = "mock"
  PUSH_DISPATCHER = "mock"

  [supabase.production]
  GOOGLE_CLIENT_ID = ""
  GOOGLE_CLIENT_SECRET = ""
  RESEND_API_KEY = ""
  RESEND_FROM = "Ma3ady <hello@ma3ady.com>"
  WHATSAPP_ACCESS_TOKEN = ""
  WHATSAPP_PHONE_NUMBER_ID = ""
  WHATSAPP_TEMPLATE_NAME = "event_notification"
  EMAIL_DISPATCHER = "real"
  WHATSAPP_DISPATCHER = "real"
  PUSH_DISPATCHER = "real"

  [eas.preview]
  # EXPO_PUBLIC_* env vars baked into mobile preview builds; written via `eas secret:create`.
  EXPO_PUBLIC_SUPABASE_URL = ""
  EXPO_PUBLIC_SUPABASE_ANON_KEY = ""
  EXPO_PUBLIC_AUTH_REDIRECT_URI = ""
  EXPO_PUBLIC_DEFAULT_LOCALE = "en"
  EXPO_PUBLIC_SHOW_DEV_TOOLS = "1"
  EXPO_PUBLIC_CLIENT_ERROR_SAMPLE_RATE = "1.0"

  [eas.production]
  EXPO_PUBLIC_SUPABASE_URL = ""
  EXPO_PUBLIC_SUPABASE_ANON_KEY = ""
  EXPO_PUBLIC_AUTH_REDIRECT_URI = "ma3ady://auth/callback"
  EXPO_PUBLIC_DEFAULT_LOCALE = "en"
  EXPO_PUBLIC_SHOW_DEV_TOOLS = "0"
  EXPO_PUBLIC_CLIENT_ERROR_SAMPLE_RATE = "0.1"

  [dns.production]
  # Not synced by these scripts — verified by `make dns-check` from the
  # setup-deployment-pipelines change. Listed here so secret-rotation reviews
  # remember to check DNS too.
  spf = 'v=spf1 include:_spf.resend.com -all'
  dmarc = 'v=DMARC1; p=quarantine; rua=mailto:dmarc@ma3ady.com; pct=100'
  # DKIM key value lives only in Cloudflare and Resend; not committed.
  ```
- [x] 1.4 Write `secrets/README.md`:
  - How to populate `secrets/secrets.local.toml` (copy example, fill in values)
  - Where each secret comes from (Resend dashboard, Meta Business, Google Cloud Console, etc.)
  - Rotation procedure: edit master → `make secrets-sync ENV=<env>` → verify
  - Emergency rotation: revoke at source, generate new, update master, sync, restart relevant services
  - Backup recommendation: 1Password vault or `age`-encrypted blob in a separate private repo
- [x] 1.5 Write `scripts/secrets/parse.ts`:
  - Reads `secrets/secrets.local.toml` and `secrets/secrets.example.toml`
  - Walks the example structure and validates the local file (every key in example must exist; non-empty for non-defaulted keys)
  - Exits 0 on success; 1 with a clear list of missing/extra/empty keys on failure
  - Exposes `loadSecrets()` for other scripts
  - (Note: zod was installed but the structural walker turned out simpler than building a recursive zod schema; zod is reserved for future per-field constraint enforcement.)
- [x] 1.6 Write `scripts/secrets/sync-github.ts`:
  - Loads secrets via `parse.ts`
  - For each `[github]` key, shells out: `gh secret set $NAME --body "$VALUE"`
  - Verifies `gh auth status` first; aborts if not logged in
- [x] 1.7 Write `scripts/secrets/sync-supabase.ts`:
  - Args: `ENV=preview` or `ENV=production`
  - Loads `[supabase.$ENV]`
  - Resolves project ref from `[github].SUPABASE_PROJECT_REF_$ENV`
  - Builds a single `supabase secrets set NAME=VALUE NAME=VALUE ... --project-ref $REF` invocation (Supabase CLI accepts batch)
- [x] 1.8 Write `scripts/secrets/sync-eas.ts`:
  - Args: `ENV=...`
  - For each `[eas.$ENV]` key, runs `eas env:create --environment <preview|production> --name NAME --value VALUE --visibility plaintext --type string --non-interactive --force`
- [x] 1.9 Write `scripts/secrets/audit.ts`:
  - Reads the master file
  - For each destination, lists what's currently set (`gh secret list`, `supabase secrets list --project-ref ...`, `eas env:list`)
  - Diffs against the master — reports `MISSING` (in master, not in dest) and `EXTRA` (in dest, not in master)
  - Read-only; never mutates
- [x] 1.10 Write `scripts/secrets/validate.ts`:
  - Used in CI: validates that `secrets/secrets.example.toml` parses and conforms to the v1 schema
  - Asserts no secret has a non-empty `*_TOKEN` / `*_SECRET` / `*_KEY` / `*_PASSWORD` value in the example file (sanity guard against accidental commits)
- [x] 1.11 Add Makefile targets (`secrets-validate`, `secrets-sync-github`, `secrets-sync-supabase`, `secrets-sync-eas`, `secrets-sync`, `secrets-audit`)
- [x] 1.12 Add CI job in `.github/workflows/ci.yml`: runs `pnpm tsx scripts/secrets/validate.ts` against `secrets.example.toml` on every PR
- [x] 1.13 Document the workflow in the top-level `README.md` "First-time setup" section
- [x] 1.14 Tests:
  - `parse.ts` rejects a master file missing a required key
  - `parse.ts` accepts a valid master file
  - `parse.ts` flags an empty value where the schema requires one
  - `parse.ts` flags an extra key
  - `sync-supabase.ts` produces the expected CLI invocation (pure-function `buildSupabaseArgs`)
  - `sync-eas.ts` produces the expected CLI invocation (pure-function `buildEasArgs`)
  - `validate.ts` rejects an example file that contains a non-empty token
  - `validate.ts` rejects a missing top-level section and wrong schema_version
  - 11 tests passing in the `scripts` Jest project
- [x] 1.15 Manual verification — **deferred to user**:
  - Populate `secrets.local.toml` with placeholder values
  - Run `make secrets-validate` → passes
  - Run `make secrets-sync ENV=preview` → values land in GitHub repo settings, Supabase preview project, EAS preview env
  - Rotate one value in master → re-run sync → confirm propagation
  - Run `make secrets-audit` → clean diff
  - **Why deferred**: requires real `gh`/`supabase`/`eas` CLI auth and real project refs.
