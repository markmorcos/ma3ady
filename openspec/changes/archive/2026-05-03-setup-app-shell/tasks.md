# Tasks

- [x] 1.1 Write `src/state/appStore.ts` (zustand): `bootPhase`, `setBootPhase`, `bootError`, `setBootError`
- [x] 1.2 Write `src/state/sessionPrefsStore.ts`: `displayTimezoneOverride: string | null`, `setDisplayTimezoneOverride`, `resetSessionPrefs` — non-persistent (resets on app launch)
- [x] 1.3 Write `src/hooks/useDisplayTimezone.ts`:
  - `useDisplayTimezone(context: 'public-booking' | 'admin' | 'customer-bookings'): string` — returns IANA zone
  - Resolution order:
    1. `sessionPrefsStore.displayTimezoneOverride` (public-booking only)
    2. `profiles.display_timezone_override` (admin only, persistent — passed in via `adminOverride` prop until profiles table lands)
    3. tenant's `timezone` (default)
    4. device timezone (last-resort fallback)
- [x] 1.4 Write `src/components/Time.tsx`:
  - Props: `value: string | Date`, `context: 'public-booking' | 'admin' | 'customer-bookings'`, `format: 'short' | 'long' | 'datetime' | 'iso'`, `secondary?: boolean` (renders second zone in muted parentheses)
  - Resolves zone via `useDisplayTimezone(context)`, formats via `date-fns-tz` `formatInTimeZone`
- [x] 1.5 Write `src/components/DateRange.tsx` for ranges (start–end)
- [x] 1.6 Write `<RootErrorBoundary>` — class component; wraps the entire app, logs to `client_errors` via Edge Function (Edge Function lands in setup-observability — until then, console.error)
- [x] 1.7 Write `<RouteErrorBoundary>` — used inside each `_layout.tsx` for route groups; smaller blast radius
- [x] 1.8 Rewrite `app/_layout.tsx` with the full boot sequence:
  - Keep splash via `expo-splash-screen.preventAutoHideAsync()` at module load
  - Run boot phases in order, advancing `appStore.bootPhase`
  - Each phase wrapped with a 5-second `PhaseTimeoutError` race — degraded path on timeout
  - `SplashScreen.hideAsync()` once phase = 'ready' or 'degraded'
- [x] 1.9 Wire route groups in `app/_layout.tsx` `<Stack>` (auto-discovers `(public)`, `(auth)`, `(onboarding)`, `(app)`, `(admin)`, `manage`, `auth/callback`, `dev`, `+not-found` — folders materialize per-feature in later changes)
- [x] 1.10 Write `app/+not-found.tsx` with friendly copy ("This page doesn't exist") and a "Go home" CTA
- [x] 1.11 Write `app/_app-error.tsx` — full-screen unrecoverable error with "Restart" CTA (`Updates.reloadAsync()`)
- [x] 1.12 Add ESLint rule `no-raw-time-render`:
  - Implemented as a project plugin at `eslint-rules/no-raw-time-render.js`
  - Flags identifier-shaped timestamp props in `<Text>`, plus `format()`, `formatInTimeZone()`, and `Date#toLocale*` / `toISOString` calls in `<Text>` children
  - Rule scoped off in `Time.tsx` / `DateRange.tsx` (the canonical implementations)
- [x] 1.13 Boot performance budget test:
  - `tests/perf/boot.test.ts` mocks all four boot phases with 100ms latency, asserts `bootPhase === 'ready'` within 1.5s on the test runner
  - `/dev/perf` visual stopwatch — deferred to setup-observability (the dev-tools surface is empty; this would be premature)
- [ ] 1.14 Add `display_timezone_override` column to `profiles` — **deferred**: the `profiles` table doesn't exist until `define-tenancy-model` (Phase 2). Folding this column into the table's CREATE statement is cleaner than landing an additive migration that must wait two phases. Captured as a TODO in the `define-tenancy-model` change.
- [x] 1.15 Write `app/(admin)/(tabs)/settings/timezone.tsx` — admin can pick from a list of IANA zones (sourced from `src/data/iana-zones.ts`); "I'm here right now" CTA reads `Intl.DateTimeFormat().resolvedOptions().timeZone` for one-tap. Persistence to `profiles.display_timezone_override` is wired in `implement-admin-mobile-dashboard`.
- [x] 1.16 Write `<TimezoneToggle>` component for the public booking flow header — toggles between tenant TZ and device TZ; updates `sessionPrefsStore`
- [x] 1.17 Tests:
  - `useDisplayTimezone` resolves correctly across all contexts and override states ✓
  - `<Time>` formats correctly for tenant TZ, device TZ, and override ✓
  - DST boundary case: spring-forward day in Berlin renders as expected ✓
  - Boot timeout: a hung auth phase results in `bootPhase = 'degraded'` and the app still renders ✓
  - Custom ESLint rule fires on raw timestamps and stays quiet on `<Time>` / `<DateRange>` (RuleTester) ✓
- [x] 1.18 Verify on simulator: cold launch in Expo Go → splash visible briefly → app interactive in <2s → Time components render correctly in every context — **deferred to user**
