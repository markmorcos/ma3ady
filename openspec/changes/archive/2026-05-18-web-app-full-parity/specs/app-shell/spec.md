# app-shell spec delta

## ADDED Requirements

### Requirement: The boot sequence SHALL run unchanged on web with a platform-aware direction phase

`appStore.bootPhase` SHALL advance through `i18n → theme → auth → tenant → ready` on web identically to mobile. The `i18n` phase MUST call `src/i18n/applyDirection.ts` which on web sets `document.documentElement.dir` (RTL for `ar`, LTR otherwise) and on native calls `I18nManager.forceRTL` + `Updates.reloadAsync()` as today.

#### Scenario: boot on web
- **GIVEN** a fresh tab loading `https://app.ma3ady.com/`
- **WHEN** the app boots
- **THEN** `bootPhase` advances `i18n → theme → auth → tenant → ready`
- **AND** during `i18n` the document direction is applied based on the resolved locale
- **AND** during `auth` the persisted session is restored from `localStorage`
- **AND** the user lands on the appropriate route group based on resolved state

#### Scenario: Arabic locale flips the document direction
- **GIVEN** a visitor whose resolved locale is `ar`
- **WHEN** the `i18n` boot phase completes
- **THEN** `document.documentElement.dir === 'rtl'`
- **AND** no full-page reload is triggered (the web direction flip does not need `Updates.reloadAsync()`)

### Requirement: Tab navigators SHALL render through `<AppShell>` so the web layout can responsively switch between left rail and bottom tabs

`app/(app)/(tabs)/_layout.tsx` and `app/(admin)/(tabs)/_layout.tsx` SHALL delegate to `src/components/AppShell.tsx`. The `.native.tsx` variant MUST be a pass-through that renders the existing `<Tabs>`; the `.web.tsx` variant MUST render a 240px left rail at viewport widths ≥ 768px and the bottom tab bar at viewport widths < 768px. A single `getTabs(role)` helper MUST supply the destination list to both layouts so they cannot drift.

#### Scenario: destination list is single-sourced
- **GIVEN** the `getTabs('customer')` and `getTabs('admin')` helpers
- **WHEN** a developer adds, removes, or renames a destination
- **THEN** both the mobile bottom tab bar and the web layouts (rail + bottom) reflect the change
- **AND** no separate destination list exists for web

#### Scenario: viewport switch flips between bottom tabs and left rail on web
- **GIVEN** an authenticated user on `app.ma3ady.com/bookings`
- **WHEN** the browser viewport is wider than 768px
- **THEN** the destinations render as a left rail
- **AND** when the browser viewport is narrower than 768px the destinations render as a bottom tab bar
- **AND** the active destination indicator follows the same M3 pill behavior as mobile

### Requirement: Native-only modules SHALL be wrapped behind exactly one platform-extension file each

Every native-only API the app consumes — `expo-secure-store`, `expo-notifications`, `expo-clipboard`, `expo-sharing`, `@react-native-community/datetimepicker`, `@gorhom/bottom-sheet`, `I18nManager` — SHALL be referenced from exactly one wrapper file under `src/services/` or `src/components/` that is split into `.native.ts(x)` and `.web.ts(x)`. Feature files and route files MUST NOT import these modules directly.

#### Scenario: route file imports the wrapper, not the native module
- **GIVEN** any file under `app/**` or `src/features/**`
- **WHEN** the file shares a clipboard string
- **THEN** it imports `import { copyToClipboard } from 'src/services/clipboard'`
- **AND** does NOT import `expo-clipboard` directly

#### Scenario: web bundle has no native-only resolution failures
- **GIVEN** the repo at a clean checkout
- **WHEN** `pnpm expo export --platform web` runs
- **THEN** the build succeeds with no metro "module not found" errors for any of the listed native-only modules

### Requirement: The `+not-found` and route-error boundaries SHALL function unchanged on web

`<RouteErrorBoundary>` SHALL continue to wrap each route group on web; `<RootErrorBoundary>` SHALL continue to wrap the root layout; the `+not-found` route SHALL render the friendly empty state. The web boundaries MUST report errors to the same `report-client-error` Edge Function the mobile boundaries use.

#### Scenario: route-group error on web
- **GIVEN** a render error inside `app/(admin)/(tabs)/services.tsx` on web
- **WHEN** the error throws
- **THEN** `<RouteErrorBoundary>` catches it and renders the recovery UI
- **AND** other admin tabs continue to function
- **AND** the error is reported to `report-client-error`

#### Scenario: 404 on web
- **GIVEN** a user visits `https://app.ma3ady.com/garbage`
- **WHEN** Expo Router resolves to `+not-found`
- **THEN** the friendly empty state renders
- **AND** a "Go home" CTA returns the user to `/`
