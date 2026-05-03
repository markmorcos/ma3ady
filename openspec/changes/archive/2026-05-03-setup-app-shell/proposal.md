# Setup app shell

## Why

Many cross-cutting concerns — boot sequence, route group structure, splash, error boundaries, theme/i18n provider integration, the `useDisplayTimezone` hook, dev-tools gate — are touched by every other change but currently lack a dedicated home. They get smeared across `setup-monorepo-and-tooling`, `setup-i18n-en-ar`, `setup-design-system`, and `implement-google-oauth`, which makes them hard to reason about as a system.

This change consolidates the app shell into one capability. After it lands, every subsequent feature change "plugs into" the shell rather than re-defining it.

## What Changes

- **ADDED** `app/_layout.tsx` boot sequence (final shape):
  - Phase 1: i18n bootstrap (from the `setup-i18n-en-ar` change)
  - Phase 2: theme resolve (from `setup-design-system`)
  - Phase 3: auth restore (from `implement-google-oauth`)
  - Phase 4: tenant resolve (from `define-tenancy-model` + `implement-tenant-onboarding`)
  - Phase 5: render the right route group based on resolved state
  - Splash held by `expo-splash-screen` until phase 5 starts
  - Each phase has a 5-second timeout — beyond that, the app proceeds with a degraded state and surfaces a toast
- **ADDED** route group structure (final shape, locked):
  - `(public)/[tenantSlug]/...` — anonymous booking
  - `(auth)/sign-in` + `auth/callback` — sign-in + OAuth callback
  - `(onboarding)/...` — tenant claim flow for first-time admins
  - `(app)/(tabs)/...` — customer mode (signed-in, customer role)
  - `(admin)/(tabs)/...` — admin mode (signed-in, owner/admin/staff role)
  - `manage/[token]` — guest token landing
  - `dev/...` — dev tools, gated by `EXPO_PUBLIC_SHOW_DEV_TOOLS`
- **ADDED** `<RootErrorBoundary>` — top-level catch; logs to `client_errors` (the `setup-observability` change), shows a friendly retry screen
- **ADDED** `<RouteErrorBoundary>` — per route-group; isolates failures so one screen crashing doesn't crash the whole app
- **ADDED** `src/hooks/useDisplayTimezone.ts` — the canonical timezone resolution hook per `project.md` §10
- **ADDED** `src/components/Time.tsx` and `src/components/DateRange.tsx` — render `timestamptz` through `useDisplayTimezone`
- **ADDED** `src/state/sessionPrefsStore.ts` — non-persistent session-only state (current display TZ override on the public booking flow, etc.)
- **ADDED** `src/state/appStore.ts` — combined app boot state (`bootPhase: 'i18n' | 'theme' | 'auth' | 'tenant' | 'ready' | 'degraded'`)
- **ADDED** `app/+not-found.tsx` — 404 with friendly empty state
- **ADDED** `app/_app-error.tsx` — unrecoverable boot error screen
- **ADDED** linting rule that bans rendering raw `Date` / `timestamptz` strings outside `<Time>` / `<DateRange>` components
- **ADDED** boot performance budget: cold start to interactive ≤ 2s on a mid-range Android (Pixel 5a or equivalent)

## Impact

- Affects `app-shell` capability (initial spec).
- Required by every UI change. Slots cleanly between `setup-design-system` and `define-tenancy-model` in Phase 0/1.
- Touches `setup-monorepo-and-tooling`'s placeholder `app/_layout.tsx` and `app/index.tsx` — those are replaced.
