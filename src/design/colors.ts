// Minimal color tokens for places that can't reach the resolved theme
// (e.g. lint-rule-required constants in legacy code). New code should reach
// for `useTheme()` instead.
//
// The static values here mirror what `buildPalette('#0B6BCB', 'light')` yields
// for the default Ma3ady source. They are intentionally generic — real per-
// tenant colors come from the M3 palette generator at runtime.

import { SOURCE_PRESETS } from './palette';

export const colors = {
  brand500: '#0B6BCB',
  brand600: '#063A6E',
  bg: '#F8F9FB',
  surface: '#FFFFFF',
  border: '#E2E5EB',
  text: '#11161F',
  muted: '#5A6371',
  white: '#FFFFFF',
  brandTint: '#0B6BCB10',
} as const;

/**
 * Brand-color picker swatches for tenant onboarding. Six M3 source presets
 * straight from the design handoff §Color: Ma3ady default + five verticals.
 * Tenants can also pick a custom hex via the `BrandColorPicker`'s custom
 * input.
 */
export const brandSwatches = [
  SOURCE_PRESETS.ma3ady.hex,
  SOURCE_PRESETS.salon.hex,
  SOURCE_PRESETS.clinic.hex,
  SOURCE_PRESETS.auto.hex,
  SOURCE_PRESETS.plum.hex,
  SOURCE_PRESETS.ember.hex,
] as const;
