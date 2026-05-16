# app-shell spec delta

## ADDED Requirements

### Requirement: Bottom navigation SHALL render an M3 pill indicator

The customer and admin bottom-nav bars SHALL render the selected destination with a `secondaryContainer`-filled pill (64dp × 32dp, full radius) behind the icon. The icon SHALL render with `fill = 1` when selected and `fill = 0` when unselected. The pill transition SHALL animate background opacity over 200ms with the M3 emphasized easing.

#### Scenario: tapping Bookings tab moves the pill
- **GIVEN** the customer is on the Home tab
- **WHEN** the user taps the Bookings tab
- **THEN** the pill animates from behind the Home icon to behind the Bookings icon over ~200ms

### Requirement: Top app bars SHALL follow the M3 small / center / large variants

Every screen with a header SHALL use one of three variants documented in the design system: `small` (default, 64dp, leading + title + trailing actions), `center` (64dp, centered title — used for confirmation flows), or `large` (112dp, large title that collapses on scroll — used for the Bookings list and Settings list). The variant SHALL come from a single `<TopAppBar>` component, not from per-screen `Stack.Screen options` styling.
