# Ma3ady — Project Source of Truth

> Read this before any change proposal. Architectural decisions live here, not in code comments and not in change folders. Change proposals reference this document; deltas update specific sections by ID.

## 1. Project Identity

**Ma3ady** (Arabic ميعادي, "my appointment") is a multi-tenant appointment booking platform delivered primarily as a mobile app (Expo + React Native) backed by Supabase. Customers browse a tenant's availability anonymously and book without creating an account; bookings are managed via signed-token deep links or claimed into a Google account. Tenants — clinics, salons, tutors, coaches, etc. — sign up with Google, claim a subdomain (`<slug>.ma3ady.com`), define services, set weekly availability rules, and run their day from the same mobile app in admin mode.

The product replaces an unused legacy Rails 8 + Expo prototype (`/Users/markmorcos/Projects/booking`). There is no data migration; ma3ady starts empty.

### 1a. Brand Identity

- **Name**: ma3ady (latin), ميعادي (arabic). The "3" is the standard Arabizi rendering of ع (ʿayn).
- **Wordmark**: lowercase `ma3ady` set in a custom-cut geometric sans (Inter / Geist as base, custom 'a' and '3').
- **Mark**: the numeral **3** doubles as a clock face — stylized rotation marks at 12/3/6/9 positions, optional minute/hour hand inside the right-facing curve. Single-color capable. Works at 16px (favicon — just the 3) and 1024px (app icon — full mark).
- **Arabic counterpart**: `ميعادي` set in Tajawal Bold or IBM Plex Sans Arabic. The "ع" gets the same clock treatment if it scales; otherwise Arabic locks the wordmark and the clock-3 lives only in the Latin form.
- **Tagline (en)**: "Booking, simplified."
- **Tagline (ar)**: "حجز أبسط."
- **Voice**: friendly, terse, human. "Pick a time" not "Please select your preferred appointment slot." Bilingual-first.

### 1b. Design System Principle

- 8px spacing grid, radii from {8, 12, 16, 24} (cards = 16, buttons = 12).
- Typography scale: 12 / 14 / 16 / 18 / 20 / 24 / 32 / 40.
- Latin font: Inter Variable. Arabic font: IBM Plex Sans Arabic (or Tajawal as fallback).
- Light + dark + system themes. Colors expressed as semantic tokens (`brand.500`, `surface`, `border`, etc.), never hex literals in components.
- Iconography: **Lucide** (`lucide-react-native`). Drop Feather.

#### Color tokens (initial)

| Token | Light | Dark | Use |
|---|---|---|---|
| `brand.500` | `#0F766E` | `#2DD4BF` | primary CTA, brand mark |
| `brand.600` | `#0E6660` | `#14B8A6` | pressed states |
| `accent.500` | `#F59E0B` | `#FBBF24` | "now" indicator, highlights |
| `bg` | `#FAFAF9` | `#0A0A0A` | app background |
| `surface` | `#FFFFFF` | `#171717` | cards |
| `border` | `#E7E5E4` | `#262626` | dividers |
| `text` | `#0C0A09` | `#FAFAF9` | primary text |
| `muted` | `#78716C` | `#A8A29E` | secondary text |
| `success` | `#10B981` | `#34D399` | confirmed, completed |
| `warning` | `#F59E0B` | `#FBBF24` | pending, no-show flag |
| `danger` | `#EF4444` | `#F87171` | cancel, errors |

Status mapping: `pending → warning`, `confirmed → brand`, `completed → success`, `cancelled → muted`, `no_show → danger`.

### 1c. Accessibility Baseline

- **WCAG 2.1 AA** for color contrast, focus indicators, hit targets (min 44×44px), screen reader labels on all interactive elements.
- All colored status must also be communicated by icon and label, never color alone.
- Dynamic Type / font scaling honored up to at least 1.3×.
- RTL layouts must mirror correctly — no hardcoded `left`/`right`, use `start`/`end`.

### 1d. GDPR Baseline

- **Lawful basis**: contract performance (booking) + legitimate interest (transactional notifications).
- **Data minimization**: collect only name, email, optional phone, plus Google profile (sub, email, name) for authenticated users. Google profile picture is **not** stored (no avatar surface in v1).
- **Retention**: cancelled appointments retained 90 days then anonymized (PII nulled, audit row kept). No-show appointments retained 18 months for tenant analytics.
- **Right to be forgotten**: any user (customer or tenant member) may delete their account; appointment history is anonymized but kept (tenant business records).
- **Sub-processors**: Supabase (EU region), Resend (email), Meta WhatsApp Cloud API, Expo Push (later phase). Listed in the public privacy policy.
- **Cookie banner**: only on the marketing website (`ma3ady.com`). The mobile app does not use third-party trackers in v1; analytics is in-house only.

### 1f. No User-Uploaded Storage in v1

There is **no Supabase Storage bucket** in v1. No tenant logos, no service images, no avatars, no attachments. Brand identity is name + brand color only. Adding a storage layer is a deferred capability (`storage-and-uploads`); it would require RLS on storage objects, a virus-scan policy, image transforms, and a CDN strategy — collectively too much for v1 scope. This means: the database has no `logo_url`, `avatar_url`, or similar columns.

### 1e. Per-Tenant Data Isolation Is Law

Every table that holds tenant-owned data (`services`, `availability_rules`, `availability_exceptions`, `appointments`, `notifications`, etc.) carries `tenant_id` as a NOT NULL column and a Postgres RLS policy that scopes reads and writes to memberships. There are no application-level tenant filters that bypass RLS — the database is the enforcement boundary. Edge Functions use the user's JWT, not the service role, for any tenant-scoped operation. The service role is reserved for system jobs (cleanup, scheduled reminders) and is never exposed to clients.

## 2. Top-Level Constraint: Expo Go-First, Mock-First Dispatchers

This project deliberately defers the cost of cutting custom dev clients. Daily development must work in **Expo Go** for as long as possible. Capabilities that require native modules are deferred behind feature flags or mocked behind dispatcher interfaces:

| Capability | Phase 1 (Expo Go) | Web build (`app.ma3ady.com`) | Later (dev client) |
|---|---|---|---|
| Auth | Supabase Google OAuth via `expo-auth-session` + `WebBrowser.openAuthSessionAsync` | Browser redirect via `supabase.auth.signInWithOAuth({ provider: 'google' })` + `detectSessionInUrl` | Native `@react-native-google-signin/google-signin` |
| Push notifications | `EXPO_PUBLIC_NOTIFICATION_DISPATCHER=mock` (in-app toasts only, log to `notifications` table) | No-op (`registerForPush.web.ts` returns null; Web Push is a deferred capability) | `expo-notifications` with APNs/FCM |
| WhatsApp send | `WHATSAPP_DISPATCHER=mock` (Edge Function logs payload, no API call) | Same as mobile (server-side dispatcher, platform-agnostic) | Real Meta Cloud API call |
| Email send | `EMAIL_DISPATCHER=mock` (Edge Function logs to `notifications`) | Same as mobile | Resend live keys |
| Splash / app icon | Expo defaults | Static `<title>` + CSS-backed initial paint (no native splash on web) | Native splash, adaptive icon, themed Android icon |
| Deep linking | `exp://` in Expo Go | `https://app.ma3ady.com/*` paths (Expo Router web export); universal-link interception via `applinks:app.ma3ady.com` opens the mobile app where installed | `ma3ady://` + universal links via `apple-app-site-association` and Android Asset Links |
| Mobile crash reports | console.error → in-app `client_errors` reporter via Edge Function | `<RootErrorBoundary>` / `<RouteErrorBoundary>` same flow; `reloadApp.web.ts` does `window.location.reload` instead of `Updates.reloadAsync` | Native crash hooks (Sentry, deferred) |
| Session storage | `expo-secure-store` | Supabase JS default = browser `localStorage` | unchanged |

**Rule**: a change proposal that adds capability requiring a dev client MUST mark itself as "Phase: dev-client required" in `proposal.md` and explain why a mock is insufficient. Default mode is `mock` for all dispatchers; production builds must set every dispatcher to `real`. Every native-only module the web build does not support MUST be wrapped behind a `.native.ts(x)` / `.web.ts(x)` platform-extension pair so feature code never `Platform.OS`-branches.

## 3. Tenancy Model

Multi-tenant. Tenant identity = a unique `slug` matching `^[a-z0-9-]+$`, served at `<slug>.ma3ady.com` and used as the deep-link key in the mobile app.

- **`tenants`**: `id`, `slug` (unique), `name`, `timezone` (IANA, per-tenant), `default_locale` (`en`|`ar`), `brand_color`, `created_at`.
- **`memberships`**: `(user_id, tenant_id, role)` — a single user may belong to multiple tenants with different roles. Roles: `owner`, `admin`, `staff`, `customer`. (Customer membership is created when a guest later signs in with Google and we link prior bookings.)
- **Reserved slugs** (cannot be claimed): `www, app, admin, auth, api, cdn, static, mail, support, status, blog, docs, help, dashboard, console, billing, ma3ady, public, dev, staging, test, preview, beta`.
- **Subdomain serving**: a single Docker image serves all `<slug>.ma3ady.com` traffic; tenant resolved by `Host` header. Wildcard DNS at Cloudflare, wildcard TLS via the infrastructure ingress.
- **Cross-tenant access**: a user with multiple memberships sees a tenant picker on first sign-in per session; selected tenant is stored in app state and validated server-side on every query via RLS.
- **Per-staff resources are out of scope for v1**. Availability rules belong to the tenant, not to individual staff members. (Deferred capability: `staff-resources`.)

## 4. Availability Model — Rules, Not Slots

The legacy app pre-generated `availability_slot` rows. Ma3ady computes slots on read from rules + exceptions − existing appointments. Rationale: schedule changes become 1-row updates instead of regenerations; DST and timezone behave correctly; "always show 8 weeks ahead" is free.

### Tables

- **`availability_rules`**: `id, tenant_id, service_id (nullable — null = applies to all services), day_of_week (0–6, ISO Monday=1)*, start_time (time, in tenant timezone), end_time (time), valid_from (date, nullable), valid_until (date, nullable)`. *Stored as `time without time zone` and combined with the tenant's IANA zone at compute time.
- **`availability_exceptions`**: `id, tenant_id, service_id (nullable), kind enum('block','extra'), starts_at timestamptz, ends_at timestamptz, reason text`.
- **`services`**: `id, tenant_id, name, description, duration_minutes, buffer_before_min, buffer_after_min, min_notice_min, max_advance_days, daily_cap (nullable), active boolean`.
- **`appointments`**: `id, tenant_id, service_id, user_id (nullable for anonymous), guest_contact_id (nullable), starts_at timestamptz, ends_at timestamptz, status enum, notes, cancelled_at, cancelled_by_user_id, manage_token_hash, created_at, updated_at`.
- **`guest_contacts`**: `id, tenant_id, name, email, phone (nullable), claimed_by_user_id (nullable, set on later Google sign-in)`.

### Postgres function `compute_available_slots(tenant_slug, service_id, range_start, range_end)`

Returns `setof timestamptz` representing available slot start times. Implementation outline:

1. Resolve tenant and timezone.
2. Expand `availability_rules` over the date range in tenant TZ → candidate intervals.
3. Subtract `availability_exceptions` of `kind='block'`; add intervals of `kind='extra'`.
4. Tile each interval into `service.duration_minutes` slots, observing `buffer_before_min` and `buffer_after_min`.
5. Filter to `now() + min_notice_min ≤ slot_start ≤ now() + max_advance_days`.
6. Subtract slots overlapping any non-cancelled appointment for the service.
7. Apply `daily_cap` per tenant TZ day if set.

### Booking validation — DB-enforced

`appointments` carries a Postgres `EXCLUDE` constraint:

```sql
exclude using gist (
  tenant_id with =,
  service_id with =,
  tstzrange(starts_at, ends_at) with &&
) where (status not in ('cancelled', 'no_show'))
```

Race conditions resolve at insert time — the loser gets a constraint violation that the Edge Function maps to a clean "slot just got taken, please pick another" error.

## 5. Auth Model

**Supabase Auth, Google OAuth only.** No magic link, no email/password, no Apple Sign-In in v1. PKCE flow, SecureStore-backed session storage on mobile (mirrors stminaconnect).

### Three identity classes

1. **Anonymous customers** — book without an account. Identity is a row in `guest_contacts` (name + email + optional phone). They receive an email with a "manage my booking" link containing a signed JWT (`manage_token`); the link opens a deep-link/universal-link in the mobile app to a public manage screen. The token is single-purpose, bound to a specific appointment, expires on the appointment's `ends_at + 30 days`.
2. **Authenticated customers** — signed in with Google. They get an `auth.users` row, a `profiles` row, and a `memberships` row with role `customer` for any tenant they've booked with. Prior anonymous bookings under the same email are claimed at sign-in time (Edge Function `claim-bookings`).
3. **Tenant members** (owner/admin/staff) — signed in with Google, have `memberships` rows with elevated roles. Tenant onboarding is "sign in with Google → claim a slug → become owner".

### Mobile auth flow (Expo Go-compatible)

- `expo-auth-session` + `WebBrowser.openAuthSessionAsync` → Supabase OAuth URL → Google consent → callback at `https://auth.ma3ady.com/callback?code=...`
- The auth subdomain reads the `state` to know the original tenant subdomain, redirects to a deep link `ma3ady://auth/callback?code=...` (or `exp://...` in Expo Go).
- App route `app/auth/callback.tsx` calls `supabase.auth.exchangeCodeForSession(code)`, hydrates `authStore`, fetches memberships, navigates to the appropriate stack.

### Cookie / session scope

Sessions exist on both mobile and the web app at `app.ma3ady.com`. The mobile client persists the Supabase session via `expo-secure-store`; the web client uses the browser's `localStorage` (Supabase JS default) with `detectSessionInUrl: true` so the OAuth code is auto-exchanged on return to `/auth/callback`. The marketing site at `ma3ady.com` (and `preview.ma3ady.com`) is fully unauthenticated. The `auth.ma3ady.com` callback is the mobile bounce only — the web flow registers `https://app.ma3ady.com/auth/callback` (and `preview-app.ma3ady.com/auth/callback`) as additional authorized Google redirect URIs and does not pass through the auth subdomain.

## 6. Capabilities Map

Each capability gets one folder under `openspec/specs/<capability>/spec.md` once accepted. Initial set:

| Capability | Owns |
|---|---|
| `app-shell` | Expo Router structure, route groups, navigation primitives, splash, error boundaries, boot sequence, `useDisplayTimezone` |
| `branding` | Wordmark + clock-3 mark assets, color tokens, typography, voice |
| `design-system` | Component library, theme provider, light/dark/system, RTL helpers |
| `i18n` | i18next setup, en+ar locales, RTL bootstrap, locale persistence |
| `dev-tooling` | Makefile, Husky, ESLint, Prettier, Jest setup, `/dev/*` debug screens, `secrets` fanout |
| `auth` | Supabase Google OAuth, callback, authStore, session lifecycle, sign-out |
| `tenancy` | tenants + memberships tables, RLS, slug validation, reserved list, tenant picker |
| `availability` | rules + exceptions + `compute_available_slots`, weekly grid editor |
| `services` | service CRUD, duration/buffer/notice/cap config |
| `appointments` | book/cancel/reschedule/complete/no-show flows, status state machine, EXCLUDE constraint |
| `public-booking` | anonymous booking flow, guest_contacts, signed manage-token links, claim-on-sign-in |
| `admin` | mobile-first admin mode (today's bookings, slot management, services, team) |
| `notifications` | dispatcher pattern (mock\|real) for email/whatsapp/push, `notifications` audit table, reminder cron |
| `audit-log` | `tenant_audit_events` for memberships, services, rules, tenants; admin viewer; retention |
| `observability` | Supabase logs as backend source of truth, `client_errors` table, structured logging conventions |
| `marketing-site` | Next.js marketing site at `ma3ady.com` (en + ar homepages, legal pages, sitemap/robots) |
| `web-app` | Authenticated + public-booking web surface at `app.ma3ady.com`, exported from the Expo Router tree via React Native for Web |
| `deployment` | Dockerfiles, deployment.yaml, GH Actions for marketing/web/supabase/mobile, email deliverability (SPF/DKIM/DMARC) |
| `compliance` | privacy policy + terms renderer (en/ar), data retention jobs, deletion flows, brand assets finalization |

Deferred capabilities (no change folder yet, will land as separate proposals when scheduled):

- `storage-and-uploads` — Supabase Storage bucket for tenant logos / service images. Out of v1.
- `staff-resources` — per-staff schedules and assignment.
- `paid-bookings` — Stripe / payment intents.
- `native-push` — `expo-notifications` with APNs/FCM and `expo_push_tokens` table.
- `native-google-signin` — `@react-native-google-signin/google-signin` for one-tap.
- `web-push` — Service Worker + Web Push API on `app.ma3ady.com` (mobile pushes are tracked under `native-push`).
- `additional-locales` — de, fr, etc.

## 7. Environments

- **Local**: `make dev-up` boots local Supabase (Docker). Mobile app talks to `http://127.0.0.1:54321` from Expo Go on the LAN. Web app boots via `pnpm expo start --web` and points at the same local Supabase. Dispatchers all `mock`.
- **Preview**: shared Supabase preview project (one ref). PR previews of the marketing site at `preview.ma3ady.com` and of the web app at `preview-app.ma3ady.com`. Mobile preview builds via `eas build --profile preview` (later phase). Dispatchers `mock` except auth.
- **Production**: separate Supabase production project. Marketing site at `ma3ady.com`. Web app at `app.ma3ady.com`. Mobile app on App Store + Play Store. Dispatchers all `real`.

## 8. Deployment

- **Mobile**: EAS Build + EAS Submit, profiles `development | preview | production`. `build-prod` target gated by interactive confirmation. Manual `workflow_dispatch` only — no auto-build on push.
- **Supabase**: GH Actions on push to `supabase/migrations/**` or `supabase/functions/**`. `deploy-preview` job → `deploy-production` job, sequential. `supabase link` → `supabase db push` → `supabase functions deploy <list>`.
- **Marketing site**: Docker image built and pushed to `ghcr.io/markmorcos/ma3ady-marketing` on push to `marketing/**`, then `repository-dispatch` to `markmorcos/infrastructure` carrying `marketing/deployment.yaml`.
- **Web app**: Docker image (Expo Router web export → nginx) built and pushed to `ghcr.io/markmorcos/ma3ady-web` on push to `app/**`, `src/**`, `assets/**`, `web/**`, or the root build config files. Same `repository-dispatch` pattern carrying `web/deployment.yaml`. `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are baked into the static bundle at build time from k8s Secrets.
- **DNS**: Cloudflare. `ma3ady.com` + `preview.ma3ady.com` → marketing. `app.ma3ady.com` + `preview-app.ma3ady.com` → web app. `auth.ma3ady.com` → Supabase OAuth bounce (mobile only).

## 9. Roadmap

Phases are advisory, not contractual. Each phase is one or more `openspec/changes/<slug>/` proposals. A phase ships when its changes are accepted and the resulting code is on `main`.

- **Phase 0 — Foundations**: `setup-monorepo-and-tooling`, `setup-secrets-sync`, `setup-supabase-foundations`, `setup-app-shell`. Empty Expo app boots in Expo Go, hits local Supabase, has theme + i18n providers, single-source-of-truth secrets fanout works.
- **Phase 1 — Identity & design**: `setup-i18n-en-ar`, `setup-design-system`. en+ar with RTL, full component library, dev-tooling design-system showcase.
- **Phase 2 — Domain schema**: `define-tenancy-model`, `define-availability-rules`, `define-services-and-appointments`, `setup-tenant-audit-log`. All tables, RLS, `compute_available_slots`, EXCLUDE constraint, audit triggers.
- **Phase 3 — Auth + onboarding**: `implement-google-oauth`, `implement-tenant-onboarding`. Sign-in works in Expo Go; tenant claim flow live.
- **Phase 4 — Public booking flow**: `implement-public-booking-flow`. Anonymous browse → book → manage via token deep link.
- **Phase 5 — Admin mobile mode**: `implement-admin-mobile-dashboard`, `implement-availability-rules-grid`. Today screen, services CRUD, team management, rules grid.
- **Phase 6 — Lifecycle + comms**: `implement-reschedule-and-cancel`, `implement-notifications-pipeline`. State machine, dispatcher pattern (mock), `pg_cron` reminders, audit trail.
- **Phase 7 — Observability**: `setup-observability`. Supabase logs configured, `client_errors` reporter live, structured logging conventions enforced.
- **Phase 8 — Marketing + web app**: `setup-marketing-site` (Next.js marketing at `ma3ady.com`, en+ar, legal pages), `web-app-full-parity` (Expo Router web export at `app.ma3ady.com` with full mobile-parity customer + admin surfaces and the public booking flow).
- **Phase 9 — Deployment**: `setup-deployment-pipelines`. GH Actions, deployment.yamls, infrastructure dispatch, email deliverability DNS.
- **Phase 10 — Compliance & launch**: `setup-compliance-and-launch`. Privacy + terms (en+ar), retention jobs, account deletion, brand assets finalization, dev client cut, store submission.

## 10. Display Timezone Strategy

**Storage**: every timestamp is `timestamptz` (canonical UTC). The database has no concept of "user time" or "tenant time" at rest.

**Display**: a single hook `useDisplayTimezone()` in `@/hooks/useDisplayTimezone` resolves the right zone per surface:

| Surface | Default zone | Override |
|---|---|---|
| Public booking (`(public)/[tenantSlug]/...`) | **Tenant** timezone | Per-session toggle in the booking screen header — switches to device timezone. Never persisted; resets next session. |
| Customer "My bookings" (`(app)/(tabs)/bookings`) | **Tenant** timezone of each booking | The user's device timezone is shown in muted parentheses for context (`Tue 14:00 (your time: 13:00)`). No interactive override; reading-only. |
| Admin surfaces (`(admin)/*`) | **Tenant** timezone | Per-user persistent override at `profiles.display_timezone_override` (nullable IANA). Editable in admin settings. Useful for traveling owners. |
| Notifications (email, WhatsApp, push) | **Recipient's locale-and-tenant resolved zone**: tenant TZ if recipient is the tenant's customer/staff; recipient's saved override only if they're admin viewing in another zone | Computed at send-time. |
| `.ics` calendar attachment | UTC `DTSTART`/`DTEND` with `TZID` of the tenant for human readability | RFC 5545 covers this; the calendar app converts. |

**Rules**:
1. Never render a `timestamptz` without going through `useDisplayTimezone()` — lint rule enforces this for any `Date` or string-ified timestamp inside a `<Text>` child.
2. Never display two times in two different zones in the same view without explicit labels (e.g., "Berlin time" vs "your time").
3. The "your time" tooltip pattern is the standard way to show local time alongside tenant time.
4. Tenant timezone changes (an owner moving the business): existing appointments keep their `timestamptz` (no shift), but the rules and exceptions re-render in the new zone — matches reality.

## 11. Secrets — Single Source of Truth + Fanout

Every secret in this project lives in **one** file: `secrets/secrets.local.toml` (gitignored). A committed `secrets/secrets.example.toml` declares the schema. Make targets fan out to the appropriate destinations.

**Schema** (sketch — full file in `setup-secrets-sync/tasks.md`):

```toml
[github]
INFRASTRUCTURE_DISPATCH_TOKEN = "..."
EXPO_TOKEN = "..."
SUPABASE_ACCESS_TOKEN = "..."
SUPABASE_PROJECT_REF_PREVIEW = "..."
SUPABASE_PROJECT_REF_PROD = "..."
SUPABASE_DB_PASSWORD_PREVIEW = "..."
SUPABASE_DB_PASSWORD_PROD = "..."

[supabase.preview]
GOOGLE_CLIENT_ID = "..."
GOOGLE_CLIENT_SECRET = "..."
RESEND_API_KEY = "..."
RESEND_FROM = "Ma3ady <hello@ma3ady.com>"
WHATSAPP_ACCESS_TOKEN = "..."
WHATSAPP_PHONE_NUMBER_ID = "..."
WHATSAPP_TEMPLATE_NAME = "event_notification"
EMAIL_DISPATCHER = "mock"
WHATSAPP_DISPATCHER = "mock"
PUSH_DISPATCHER = "mock"

[supabase.production]
# same keys, prod values; dispatchers all "real"

[eas.preview]
EXPO_PUBLIC_SUPABASE_URL = "..."
EXPO_PUBLIC_SUPABASE_ANON_KEY = "..."
EXPO_PUBLIC_AUTH_REDIRECT_URI = "..."

[eas.production]
# same keys, prod values
```

**Fanout targets**:

- `make secrets-sync-github` → `gh secret set NAME -b VALUE` for each `[github]` key
- `make secrets-sync-supabase ENV=preview` → `supabase secrets set NAME=VALUE --project-ref $REF` for each `[supabase.<env>]` key
- `make secrets-sync-eas ENV=preview` → `eas secret:create --scope project --name NAME --value VALUE --type string` for each `[eas.<env>]` key
- `make secrets-sync ENV=preview` → all three above
- `make secrets-validate` → asserts every key in `secrets.example.toml` exists in `secrets.local.toml`; CI runs this against a stripped-down `secrets.example.toml` to detect schema drift

**Cloudflare DNS** (Resend SPF/DKIM/DMARC, wildcard subdomain) is a one-time manual setup documented in `docs/dns-setup.md`. Not in the secrets file because it's not a secret — but the runbook lives next to the rest.

**Firebase**: not used in v1. When `native-push` lands, FCM credentials get a new `[firebase]` section.

## 12. Observability

**Backend**: Supabase Logs are the source of truth. Postgres logs, Auth logs, Edge Function logs, Realtime logs all flow into the Supabase dashboard. We do not run our own log aggregator.

- Edge Functions use a tiny `log({event, level, ...meta})` helper that emits structured JSON to stdout — Supabase's log explorer can filter on the `event` field.
- Edge Functions wrap every handler in a `try/catch` that logs `event: "function_error"` with the request id, then rethrows.
- DB-level errors surface in Postgres logs automatically.
- Log retention follows the Supabase plan tier; we don't try to extend.

**Mobile**: a minimal in-app reporter writes to a `client_errors` table via Edge Function `report-client-error`:

- `client_errors(id, user_id nullable, tenant_id nullable, kind enum, payload jsonb, app_version, platform, created_at)`
- Only writes — no read access for clients (RLS denies select).
- Owners/admins can read their own tenant's `client_errors` via the audit-log viewer.
- Crash hook: top-level `ErrorBoundary` plus a `logError(error, context)` helper. In Expo Go: console.error + `report-client-error`. In production builds: same plus optional native crash hook (Sentry, deferred).
- Sample-rate: 100% in dev/preview, 10% in production for non-fatal errors (full sample for crashes).

**No third-party trackers**. PostHog, Sentry, Mixpanel, Amplitude — none of these in v1. Adding any of them would require a privacy-policy update and a sub-processor disclosure.

**Why this is enough for v1**: Supabase covers the backend completely. The mobile error volume in early access is small enough that 10% sampling + manual triage works. We add Sentry later only if signal-to-noise warrants it.
