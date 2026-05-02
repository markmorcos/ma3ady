# Tasks

- [ ] 1.1 Write `src/state/appStore.ts` (zustand): `bootPhase`, `setBootPhase`, `bootError`, `setBootError`
- [ ] 1.2 Write `src/state/sessionPrefsStore.ts`: `displayTimezoneOverride: string | null`, `setDisplayTimezoneOverride`, `resetSessionPrefs` — non-persistent (resets on app launch)
- [ ] 1.3 Write `src/hooks/useDisplayTimezone.ts`:
  - `useDisplayTimezone(context: 'public-booking' | 'admin' | 'customer-bookings'): string` — returns IANA zone
  - Resolution order:
    1. `sessionPrefsStore.displayTimezoneOverride` (public-booking only)
    2. `profiles.display_timezone_override` (admin only, persistent)
    3. tenant's `timezone` (default)
    4. device timezone (last-resort fallback)
- [ ] 1.4 Write `src/components/Time.tsx`:
  - Props: `value: string | Date`, `context: 'public-booking' | 'admin' | 'customer-bookings'`, `format: 'short' | 'long' | 'datetime' | 'iso'`, `secondary?: boolean` (renders second zone in muted parentheses)
  - Resolves zone via `useDisplayTimezone(context)`, formats via `date-fns-tz`
- [ ] 1.5 Write `src/components/DateRange.tsx` for ranges (start–end)
- [ ] 1.6 Write `<RootErrorBoundary>` — class component (RN Reanimated v3 plays nicely with classes for boundaries); wraps the entire app, logs to `client_errors` via Edge Function
- [ ] 1.7 Write `<RouteErrorBoundary>` — used inside each `_layout.tsx` for route groups; smaller blast radius
- [ ] 1.8 Rewrite `app/_layout.tsx` with the full boot sequence:
  - Keep splash via `expo-splash-screen.preventAutoHideAsync()` at module load
  - Run boot phases in order, advancing `appStore.bootPhase`
  - Each phase wrapped with `Promise.race([...phaseFn(), timeout(5000)])` — degraded path on timeout
  - `SplashScreen.hideAsync()` once phase = 'ready' or 'degraded'
- [ ] 1.9 Wire route groups in `app/_layout.tsx` `<Stack>`:
  - `(public)`, `(auth)`, `(onboarding)`, `(app)`, `(admin)`, `manage`, `auth/callback`, `dev`, `+not-found`
  - Initial route resolved by `appStore.bootPhase` + auth state + role
- [ ] 1.10 Write `app/+not-found.tsx` with friendly copy ("This page doesn't exist") and a "Go home" CTA
- [ ] 1.11 Write `app/_app-error.tsx` — full-screen unrecoverable error with "Restart" CTA (`Updates.reloadAsync()`)
- [ ] 1.12 Add ESLint rule `no-raw-time-render`:
  - Rejects `<Text>{date.toLocaleString(...)}</Text>` and `<Text>{format(date, ...)}</Text>` patterns
  - Suggests `<Time value={date} context="..." />`
  - Rationale: ensures every time goes through `useDisplayTimezone`
- [ ] 1.13 Boot performance budget test:
  - In `tests/perf/boot.test.ts`, mock all four boot phases with 100ms latency, assert `bootPhase === 'ready'` within 1.5s on the test runner
  - In `/dev/perf` route: visual stopwatch from app launch to ready
- [ ] 1.14 Add `display_timezone_override` column to `profiles` (will require an additive migration; included in this change as `008_profiles_tz_override.sql`):
  - `alter table profiles add column display_timezone_override text;`
  - check constraint validates IANA zone via a helper function `is_valid_iana_zone(text)` using a small whitelist or `pg_timezone_names`
- [ ] 1.15 Write `app/(admin)/(tabs)/settings/timezone.tsx` — admin can pick from a list of IANA zones (sourced from a static asset of common zones; "I'm here right now" CTA reads `Intl.DateTimeFormat().resolvedOptions().timeZone` for one-tap)
- [ ] 1.16 Write `<TimezoneToggle>` component for the public booking flow header — toggles between tenant TZ and device TZ; updates `sessionPrefsStore`
- [ ] 1.17 Tests:
  - `useDisplayTimezone` resolves correctly across all contexts and override states
  - `<Time>` formats correctly for tenant TZ, device TZ, and override
  - DST boundary case: a slot at 02:30 on the spring-forward day in Berlin renders as expected
  - Boot timeout: a hung auth phase results in `bootPhase = 'degraded'` and the app still renders the sign-in screen
  - 404 route renders the friendly screen
  - Error boundary catches a thrown render error and shows recovery UI
- [ ] 1.18 Verify on simulator: cold launch in Expo Go → splash visible briefly → app interactive in <2s → Time components render correctly in every context
