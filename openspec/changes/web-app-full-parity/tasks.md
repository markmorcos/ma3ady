# Tasks

## Phase 1 — Scaffolding & platform extensions

- [ ] 1.1 Confirm `app.json` already declares `"web": { "bundler": "metro" }`; no change needed.
- [ ] 1.2 Add `pnpm dlx expo install react-native-web react-dom @expo/metro-runtime` if not already installed (verify via `pnpm-lock.yaml`).
- [ ] 1.3 Split `src/services/api/supabase.ts` → `supabase.native.ts` (existing SecureStore-backed) + `supabase.web.ts` (`localStorage`, `detectSessionInUrl: true`, no custom storage adapter). Re-export from `src/services/api/supabase.ts`.
- [ ] 1.4 Add `src/services/notifications/registerPushToken.web.ts` returning a no-op stub. Verify the existing native impl is in `registerPushToken.native.ts` (or split if it's currently a single file).
- [ ] 1.5 Add `src/services/share.ts` wrapper (new) with `.native.ts` (expo-sharing) + `.web.ts` (`navigator.share` + clipboard fallback). Replace all direct `expo-sharing` imports.
- [ ] 1.6 Add `src/services/clipboard.ts` wrapper (new) with `.native.ts` (expo-clipboard) + `.web.ts` (`navigator.clipboard`). Replace all direct `expo-clipboard` imports.
- [ ] 1.7 Add `src/components/DateTimePickerField.tsx` (new wrapper around any existing usage of `@react-native-community/datetimepicker`) with `.native.tsx` and `.web.tsx` (the latter using `<input type="datetime-local">`). Replace direct imports.
- [ ] 1.8 Add `src/components/BottomSheet.tsx` (new wrapper) with `.native.tsx` (`@gorhom/bottom-sheet`) and `.web.tsx` (centered modal). Replace direct `@gorhom/bottom-sheet` imports.
- [ ] 1.9 Add `src/i18n/applyDirection.ts` with `.native.ts` (existing `I18nManager.forceRTL` + reload) and `.web.ts` (`document.documentElement.dir`). Wire it into the `i18n` boot phase.
- [ ] 1.10 Run `pnpm expo export --platform web` locally; fix any metro-web bundling errors that surface from native-only imports the splits didn't cover.

## Phase 2 — Boot, auth, and session on web

- [ ] 2.1 Update the `auth` boot phase runner (`src/boot/defaultRunners.ts` or equivalent) to call `supabase.auth.getSession()` and subscribe to `onAuthStateChange` on web. Native unchanged.
- [ ] 2.2 Split or branch `src/auth/signInWithGoogle.ts` (or wherever `signInWithOAuth` is invoked) so the web path uses `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: \`${window.location.origin}/auth/callback\` } })`.
- [ ] 2.3 Update `app/auth/callback.tsx` to (a) on web, wait for `authStore.session` (populated by `detectSessionInUrl`) with the existing 10s timeout; (b) on native, keep the existing `exchangeCodeForSession` path.
- [ ] 2.4 Register `https://app.ma3ady.com/auth/callback` and `https://preview-app.ma3ady.com/auth/callback` as additional authorized redirect URIs in (a) the Supabase project auth settings (preview + prod) and (b) the Google Cloud Console OAuth client.
- [ ] 2.5 Add `https://app.ma3ady.com` and `https://preview-app.ma3ady.com` to `additional_redirect_urls` in Supabase auth config (preview + prod).
- [ ] 2.6 Verify sign-out path: `supabase.auth.signOut()` already clears `localStorage` keys; ensure `authStore` reset + `tenantStore` clear happen unchanged on web.

## Phase 3 — Responsive shell

- [ ] 3.1 Add `src/components/AppShell.tsx` with `.native.tsx` (pass-through) and `.web.tsx` (left rail ≥ 768px / bottom tabs < 768px).
- [ ] 3.2 Add `src/navigation/getTabs.ts` returning the same destination list for customer (`home, bookings, settings`) and admin (`today, upcoming, services, availability, audit-log, settings`) consumed by both the existing mobile `<Tabs>` and `AppShell.web.tsx`.
- [ ] 3.3 Update `app/(app)/(tabs)/_layout.tsx` and `app/(admin)/(tabs)/_layout.tsx` to render through `<AppShell>`.
- [ ] 3.4 Verify the existing `<TopAppBar>` + tab pill animations render correctly on web at both viewport breakpoints.

## Phase 4 — Customer routes parity check

- [ ] 4.1 Smoke-test `/sign-in` — renders Continue-with-Google, completes Supabase OAuth → callback → home.
- [ ] 4.2 Smoke-test `/onboarding/welcome` → `/onboarding/claim-slug` → `/onboarding/joined` (new tenant flow).
- [ ] 4.3 Smoke-test `/` (customer home) — renders next-appointment card, "Places you visit", "Discover".
- [ ] 4.4 Smoke-test `/bookings` — upcoming/past filter chips, list renders.
- [ ] 4.5 Smoke-test `/bookings/[id]` and `/bookings/[id]/reschedule`.
- [ ] 4.6 Smoke-test `/settings` and `/data-and-privacy`.
- [ ] 4.7 Smoke-test `/tenants/picker` — multi-tenant user can switch.
- [ ] 4.8 Verify RTL on Arabic locale: `document.documentElement.dir === 'rtl'`, flex `start`/`end` mirror correctly, no per-screen layout bugs.

## Phase 5 — Admin routes parity check

- [ ] 5.1 Smoke-test `/admin` (Today) — share-link button, stat tiles, vertical timeline, "Now" pulse.
- [ ] 5.2 Smoke-test `/admin/upcoming` — grouped-by-day list with time pills.
- [ ] 5.3 Smoke-test `/admin/availability` — **30×7 heatmap renders, drag-paint works with mouse, long-press opens exception editor**. (Highest-risk web interaction — verify with manual desktop + tablet viewport runs.)
- [ ] 5.4 Smoke-test `/admin/services` (list), `/admin/service/new`, `/admin/service/[id]`.
- [ ] 5.5 Smoke-test `/admin/audit-log`.
- [ ] 5.6 Smoke-test `/admin/settings` and `/admin/settings/timezone`.
- [ ] 5.7 Smoke-test `/admin/appointment/[id]` and `/admin/appointment/[id]/reschedule`.
- [ ] 5.8 Smoke-test `/admin/dev-tools/errors` and `/admin/dev-tools/error/[id]`.

## Phase 6 — Universal links

- [ ] 6.1 Update `app.json` `ios.associatedDomains`: add `applinks:app.ma3ady.com` and `applinks:preview-app.ma3ady.com`.
- [ ] 6.2 Update `app.json` `android.intentFilters`: add `host: app.ma3ady.com` and `host: preview-app.ma3ady.com` entries.
- [ ] 6.3 Add `web/public/.well-known/apple-app-site-association` (same shape as tenant-landing's, repointed at `app.ma3ady.com`).
- [ ] 6.4 Add `web/public/.well-known/assetlinks.json` (same shape as tenant-landing's, repointed).
- [ ] 6.5 Verify on a physical device that an `https://app.ma3ady.com/...` link opens the installed mobile app, not the browser.

## Phase 7 — Deployment

- [ ] 7.1 Add `web/Dockerfile` — two-stage build (Node 20 builder running `pnpm expo export --platform web`, nginx:alpine runtime).
- [ ] 7.2 Add `web/nginx.conf` — serves `dist/`, SPA fallback `try_files $uri $uri/ /index.html;`, security headers (CSP, X-Frame-Options, etc.).
- [ ] 7.3 Add `web/deployment.yaml` and `web/deployment.preview.yaml` patterned on `tenant-landing/deployment{,.preview}.yaml`; hosts `app.ma3ady.com` / `preview-app.ma3ady.com`; namespaces `ma3ady` / `ma3ady-preview`.
- [ ] 7.4 Add `.github/workflows/deploy-web.yml` — path filters on `app/**`, `src/**`, `assets/**`, `web/**`, `app.json`, `package.json`, `pnpm-lock.yaml`. Build + push to GHCR. Dispatch to infra repo. Preview → production gated by preview success. Manual `workflow_dispatch` input with `target=preview|production|both`.
- [ ] 7.5 Add `app.ma3ady.com` and `preview-app.ma3ady.com` DNS records (Cloudflare) pointing at the cluster ingress.
- [ ] 7.6 Add k8s `Ingress` TLS entries for the two new hostnames.
- [ ] 7.7 Confirm `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are injected at build time in the new workflow (same secret names as mobile build).

## Phase 8 — Tests

- [ ] 8.1 Add `tests/web/` directory with `@testing-library/react` smoke tests for `/sign-in`, `/`, `/bookings`, `/admin`, `/admin/availability`.
- [ ] 8.2 Add a navigation-guard test: unauthenticated request to `/` redirects to `/sign-in`; authenticated request to `/sign-in` redirects to `/` (mirror the mobile behavior).
- [ ] 8.3 Add a CI job `web-export` that runs `pnpm expo export --platform web` headlessly on every PR touching `app/**`, `src/**`, `assets/**`, `web/**` to catch metro-web bundling regressions.
- [ ] 8.4 Add an RTL test: render with `locale = 'ar'` and assert `document.documentElement.dir === 'rtl'`.
- [ ] 8.5 Locale parity test: ensure the same `en.json` / `ar.json` bundles used by mobile are picked up by the web build (no separate JSON files like in tenant-landing).

## Phase 9 — Docs & spec amendments (post-acceptance)

These must wait for the change to be accepted before editing `openspec/project.md`. They are the post-acceptance bookkeeping that closes the change.

- [ ] 9.1 Amend `openspec/project.md` §2 — add a web column to the Expo Go-first table (dispatchers stay mock by default; auth is the only "real on web from day one" item).
- [ ] 9.2 Amend `openspec/project.md` §5 — replace "Session is mobile-only in v1 — no web app to log into" with the new model.
- [ ] 9.3 Amend `openspec/project.md` §6 — add `web-app` to the capabilities table; remove `web-booking-surface` from the deferred list.
- [ ] 9.4 Amend `openspec/project.md` §7 — add web preview/production environments.
- [ ] 9.5 Amend `openspec/project.md` §8 — add the web deploy pipeline pattern.
- [ ] 9.6 Update `openspec/config.yaml` — add `web-app` to `capabilities`; remove `web-booking-surface` from `deferred_capabilities`.
- [ ] 9.7 Move the change folder to `openspec/changes/archive/web-app-full-parity/` (matches the existing archive pattern under `openspec/changes/archive/`).
- [ ] 9.8 Create the materialized capability spec at `openspec/specs/web-app/spec.md` from this change's `specs/web-app/spec.md` (`# web-app Specification` header), following the archive pattern used for `web-booking`.
- [ ] 9.9 Apply the auth, app-shell, deployment deltas into their respective `openspec/specs/<cap>/spec.md` files.
- [ ] 9.10 Update `README.md` to document `app.ma3ady.com` and how to run the web app locally (`pnpm expo start --web` or equivalent).
