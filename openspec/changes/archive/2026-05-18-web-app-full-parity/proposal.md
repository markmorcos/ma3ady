# Ship a fully-fledged web app at app.ma3ady.com — full mobile parity

## Why

Today the only browser surface is `tenant-landing/` (Next.js), which covers the marketing pages and the anonymous public booking flow at `ma3ady.com/t/<slug>` + `ma3ady.com/manage/<token>`. Every authenticated surface — customer sign-in, "My bookings", reschedule/cancel, tenant picker, settings, and the entire tenant admin (Today, Upcoming, Services, Availability, Audit log, Settings, Appointment detail, dev-tools) — is mobile-only. `project.md` §5 codifies that: *"Session is mobile-only in v1 — no web app to log into."* `project.md` §6 lists `web-booking-surface` as a deferred capability.

Customers and tenants increasingly ask for a browser experience: customers want to manage bookings without installing an app, and tenants want to run their day from a desktop. Mobile-only also means the (admin) tabs — heavy on data density (heatmap availability editor, audit log, upcoming) — must fit on a phone screen even though desktop is the better form factor for them.

This change ships a single new web surface at `app.ma3ady.com` with **strict parity** to every mobile screen, using the existing Expo Router codebase exported for the web platform (React Native for Web). Mobile and web ship from the same source tree; tenant-landing is unchanged.

## What Changes

### Source tree & platform extensions

- **REUSED** `app/` — the existing Expo Router route tree is the single source of routes for both mobile and web. Web is enabled via the already-present `app.json` `"web": { "bundler": "metro" }` declaration.
- **ADDED** platform splits using Expo's `.web.tsx` / `.native.tsx` extensions for the handful of files that wrap native-only modules:
  - `src/services/api/supabase.ts` → `.native.ts` keeps SecureStore; `.web.ts` uses `localStorage`.
  - `src/components/Clipboard.ts` (new wrapper) → `.native` = `expo-clipboard`; `.web` = `navigator.clipboard`.
  - `src/components/Share.ts` (new wrapper) → `.native` = `expo-sharing`; `.web` = Web Share API with a copy-link fallback.
  - `src/components/DateTimePicker.tsx` → `.native` = `@react-native-community/datetimepicker`; `.web` = a small `<input type="datetime-local">` adapter that emits the same shape.
  - `src/components/BottomSheet.tsx` → `.native` = `@gorhom/bottom-sheet`; `.web` = a centered modal with a backdrop.
  - `src/services/notifications/registerPushToken.ts` → `.native` registers via `expo-notifications`; `.web` is a no-op.
  - `src/i18n/applyDirection.ts` → `.native` uses `I18nManager.forceRTL`; `.web` sets `document.documentElement.dir`.
- **ADDED** `web/` workspace at the repo root containing only deployment artifacts (no source code): `Dockerfile`, `deployment.yaml`, `deployment.preview.yaml`, an nginx config for SPA routing fallback, and `README.md`. The Dockerfile runs `pnpm expo export --platform web` against the repo root and serves the static output with nginx.

### Auth & session

- **MODIFIED** `src/services/api/supabase.ts` (split into `.native.ts` / `.web.ts`): web client uses `localStorage` for session storage, keeps `flowType: 'pkce'`, sets `detectSessionInUrl: true` so the OAuth code in the URL is exchanged automatically on return to `app.ma3ady.com/auth/callback`.
- **MODIFIED** `src/auth/signInWithGoogle.ts` (or wherever the OAuth entry point lives — split if needed): web path calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://app.ma3ady.com/auth/callback' } })` and lets Supabase handle the redirect chain. Mobile path remains `expo-auth-session` + `WebBrowser.openAuthSessionAsync`.
- **MODIFIED** `app/auth/callback.tsx` to also work on web: on web, the page reads `?code=` from the URL (handled automatically by `detectSessionInUrl: true`) and routes onward based on `authStore.session`. The 10-second timeout requirement (`auth` spec) carries over.
- **MODIFIED** Supabase project config — register `https://app.ma3ady.com/auth/callback` and `https://preview-app.ma3ady.com/auth/callback` as additional authorized redirect URLs in the Supabase dashboard. Google Cloud Console OAuth client gets the same redirect URIs added.
- **CONFIRMED** the existing `auth.ma3ady.com/callback` bounce does NOT need changes for the web flow — web sign-in lands directly on `app.ma3ady.com/auth/callback` without going through the auth subdomain (the auth subdomain bounce exists only to translate from Google's HTTPS redirect to the mobile deep-link scheme).

### Responsive navigation

- **ADDED** `src/components/AppShell.web.tsx` — a responsive shell that renders the customer/admin tabs as a left rail on viewports ≥ 768px and as a bottom tab bar below that. Mobile native is unchanged.
- **MODIFIED** `app/(app)/(tabs)/_layout.tsx` and `app/(admin)/(tabs)/_layout.tsx` to delegate to `<AppShell>` (which is platform-split). On native, this is a thin pass-through to the existing `Tabs` layout; on web, it picks rail-vs-bottom based on viewport width.

### Customer routes on web (parity with mobile `(app)` group)

All routes below are URL paths under `app.ma3ady.com`:

- `/sign-in` — mirrors `app/(auth)/sign-in.tsx`. Web variant uses the web OAuth flow.
- `/onboarding/welcome`, `/onboarding/claim-slug`, `/onboarding/joined` — mirror `app/(onboarding)/*`.
- `/auth/callback` — mirrors `app/auth/callback.tsx`, web-aware as above.
- `/` (home), `/bookings`, `/bookings/[id]`, `/bookings/[id]/reschedule`, `/settings`, `/data-and-privacy`, `/tenants/picker` — mirror `app/(app)/*`.

No new screens or business logic. Each mirror reuses the existing `src/features/...` modules.

### Admin routes on web (parity with mobile `(admin)` group)

- `/admin` (today), `/admin/upcoming`, `/admin/services`, `/admin/service/new`, `/admin/service/[id]`, `/admin/availability`, `/admin/audit-log`, `/admin/settings`, `/admin/settings/timezone`, `/admin/appointment/[id]`, `/admin/appointment/[id]/reschedule`, `/admin/dev-tools/errors`, `/admin/dev-tools/error/[id]`.

The mobile `(admin)/(tabs)/availability.tsx` heatmap drag-paint interaction (per `design-system-m3-revamp/design.md`) uses `react-native-gesture-handler`; on web, RNGH supports pan via the mouse, so no rewrite is needed — only a viewport-sensitivity sweep.

### Deployment

- **ADDED** `web/Dockerfile` — multi-stage. Stage 1: `pnpm install` + `pnpm expo export --platform web` → `dist/`. Stage 2: nginx:alpine serving `dist/` with SPA fallback (`try_files $uri $uri/ /index.html;`).
- **ADDED** `web/deployment.yaml` and `web/deployment.preview.yaml` — patterned on `tenant-landing/deployment{,.preview}.yaml`; namespaces `ma3ady` and `ma3ady-preview`; ingress hostnames `app.ma3ady.com` and `preview-app.ma3ady.com`.
- **ADDED** `.github/workflows/deploy-web.yml` — patterned on `deploy-tenant-landing.yml`: builds the web image, pushes to GHCR, dispatches deployment to the infrastructure repo. Path filter `**/*` minus `tenant-landing/**` and a curated exclude list — or simpler, trigger on any change to `app/**`, `src/**`, `assets/**`, `web/**`, or root `package.json`/`app.json`.
- **ADDED** Supabase config — register `app.ma3ady.com` and `preview-app.ma3ady.com` as additional `site_url`/`additional_redirect_urls` so OAuth and password recovery (where used) consider them safe.

### Universal Links

- **MODIFIED** `app.json` `ios.associatedDomains` to add `applinks:app.ma3ady.com` and `applinks:preview-app.ma3ady.com`, and `android.intentFilters` to include `app.ma3ady.com`/`preview-app.ma3ady.com` hosts. Reason: a customer who has the mobile app installed and follows an emailed manage-token link should land in the native app, not the web app.
- **ADDED** `web/public/.well-known/apple-app-site-association` and `.well-known/assetlinks.json` served from the web image — same content as the tenant-landing versions, repointed at `app.ma3ady.com`.

### i18n & RTL

- **MODIFIED** `src/i18n/index.ts` (or equivalent bootstrap) — call `applyDirection(locale)` which sets `document.documentElement.dir` on web and `I18nManager.forceRTL()` on native. The locale strings themselves are reused; the `tenant-landing` JSON parity test pattern continues to apply.

### Tests

- **ADDED** `tests/web/` — Jest + `@testing-library/react` smoke tests for the major routes (`/sign-in`, `/`, `/bookings`, `/admin`, `/admin/availability`) verifying they render against a mocked Supabase client and that the unauthenticated guard redirects to `/sign-in`.
- **ADDED** a CI job `web-export` that runs `pnpm expo export --platform web` headlessly to catch metro-web bundling regressions on PRs touching `app/**`, `src/**`, `assets/**`, or `web/**`.

### Source-of-truth amendments (post-acceptance)

This change references `openspec/project.md` and the change tasks include amending it once accepted:

- **§2 Expo Go-first table** — add a "web" column that documents which dispatchers are mock vs real on web (same defaults as native).
- **§5 Auth Model** — replace the sentence *"Session is mobile-only in v1 — no web app to log into"* with the new model: session lives on `app.ma3ady.com` too, via `localStorage`-backed Supabase client, with the same Google-only provider.
- **§6 Capabilities Map** — promote `web-booking-surface` out of the deferred list; add a new `web-app` capability covering the authenticated web surface. `web-booking` keeps its existing scope (public booking surface) and continues to live in tenant-landing.
- **§7 Environments** — add preview/production rows for the web app (`preview-app.ma3ady.com`, `app.ma3ady.com`).
- **§8 Deployment** — add the web deploy pipeline pattern (mirrors tenant-landing).
- **`openspec/config.yaml`** — add `web-app` to `capabilities`, remove `web-booking-surface` from `deferred_capabilities` (the existing `web-booking` capability already covers public booking — this change is orthogonal).

## Impact

- Affects capabilities: **web-app** (new), **auth** (web sign-in flow + session storage), **app-shell** (responsive nav + platform extensions + boot on web), **deployment** (new pipeline), **i18n** (web RTL bootstrap). No data model changes; no new Supabase tables, columns, RPCs, or RLS policies.
- Affects domains: new DNS for `app.ma3ady.com` + `preview-app.ma3ady.com`; new Supabase authorized redirect URLs; new Google Cloud Console OAuth redirect URIs.
- Affects mobile builds: `app.json` adds `app.ma3ady.com` to `associatedDomains` and Android `intentFilters`. Existing `ma3ady.com`/`preview.ma3ady.com` entries unchanged — tenant-landing continues to be the universal-link target for `/t/<slug>` and `/manage/<token>`.
- **Out of scope** (explicit non-goals):
  - **Web Push notifications.** Service Worker + Web Push API will be a separate change; the `notifications` dispatcher pattern continues unchanged and web's push token registration is a no-op.
  - **Wildcard `<slug>.ma3ady.com` for the authenticated app.** Admin uses tenant picker, not URL slug. The wildcard remains a deferred infrastructure concern for tenant-landing only.
  - **Migrating tenant-landing's public booking to RNW.** Public booking stays Next.js for SSR/SEO/share-link previews.
  - **New product features.** This change is strict parity only — no new screens, no new flows.
  - **SSR for authenticated routes.** Static SPA export is sufficient; authenticated content is not indexable and benefits from CDN edge caching of the static bundle.
  - **Server-side rendered marketing pages migration.** `ma3ady.com` and its marketing/public-booking content stay on tenant-landing untouched.
