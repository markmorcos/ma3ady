# web-app spec delta

## ADDED Requirements

### Requirement: The authenticated web app SHALL ship from the same Expo Router source tree as the mobile app

The Expo Router routes under `app/(auth)`, `app/(onboarding)`, `app/(app)`, `app/(admin)`, and `app/auth/callback.tsx` SHALL be the single source of truth for both mobile and web. The web platform MUST be enabled via the existing `app.json` `"web": { "bundler": "metro" }` declaration and exported with `expo export --platform web`. No new application workspace or duplicate route tree MUST be introduced for the web build.

#### Scenario: web export uses the same route tree
- **GIVEN** the repository at a clean checkout
- **WHEN** `pnpm expo export --platform web` runs
- **THEN** every route under `app/(app)/**`, `app/(admin)/**`, `app/(onboarding)/**`, `app/(auth)/**`, and `app/auth/callback.tsx` is present in the exported `dist/` bundle
- **AND** no `app/` route file is duplicated under a separate web workspace
- **AND** the bundle includes `react-native-web` and resolves all `react-native` imports through the RNW alias

#### Scenario: a route added once renders on both platforms
- **GIVEN** a developer adds a new route file `app/(app)/example.tsx`
- **WHEN** the change ships
- **THEN** the route is reachable on mobile via `ma3ady://example`
- **AND** the route is reachable on web at `https://app.ma3ady.com/example`
- **AND** no additional file MUST be created for the web build

### Requirement: Native-only modules SHALL be isolated behind platform-extension wrappers

Every module that wraps a native-only API SHALL be split into `.native.ts(x)` and `.web.ts(x)` variants and re-exported from a platform-agnostic entry point. Feature code MUST NOT contain `Platform.OS === 'web'` branches for choosing implementations of native APIs.

#### Scenario: Supabase client uses the right storage on each platform
- **GIVEN** the split `src/services/api/supabase.native.ts` and `src/services/api/supabase.web.ts`
- **WHEN** a screen imports `import { supabase } from 'src/services/api/supabase'`
- **THEN** on iOS/Android the resolved client uses the `expo-secure-store`-backed adapter
- **AND** on web the resolved client uses the `localStorage` default
- **AND** the importing file contains no platform branch

#### Scenario: no lingering native imports break the web bundle
- **GIVEN** any feature file under `src/features/**` or `app/**`
- **WHEN** `pnpm expo export --platform web` runs
- **THEN** the build succeeds without any "module not found" errors from `expo-secure-store`, `expo-notifications`, `expo-sharing`, `expo-clipboard`, `@react-native-community/datetimepicker`, or `@gorhom/bottom-sheet`
- **AND** the corresponding `.web.ts(x)` wrapper is present for each of those modules

### Requirement: The authenticated web app SHALL be served from `app.ma3ady.com` with a preview at `preview-app.ma3ady.com`

The web image SHALL be deployed behind ingresses for `app.ma3ady.com` (production, namespace `ma3ady`) and `preview-app.ma3ady.com` (preview, namespace `ma3ady-preview`). The image MUST be built from `web/Dockerfile` with `pnpm expo export --platform web` and served by nginx with an SPA fallback so client-side routes resolve correctly on a hard refresh.

#### Scenario: deep-linked refresh resolves
- **GIVEN** an authenticated user on `https://app.ma3ady.com/admin/availability`
- **WHEN** the user hits browser refresh
- **THEN** nginx serves `/index.html` (not 404) and the SPA hydrates onto the same route
- **AND** the user sees the availability heatmap, not a 404 page

#### Scenario: preview environment is parallel
- **GIVEN** a push to `main` that modifies any of `app/**`, `src/**`, `assets/**`, `web/**`, `app.json`, `package.json`, `pnpm-lock.yaml`
- **WHEN** the `deploy-web` workflow runs
- **THEN** the preview image deploys to `preview-app.ma3ady.com` first
- **AND** the production deploy to `app.ma3ady.com` runs only after the preview deploy succeeds

### Requirement: The web sign-in SHALL use Supabase Google OAuth with a direct redirect to `app.ma3ady.com/auth/callback`

The web client SHALL invoke `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '<origin>/auth/callback' } })` and rely on the Supabase web client's `detectSessionInUrl: true` setting to auto-exchange the OAuth code on return. The `auth.ma3ady.com` mobile bounce subdomain MUST NOT be used on web.

#### Scenario: web sign-in round trip
- **GIVEN** an unauthenticated visitor on `https://app.ma3ady.com/sign-in`
- **WHEN** they click "Continue with Google" and consent on the Google screen
- **THEN** Supabase redirects the browser back to `https://app.ma3ady.com/auth/callback?code=...`
- **AND** the web Supabase client auto-exchanges the code (via `detectSessionInUrl: true`)
- **AND** `authStore.session` populates within 10 seconds
- **AND** the callback route navigates onward (home, onboarding, or tenant picker depending on state)

#### Scenario: timeout on the web callback
- **GIVEN** the OAuth callback is in flight
- **WHEN** session exchange does not complete within 10 seconds
- **THEN** the callback screen surfaces the "sign-in took too long" error (same copy as mobile)
- **AND** the user can retry from `/sign-in`
- **AND** no partially-authenticated state persists in `localStorage` or `authStore`

### Requirement: The web app SHALL use `localStorage` for Supabase session persistence

The `src/services/api/supabase.web.ts` client SHALL omit the `storage` option (letting Supabase default to `localStorage`) and SHALL set `persistSession: true`, `autoRefreshToken: true`, and `detectSessionInUrl: true`. Cookies MUST NOT be used for session storage in this change.

#### Scenario: session survives a refresh
- **GIVEN** an authenticated user on `https://app.ma3ady.com/bookings`
- **WHEN** the user refreshes the tab
- **THEN** the Supabase client restores the session from `localStorage`
- **AND** `authStore.session` is populated before the home redirect would otherwise fire
- **AND** the user lands back on `/bookings` (not `/sign-in`)

### Requirement: Sign-out on web SHALL clear `localStorage` session keys and reset all in-memory state

Tapping "Sign out" on web SHALL call `supabase.auth.signOut()` (which removes the `sb-*-auth-token` `localStorage` keys), reset the zustand `authStore`, and clear `tenantStore` so no client-side credential MUST survive the action.

#### Scenario: sign-out from web settings
- **GIVEN** an authenticated user on `/settings`
- **WHEN** they tap "Sign out"
- **THEN** `supabase.auth.signOut()` is called
- **AND** the `sb-*-auth-token` keys are removed from `localStorage`
- **AND** the zustand `authStore` is reset to its initial state
- **AND** `tenantStore` is cleared
- **AND** the user is navigated to `/sign-in`

### Requirement: The web shell SHALL render a left rail on viewports ≥ 768px and bottom tabs below that

The customer and admin tab navigators on web SHALL render their destinations as a 240px left rail at viewport widths ≥ 768px, and as a bottom tab bar at viewport widths < 768px. The same destination list MUST be supplied to both layouts by a single helper so the two shells cannot drift.

#### Scenario: desktop viewport
- **GIVEN** a browser at 1280×800
- **WHEN** the authenticated home renders
- **THEN** the tab destinations are rendered in a left rail occupying ~240px on the leading edge
- **AND** the main content fills the remaining width
- **AND** no bottom tab bar is rendered

#### Scenario: phone-width viewport
- **GIVEN** a browser at 375×812 (or DevTools mobile emulation)
- **WHEN** the authenticated home renders
- **THEN** the tab destinations are rendered as a bottom tab bar
- **AND** no left rail is rendered

### Requirement: The authenticated web app SHALL render exactly the same customer routes as the mobile `(app)` group

The web app SHALL expose, under `app.ma3ady.com`, the following URLs mirroring the mobile customer route tree: `/sign-in`, `/`, `/bookings`, `/bookings/:id`, `/bookings/:id/reschedule`, `/settings`, `/data-and-privacy`, `/tenants/picker`, `/onboarding/welcome`, `/onboarding/claim-slug`, `/onboarding/joined`, `/auth/callback`. Each route MUST reuse the same feature module (`src/features/...`) as the mobile equivalent — no parallel implementation MUST exist.

#### Scenario: customer surfaces are covered
- **GIVEN** the deployed `app.ma3ady.com`
- **WHEN** an authenticated customer navigates to each of `/`, `/bookings`, `/bookings/:id`, `/bookings/:id/reschedule`, `/settings`, `/data-and-privacy`, `/tenants/picker`
- **THEN** every route renders the same content and supports the same actions as the corresponding mobile screen
- **AND** booking, reschedule, and cancel actions go through the same RPCs (`book_appointment`, `reschedule_appointment`, `cancel_appointment`) the mobile app uses

### Requirement: The authenticated web app SHALL render exactly the same admin routes as the mobile `(admin)` group

The web app SHALL expose, under `app.ma3ady.com`, the following admin URLs: `/admin`, `/admin/upcoming`, `/admin/services`, `/admin/service/new`, `/admin/service/:id`, `/admin/availability`, `/admin/audit-log`, `/admin/settings`, `/admin/settings/timezone`, `/admin/appointment/:id`, `/admin/appointment/:id/reschedule`, `/admin/dev-tools/errors`, `/admin/dev-tools/error/:id`. Every admin route MUST reuse the same feature module as the mobile equivalent.

#### Scenario: admin surfaces are covered
- **GIVEN** an authenticated owner of tenant `acme`
- **WHEN** they navigate to `/admin/availability` on `app.ma3ady.com`
- **THEN** the 30×7 weekly heatmap renders the tenant's existing rules + exceptions
- **AND** drag-paint with the mouse commits a band via the same `bulkReplaceRulesForDay` RPC mobile uses
- **AND** long-press of a band opens the same exception editor mobile uses

#### Scenario: admin tenant context comes from state, not URL
- **GIVEN** an owner with memberships in two tenants
- **WHEN** they navigate to `/admin` on `app.ma3ady.com`
- **THEN** the active tenant is read from `useTenantStore.tenantId` (not the URL)
- **AND** switching tenant via `/tenants/picker` then returning to `/admin` shows the other tenant's data

### Requirement: The web app SHALL render Arabic content with `document.documentElement.dir = 'rtl'` and no per-screen RTL branching

When the resolved locale is `ar`, the i18n bootstrap SHALL set `document.documentElement.dir = 'rtl'` via the `src/i18n/applyDirection.web.ts` wrapper before the app first paints. Layout MUST mirror correctly without per-component conditionals because source files use logical CSS / RN flex `start`/`end` properties throughout (per `project.md` §1c).

#### Scenario: Arabic visitor on web
- **GIVEN** a visitor whose resolved locale is `ar`
- **WHEN** they load `https://app.ma3ady.com/bookings`
- **THEN** `document.documentElement.dir === 'rtl'`
- **AND** the bookings list aligns to the leading edge correctly with no visible LTR bleed-through
- **AND** the same `ar.json` keys used by the mobile app supply the strings

### Requirement: The mobile app SHALL intercept `app.ma3ady.com` universal links when installed

`app.json` SHALL list `applinks:app.ma3ady.com` and `applinks:preview-app.ma3ady.com` under `ios.associatedDomains`, and SHALL list both hosts under `android.intentFilters`. The `web/public/.well-known/apple-app-site-association` and `assetlinks.json` files MUST be served by the web nginx image so the OS can verify the association.

#### Scenario: emailed link opens the app on a device with the app installed
- **GIVEN** an iOS user with the mobile app installed
- **WHEN** they tap a link `https://app.ma3ady.com/bookings/abc-123` from Mail
- **THEN** the OS opens the mobile app (not Safari)
- **AND** the app routes to `app/(app)/bookings/[id].tsx` with `id=abc-123`

#### Scenario: same link on desktop opens the web app
- **GIVEN** a desktop user (no mobile app installation possible)
- **WHEN** they click the same link
- **THEN** the link loads in their browser as a normal HTTPS request
- **AND** the web app renders `/bookings/abc-123`

### Requirement: The web app SHALL share `EXPO_PUBLIC_*` environment variables with the mobile build

The web image SHALL be built with the same `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` values the mobile build reads from CI secrets. `SUPABASE_SERVICE_ROLE_KEY` MUST NOT be present in the web image — every authenticated operation goes through the user's JWT and the same RLS policies that scope the mobile app.

#### Scenario: production web build has no service-role key
- **GIVEN** the production web image
- **WHEN** the running container's environment is inspected
- **THEN** `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are present
- **AND** `SUPABASE_SERVICE_ROLE_KEY` is NOT present

### Requirement: A CI job SHALL gate every PR with a successful web export

A `web-export` CI job SHALL run `pnpm expo export --platform web` on every PR that touches `app/**`, `src/**`, `assets/**`, `web/**`, `app.json`, `package.json`, or `pnpm-lock.yaml`. The PR MUST be blocked from merging until the job is green so a native-only import never lands silently on `main`.

#### Scenario: a regression breaks the web bundle
- **GIVEN** a PR that adds `import * as SecureStore from 'expo-secure-store'` to a non-`.native.ts` file
- **WHEN** the `web-export` job runs
- **THEN** the build fails with a clear metro error
- **AND** the PR cannot be merged until the import is moved into a `.native.ts(x)` wrapper

### Requirement: The web app SHALL NOT introduce new server-side capability, RPC, or RLS policy

Every read and write from the web app SHALL go through the existing Supabase anon-key + user-JWT surface and the same RPCs the mobile app uses. No new Edge Function, RPC, or RLS policy MUST be added for the web flow.

#### Scenario: web booking action uses the mobile RPC
- **GIVEN** a customer rescheduling an appointment from `/bookings/:id/reschedule`
- **WHEN** they confirm the new slot
- **THEN** the same `reschedule_appointment` RPC is called
- **AND** the same audit row + notifications queue entries are produced as if the action originated on mobile
