# design-system — Spec Delta

## ADDED Requirements

### Requirement: Components SHALL consume theme tokens, not raw colors

#### Scenario: button background sourced from theme
- **GIVEN** a `<Button variant="primary">`
- **WHEN** it renders
- **THEN** its background is `theme.colors.brand[500]` resolved through the active `ThemeProvider`
- **AND** switching from light to dark theme changes the background without a remount

### Requirement: Components SHALL render correctly in light, dark, en, and ar

#### Scenario: showcase coverage
- **GIVEN** the `/dev/design-system` route is open
- **WHEN** a developer toggles theme and locale
- **THEN** every component in the showcase renders without layout regressions in each of the four combinations (`light/en`, `light/ar`, `dark/en`, `dark/ar`)

### Requirement: Touch targets SHALL be at least 44×44 points

#### Scenario: button hit area
- **GIVEN** a `<Button size="sm">` with text "OK"
- **WHEN** rendered
- **THEN** the rendered hit area is ≥ 44px in both dimensions
- **AND** padding compensates for the visual size to keep the design proportional

### Requirement: RTL layout SHALL be honored without `left`/`right`

#### Scenario: button with leading icon in Arabic
- **GIVEN** a `<Button>` with a leading icon in Arabic locale
- **WHEN** the layout renders
- **THEN** the icon appears on the right of the label (logical `start` in RTL)
- **AND** the same component in English renders the icon on the left

#### Scenario: lint check
- **GIVEN** any source file under `src/`
- **WHEN** ESLint runs
- **THEN** any use of the `left:` or `right:` style key fails the `no-physical-direction` lint rule
- **AND** the rule message points to `start`/`end` as the fix

### Requirement: Status colors SHALL map deterministically

#### Scenario: confirmed status
- **GIVEN** an appointment with `status === 'confirmed'`
- **WHEN** a `<Badge status="confirmed" />` renders
- **THEN** its background is `theme.colors.brand[500]`
- **AND** its label reads `t('appointments.status.confirmed')`

#### Scenario: cancelled status
- **GIVEN** an appointment with `status === 'cancelled'`
- **WHEN** a `<Badge status="cancelled" />` renders
- **THEN** its background is `theme.colors.muted`
- **AND** the visual additionally includes a strikethrough icon (color is not the only differentiator)

### Requirement: No inline hex literals in component styles

#### Scenario: lint check
- **GIVEN** any source file under `src/`
- **WHEN** ESLint runs
- **THEN** any hex color literal (`#[0-9A-Fa-f]{3,8}`) inside `StyleSheet.create` or inline `style={...}` fails the `no-inline-hex` rule
- **AND** the rule message suggests importing from `@/design/tokens`
