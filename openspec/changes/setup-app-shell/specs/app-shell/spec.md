# app-shell — Spec Delta

## ADDED Requirements

### Requirement: The app SHALL boot through explicit, observable phases

`appStore.bootPhase` SHALL advance through `i18n → theme → auth → tenant → ready`, and the splash MUST stay up until that final phase or until a 5-second per-phase timeout fires the `degraded` fallback.

#### Scenario: happy path
- **GIVEN** a fresh app launch with all dependencies healthy
- **WHEN** the app boots
- **THEN** `appStore.bootPhase` advances `i18n → theme → auth → tenant → ready`
- **AND** `expo-splash-screen` is hidden when phase reaches `ready`
- **AND** the user lands on the appropriate route group based on resolved state

#### Scenario: phase timeout degrades gracefully
- **GIVEN** the auth restore phase hangs for >5 seconds
- **WHEN** the timeout fires
- **THEN** `bootPhase` transitions to `degraded`
- **AND** the splash is hidden anyway
- **AND** the user is shown the sign-in screen with a "couldn't restore your session — please sign in" toast
- **AND** subsequent retry of auth restore is possible from the sign-in screen

### Requirement: Cold-start interactive time SHALL be ≤ 2 seconds on mid-range hardware

On Pixel 5a class hardware, `appStore.bootPhase === 'ready'` SHALL be reached within 2000ms of process start, and the synthetic CI perf test MUST enforce a 1500ms budget on the runner.

#### Scenario: perf budget on Pixel 5a class device
- **GIVEN** an Expo Go install on a Pixel 5a or equivalent
- **WHEN** the app is launched cold (after a process kill, no warm cache)
- **THEN** `appStore.bootPhase === 'ready'` within 2000ms of process start
- **AND** the perf test in `tests/perf/boot.test.ts` enforces a synthetic 1500ms budget on the CI runner

### Requirement: The app SHALL provide two error boundary tiers

`<RouteErrorBoundary>` SHALL wrap each route group and recover the affected screen only; `<RootErrorBoundary>` MUST wrap the root layout, render the full-screen recovery UI with a Restart button, and report the error to `client_errors` via `report-client-error`.

#### Scenario: route-group error
- **GIVEN** a render error inside `(admin)/(tabs)/services.tsx`
- **WHEN** the error throws
- **THEN** `<RouteErrorBoundary>` catches it
- **AND** the screen renders a "Something went wrong on this page" recovery UI with a "Go back" CTA
- **AND** the rest of the app remains functional (other tabs still work)

#### Scenario: catastrophic error
- **GIVEN** an error during the root layout render
- **WHEN** the error throws
- **THEN** `<RootErrorBoundary>` catches it
- **AND** the user sees a full-screen "ma3ady ran into a problem" recovery UI
- **AND** a "Restart" button calls `Updates.reloadAsync()` (or `DevSettings.reload()` in dev)
- **AND** the error is logged to `client_errors` via the `report-client-error` Edge Function

### Requirement: All timestamp rendering SHALL go through `useDisplayTimezone`

Every `<Time value={...} context="..." />` component SHALL resolve its zone via `useDisplayTimezone()`, defaulting to the tenant timezone for public-booking, customer-bookings, and admin contexts; admins with `profiles.display_timezone_override` MUST see admin surfaces in their override zone.

#### Scenario: public booking flow
- **GIVEN** a public booking surface for tenant `acme` (timezone `Europe/Berlin`)
- **AND** the user's device is set to `America/Los_Angeles`
- **WHEN** a `<Time value={slot.starts_at} context="public-booking" />` component renders
- **THEN** by default it shows the time in Berlin (`14:00`)
- **AND** the timezone toggle in the header offers to switch the display to LA (`05:00`)
- **AND** toggling updates only `sessionPrefsStore` — refresh of the app reverts to tenant TZ

#### Scenario: customer "My bookings"
- **GIVEN** a customer with appointments at acme (Berlin)
- **WHEN** their bookings list renders
- **THEN** each `<Time value={appt.starts_at} context="customer-bookings" />` shows `Tue 14:00`
- **AND** the user's device timezone is shown in muted parentheses: `(your time: 05:00)`

#### Scenario: admin override
- **GIVEN** an admin of acme with `profiles.display_timezone_override = 'Asia/Dubai'`
- **WHEN** the admin views the Today screen
- **THEN** all `<Time>` components in the `(admin)` group render in Dubai time
- **AND** other surfaces (public booking) are unaffected by this override

### Requirement: Lint SHALL block raw timestamp rendering

The custom `no-raw-time-render` ESLint rule SHALL flag any `Date` or stringified timestamp passed directly into a `<Text>` child, and the suggested fix MUST be `<Time value={...} context="..." />`.

#### Scenario: violation detected
- **GIVEN** a source file containing `<Text>{appointment.starts_at}</Text>`
- **WHEN** ESLint runs
- **THEN** the `no-raw-time-render` rule fires
- **AND** the suggested fix is `<Time value={appointment.starts_at} context="..." />`

### Requirement: 404 SHALL render a friendly recovery screen

Expo Router's `+not-found` route SHALL render a friendly empty state with a "Go home" CTA so unknown deep links MUST never leave the user on a blank screen.

#### Scenario: unknown route
- **GIVEN** a deep link to an unknown route, e.g. `ma3ady://garbage`
- **WHEN** Expo Router resolves to `+not-found`
- **THEN** the user sees the friendly empty state
- **AND** a "Go home" CTA returns them to the main route stack

### Requirement: Public booking SHALL NOT block on auth/tenant boot phases

The `(public)/[tenantSlug]` route group SHALL render as soon as i18n + theme are ready, so a deep link from email MUST land on the booking flow even while auth/tenant resolution proceeds in parallel.

#### Scenario: deep link from email while signed-out
- **GIVEN** a deep link `ma3ady://acme/...` is opened
- **WHEN** the app is booting
- **THEN** the public booking flow renders as soon as i18n + theme are ready
- **AND** auth/tenant resolution proceeds in parallel without blocking the public surface
- **AND** if auth resolves to a signed-in user later, the relevant CTAs ("Add to my account") light up
