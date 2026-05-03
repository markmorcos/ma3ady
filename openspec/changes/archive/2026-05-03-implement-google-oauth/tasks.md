# Tasks

- [ ] 1.1 Create Google Cloud project + OAuth client (Web application type), set authorized redirect URI to `https://<supabase-project-ref>.supabase.co/auth/v1/callback` — **deferred to user**: requires GCP console access. The project's local `config.toml` already references `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` env vars; populate `supabase/.env` with the values from GCP.
- [x] 1.2 `[auth.external.google]` already configured (set in `setup-supabase-foundations`): `enabled = true`, `client_id = env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)`, `secret = env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)`, `skip_nonce_check = true`. No additional config edit needed.
- [ ] 1.3 `make dev-up` sources `GOOGLE_CLIENT_ID/SECRET` from `.env.local` — **deferred to user**: Supabase CLI auto-loads `supabase/.env` for env() substitution at start. Once GCP creds exist, drop them into `supabase/.env` (gitignored) as `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=...` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=...`.
- [ ] 1.4 Preview/prod: `supabase secrets set --project-ref <ref> SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=... SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=...` — **deferred** (per proposal) to `setup-deployment-pipelines` change. The secrets-sync system already has slots in `secrets/secrets.example.toml` for the values.
- [x] 1.5 Installed `expo-auth-session expo-web-browser expo-crypto` (snapped to SDK 54 via `expo install`).
- [x] 1.6 `src/services/auth/googleSignIn.ts`: `WebBrowser.maybeCompleteAuthSession()` at module load; `signInWithGoogle()` generates PKCE verifier (`expo-crypto.getRandomBytesAsync` + base64url) → SecureStore → SHA-256 challenge → `WebBrowser.openAuthSessionAsync(authUrl, redirectUri)` → extract `?code=...` → `supabase.auth.exchangeCodeForSession(code)` → clear verifier. Pure helpers (`generatePkceVerifier`, `challengeFromVerifier`, `buildAuthorizeUrl`, `extractCode`) exported for unit testing.
- [x] 1.7 `src/state/authStore.ts` rewritten: `session`, `profile`, `loading` state; `setSession`, `setProfile`, `refresh`, `signInWithGoogle`, `signOut`. `refresh()` loads the profile and conditionally fires `claim-bookings` when `profiles.first_signed_in_at` is null (`maybeClaim` swallows errors so a missing Edge Function doesn't block sign-in). `signOut()` also clears `AsyncStorage['app.tenantId']`.
- [x] 1.8 `app/(auth)/_layout.tsx` — Stack wrapped in `RouteErrorBoundary`.
- [x] 1.9 `app/(auth)/sign-in.tsx` — centered logo + tagline, "Continue with Google" primary button, "Continue as guest" ghost button. Loading state on the primary button. Toast on failure (suppressed for "Sign-in cancelled").
- [x] 1.10 `app/auth/callback.tsx` — reads `?code=...`, calls `exchangeCodeForSession` wrapped in a 10s timeout (`Promise.race`-style with AbortController + setTimeout), navigates to `/` on success or shows a "Retry" CTA on failure/timeout.
- [x] 1.11 Edge Function `supabase/functions/claim-bookings/index.ts` — Deno. Validates JWT via the anon client's `getUser()`, then uses the service role key to: (1) update `guest_contacts` matching `email` (case-insensitive) with `claimed_by_user_id`, (2) re-link matching `appointments` to `user_id`, (3) stamp `profiles.first_signed_in_at = now()`. Returns counts. Built but not deployed — needs `supabase functions deploy claim-bookings` once Supabase project is online.
- [x] 1.12 `src/services/api/claimBookings.ts` — typed wrapper around `supabase.functions.invoke('claim-bookings')`.
- [x] 1.13 Boot sequence already wires the auth phase (`defaultRunners.auth` calls `useAuthStore.getState().refresh()` from setup-app-shell). The new `refresh()` body also handles claim-bookings on first sign-in.
- [x] 1.14 `.env.example` updated. `EXPO_PUBLIC_AUTH_REDIRECT_URI=ma3ady://auth/callback` for production; comment documents the dev override (`https://auth.expo.io/@<expo-username>/ma3ady` for Expo Go on a real device).
- [x] 1.15 Tests:
  - `src/services/auth/__tests__/googleSignIn.test.ts` — 4 tests covering PKCE verifier shape (no `+`/`/`/`=`), base64→base64url challenge translation, authorize URL construction, code extraction from redirect URL (and null cases).
  - Sign-out clearing test deferred (involves AsyncStorage + supabase client side effects; harder to make meaningful without a fake supabase).
  - claim-bookings end-to-end test deferred — the Edge Function only runs in `supabase functions serve` which we don't run in jest. Logic-level verification will land when the function is deployed and Mark exercises it on simulator (task 1.16).
  - 73/73 jest tests pass.
- [ ] 1.16 Verify in Expo Go on physical device: full sign-in works, session persists, sign-out works, second sign-in skips claim-bookings — **deferred to user**, requires GCP creds (1.1) and the Edge Function deployed.

## Migrations added

- `008_profiles_first_signed_in_at.sql` — adds the `profiles.first_signed_in_at timestamptz` column the claim-once gate uses.

## TypeScript / lint adjustments

- `tsconfig.json` excludes `supabase/functions/**` (Deno code).
- `eslint.config.js` ignores `supabase/functions/**` for the same reason.
