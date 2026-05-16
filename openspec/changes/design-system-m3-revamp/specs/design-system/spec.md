# design-system spec delta

## ADDED Requirements

### Requirement: The theme SHALL be derived from the active tenant's brand color

The `ThemeProvider` SHALL read the active tenant's `brand_color` (from `useTenantStore`), feed it through an OKLCH lightness-ramp palette generator, and produce a full Material Design 3 role table for both light and dark modes. When no tenant is active (e.g. before sign-in, on public-booking deep links before tenant resolves), the provider SHALL fall back to the Ma3ady source preset (`#0B6BCB`).

#### Scenario: switching tenants regenerates the palette
- **GIVEN** a user with memberships in two tenants whose `brand_color` values differ
- **WHEN** the user switches the active tenant via the picker
- **THEN** `theme.colors.primary` resolves to a color derived from the new tenant's `brand_color`
- **AND** every screen repaints with the new palette without a remount

#### Scenario: fallback when no tenant is active
- **GIVEN** a sign-in screen rendered with no active tenant in the store
- **WHEN** the theme resolves
- **THEN** `theme.colors.primary` resolves to the OKLCH-derived value for the Ma3ady default source (`#0B6BCB`)

### Requirement: The theme SHALL expose Material Design 3 role tokens

The `Theme` type SHALL expose at least the following Material Design 3 roles, each resolving to a color string: `primary`, `onPrimary`, `primaryContainer`, `onPrimaryContainer`, `secondary`, `onSecondary`, `secondaryContainer`, `onSecondaryContainer`, `tertiary`, `onTertiary`, `tertiaryContainer`, `onTertiaryContainer`, `surface`, `onSurface`, `surfaceContainerLow`, `surfaceContainer`, `surfaceContainerHigh`, `surfaceContainerHighest`, `outline`, `outlineVariant`, `error`, `onError`, `errorContainer`, `onErrorContainer`, and the Ma3ady extensions `success`, `onSuccess`, `successContainer`, `onSuccessContainer`, `warning`, `onWarning`, `warningContainer`, `onWarningContainer`.

#### Scenario: container roles render as light tints in light mode
- **GIVEN** a tenant with `brand_color = '#1E8A6E'` and the theme in light mode
- **WHEN** `theme.colors.primaryContainer` resolves
- **THEN** the result is a near-white green tint with lightness ≥ 90% in OKLCH

### Requirement: Atoms SHALL adopt Material Design 3 Expressive shape defaults

When the design system runs in Expressive mode (the default), `Button` SHALL use full pill radius, `Chip` SHALL use full pill radius, and `Card kind="filled" | "elevated"` SHALL use 24dp radius. When Expressive is disabled, buttons revert to 20dp, chips to 8dp, and cards to 12dp.

#### Scenario: Expressive button radius
- **GIVEN** the theme provider configured with `expressive = true` (default)
- **WHEN** a `<Button variant="filled">` renders
- **THEN** its `borderRadius` is the theme's `cornerFull` value (>= 9999)

## MODIFIED Requirements

### Requirement: Status colors SHALL map deterministically

The `<StatusBadge status="..." />` component SHALL map appointment statuses to **role containers** so the badge reads as a soft pill rather than a solid swatch:

- `pending` → `warningContainer` background + `onWarningContainer` text + `schedule` icon
- `confirmed` → `successContainer` background + `onSuccessContainer` text + `check_circle` icon
- `completed` → `secondaryContainer` background + `onSecondaryContainer` text + `task_alt` icon
- `cancelled` → `errorContainer` background + `onErrorContainer` text + `cancel` icon
- `no_show` → `surfaceContainerHighest` background + `onSurfaceVariant` text + `do_not_disturb_on` icon

Color MUST never be the only differentiator — every badge SHALL carry an icon and a label.

#### Scenario: confirmed status
- **GIVEN** an appointment with `status === 'confirmed'`
- **WHEN** a `<StatusBadge status="confirmed" />` renders
- **THEN** its background is `theme.colors.successContainer`
- **AND** its foreground is `theme.colors.onSuccessContainer`
- **AND** it carries a `check-check` icon and the localized label `appointments.status.confirmed`

#### Scenario: cancelled status
- **GIVEN** an appointment with `status === 'cancelled'`
- **WHEN** a `<StatusBadge status="cancelled" />` renders
- **THEN** its background is `theme.colors.errorContainer`
- **AND** its foreground is `theme.colors.onErrorContainer`
- **AND** it carries a `x-circle` icon and the localized label `appointments.status.cancelled`
