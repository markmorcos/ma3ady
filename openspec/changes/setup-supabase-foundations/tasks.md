# Tasks

- [ ] 1.1 `pnpm dlx supabase init` — generates `supabase/config.toml`
- [ ] 1.2 Edit `config.toml` to set ports (54321 / 54322 / 54323), `auth.site_url = "ma3ady://"`, `auth.additional_redirect_urls = ["exp://", "ma3ady://auth/callback", "http://localhost:8081/--/auth/callback"]`
- [ ] 1.3 In `config.toml`, configure `[auth.external.google]` placeholder (real client id/secret set via `supabase secrets set` in the `implement-google-oauth` change)
- [ ] 1.4 Disable email/password (`[auth.email] enable_signup = false`) and disable magic-link sign-up
- [ ] 1.5 Add `supabase/.gitignore` for `.branches/`, `.temp/`
- [ ] 1.6 Write `supabase/migrations/000_init.sql`: `create extension if not exists pgcrypto;`, `create extension if not exists btree_gist;`
- [ ] 1.7 Write `supabase/seed.sql` with file-level comment: "Local-only seed. Idempotent. Truncate-and-insert per table."
- [ ] 1.8 Write `supabase/preview-seed.sql` with a single fixture tenant `('demo','Demo Clinic','Europe/Berlin','en')` — full row schema lands in the `define-tenancy-model` change
- [ ] 1.9 Install `@supabase/supabase-js` + `expo-secure-store`: `pnpm add @supabase/supabase-js expo-secure-store`
- [ ] 1.10 Write `src/services/api/supabase.ts`: factory creating client with `flowType: 'pkce'`, `detectSessionInUrl: false`, `persistSession: true`, `storage: secureAuthStorage` (SecureStore wrapper)
- [ ] 1.11 Write `src/state/authStore.ts`: zustand store with `session: Session | null`, `loading: boolean`, `setSession`, `signOut`, `refresh` — sign-in methods stubbed (real impls land in the `implement-google-oauth` change)
- [ ] 1.12 Add to `.env.example`: `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `EXPO_PUBLIC_SUPABASE_ANON_KEY=<from supabase status>`
- [ ] 1.13 Verify `make dev-up` boots local Supabase, `supabase status` reports healthy
- [ ] 1.14 Verify `make migrate-up` runs `000_init.sql` cleanly
- [ ] 1.15 Verify `make seed` succeeds (no-op until the `define-tenancy-model` change adds tables)
- [ ] 1.16 Document the migration naming convention in a top-of-file comment on `000_init.sql`: `NNN_snake_case.sql`, sequential, no timestamp, never edit a merged migration — always add a new one
