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
- **Data minimization**: collect only name, email, optional phone, plus Google profile (sub, email, name, picture) for authenticated users.
- **Retention**: cancelled appointments retained 90 days then anonymized (PII nulled, audit row kept). No-show appointments retained 18 months for tenant analytics.
- **Right to be forgotten**: any user (customer or tenant member) may delete their account; appointment history is anonymized but kept (tenant business records).
- **Sub-processors**: Supabase (EU region), Resend (email), Meta WhatsApp Cloud API, Expo Push (later phase). Listed in the public privacy policy.
- **Cookie banner**: only on the marketing website (`ma3ady.com`). The mobile app does not use third-party trackers in v1; analytics is in-house only.

### 1e. Per-Tenant Data Isolation Is Law

Every table that holds tenant-owned data (`services`, `availability_rules`, `availability_exceptions`, `appointments`, `notifications`, etc.) carries `tenant_id` as a NOT NULL column and a Postgres RLS policy that scopes reads and writes to memberships. There are no application-level tenant filters that bypass RLS — the database is the enforcement boundary. Edge Functions use the user's JWT, not the service role, for any tenant-scoped operation. The service role is reserved for system jobs (cleanup, scheduled reminders) and is never exposed to clients.

## 2. Top-Level Constraint: Expo Go-First, Mock-First Dispatchers

This project deliberately defers the cost of cutting custom dev clients. Daily development must work in **Expo Go** for as long as possible. Capabilities that require native modules are deferred behind feature flags or mocked behind dispatcher interfaces:

| Capability | Phase 1 (Expo Go) | Later (dev client) |
|---|---|---|
| Auth | Supabase Google OAuth via `expo-auth-session` + `WebBrowser.openAuthSessionAsync` | Native `@react-native-google-signin/google-signin` |
| Push notifications | `EXPO_PUBLIC_NOTIFICATION_DISPATCHER=mock` (in-app toasts only, log to `notifications` table) | `expo-notifications` with APNs/FCM |
| WhatsApp send | `WHATSAPP_DISPATCHER=mock` (Edge Function logs payload, no API call) | Real Meta Cloud API call |
| Email send | `EMAIL_DISPATCHER=mock` (Edge Function logs to `notifications`) | Resend live keys |
| Splash / app icon | Expo defaults | Native splash, adaptive icon, themed Android icon |
| Deep linking | `exp://` in Expo Go | `ma3ady://` + universal links via `apple-app-site-association` and Android Asset Links |
| Sentry | console.log shim | Real DSN |

**Rule**: a change proposal that adds capability requiring a dev client MUST mark itself as "Phase: dev-client required" in `proposal.md` and explain why a mock is insufficient. Default mode is `mock` for all dispatchers; production builds must set every dispatcher to `real`.

## 3. Tenancy Model

Multi-tenant. Tenant identity = a unique `slug` matching `^[a-z0-9-]+$`, served at `<slug>.ma3ady.com` and used as the deep-link key in the mobile app.

- **`tenants`**: `id`, `slug` (unique), `name`, `timezone` (IANA, per-tenant), `default_locale` (`en`|`ar`), `brand_color`, `logo_url`, `created_at`.
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

Session is mobile-only in v1 — no web app to log into. Marketing site is fully unauthenticated. The `auth.ma3ady.com` callback exists purely as a single registered Google redirect URI; it does not host any user-facing surface beyond the redirect bounce.

## 6. Capabilities Map

Each capability gets one folder under `openspec/specs/<capability>/spec.md` once accepted. Initial set:

| Capability | Owns |
|---|---|
| `app-shell` | Expo Router structure, route groups, navigation primitives, splash, error boundaries |
| `branding` | Logo assets, color tokens, typography, voice |
| `design-system` | Component library, theme provider, light/dark/system, RTL helpers |
| `i18n` | i18next setup, en+ar locales, RTL bootstrap, locale persistence |
| `dev-tooling` | Makefile, Husky, ESLint, Prettier, Jest setup, `/dev/*` debug screens |
| `auth` | Supabase Google OAuth, callback, authStore, session lifecycle, sign-out |
| `tenancy` | tenants + memberships tables, RLS, slug validation, reserved list, tenant picker |
| `availability` | rules + exceptions + `compute_available_slots`, weekly grid editor |
| `services` | service CRUD, duration/buffer/notice/cap config |
| `appointments` | book/cancel/reschedule/complete/no-show flows, status state machine, EXCLUDE constraint |
| `public-booking` | anonymous booking flow, guest_contacts, signed manage-token links, claim-on-sign-in |
| `admin` | mobile-first admin mode (today's bookings, slot management, services, team) |
| `notifications` | dispatcher pattern (mock\|real) for email/whatsapp/push, `notifications` audit table, reminder cron |
| `marketing-site` | static HTML marketing site at ma3ady.com, per-tenant landing pages on subdomains |
| `deployment` | Dockerfiles, deployment.yaml, GH Actions for marketing/supabase/mobile |
| `compliance` | privacy policy + terms renderer (en/ar), data retention jobs, deletion flows |

## 7. Environments

- **Local**: `make dev-up` boots local Supabase (Docker). Mobile app talks to `http://127.0.0.1:54321` from Expo Go on the LAN. Dispatchers all `mock`.
- **Preview**: shared Supabase preview project (one ref). PR previews of marketing site. Mobile preview builds via `eas build --profile preview` (later phase). Dispatchers `mock` except auth.
- **Production**: separate Supabase production project. Marketing site at `ma3ady.com`. Mobile app on App Store + Play Store. Dispatchers all `real`.

## 8. Deployment

- **Mobile**: EAS Build + EAS Submit, profiles `development | preview | production`. `build-prod` target gated by interactive confirmation. Manual `workflow_dispatch` only — no auto-build on push.
- **Supabase**: GH Actions on push to `supabase/migrations/**` or `supabase/functions/**`. `deploy-preview` job → `deploy-production` job, sequential. `supabase link` → `supabase db push` → `supabase functions deploy <list>`.
- **Marketing site**: Docker image built and pushed to `ghcr.io/markmorcos/ma3ady-marketing` on push to `marketing/**`, then `repository-dispatch` to `markmorcos/infrastructure` carrying `marketing/deployment.yaml`.
- **Tenant landing app** (single image serving all `<slug>.ma3ady.com`): same pattern as marketing — Docker → GHCR → infrastructure dispatch with `tenant-landing/deployment.yaml`.
- **DNS**: Cloudflare, wildcard `*.ma3ady.com` to the infrastructure ingress, `auth.ma3ady.com` separately.

## 9. Roadmap

Phases are advisory, not contractual. Each phase is one or more `openspec/changes/<slug>/` proposals. A phase ships when its changes are accepted and the resulting code is on `main`.

- **Phase 0 — Brand & foundations**: brand assets, design tokens, monorepo setup (single-app for now), Makefile, Husky, ESLint, Prettier, Jest.
- **Phase 1 — Supabase + i18n + design system**: local dev stack, en+ar locales with RTL, design system components, dev-tooling screens.
- **Phase 2 — Tenancy + availability + services schema**: tables, RLS, `compute_available_slots`, EXCLUDE constraint on appointments.
- **Phase 3 — Auth (Google OAuth)**: callback route, authStore, tenant picker, anonymous booking with signed-token manage links.
- **Phase 4 — Public booking flow (mobile)**: tenant browse, service select, slot pick, anonymous book, manage-token deep link, claim-on-sign-in.
- **Phase 5 — Admin mobile mode**: today's bookings, mark complete/no-show, manage services, weekly grid editor for availability rules.
- **Phase 6 — Notifications pipeline**: dispatcher pattern, email + WhatsApp Edge Functions (mock first), `pg_cron` reminders, audit trail.
- **Phase 7 — Marketing site + tenant landing**: static HTML, en+ar, per-tenant landing on subdomains, deep-link CTA.
- **Phase 8 — Deployment pipelines**: GH Actions for marketing/supabase/mobile, deployment.yaml files, infrastructure repo dispatch.
- **Phase 9 — Compliance & launch**: privacy + terms (en+ar), data retention jobs, account deletion, store submission (cuts a dev client at this point).

Deferred capabilities (separate change folders when scheduled): Stripe paid bookings, native push, native Google Sign-In, staff resources, multi-staff scheduling, web booking surface, additional locales (de/fr/etc.).
