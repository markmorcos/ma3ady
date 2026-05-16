/**
 * Design tokens — Material Design 3 (Expressive).
 *
 * Components MUST consume the resolved theme (`useTheme()`), not these raw
 * maps directly. Colors live in the per-tenant palette (see `palette.ts` and
 * `theme.ts`); this file holds palette-independent scales (type, shape,
 * spacing, motion, elevation).
 *
 * Legacy color shape (`palette.brand`, `palette.neutral`, `palette.semantic`)
 * is sourced from the M3 generator so brand-color changes flow through. It
 * will go away once every component reads M3 roles directly.
 */

import { buildPalette } from './palette';

// ---------------------------------------------------------------------------
// Legacy palette (sourced from the M3 generator)
// ---------------------------------------------------------------------------

const LEGACY_SOURCE = '#0F766E';
const legacyLight = buildPalette(LEGACY_SOURCE, 'light');
const legacyDark = buildPalette(LEGACY_SOURCE, 'dark');

export const palette = {
  brand: {
    light: { 500: legacyLight.primary, 600: legacyLight.onPrimaryContainer },
    dark: { 500: legacyDark.primary, 600: legacyDark.onPrimaryContainer },
  },
  accent: {
    light: { 500: legacyLight.tertiary },
    dark: { 500: legacyDark.tertiary },
  },
  neutral: {
    light: {
      bg: legacyLight.surface,
      surface: legacyLight.surfaceContainerLow,
      border: legacyLight.outlineVariant,
      text: legacyLight.onSurface,
      muted: legacyLight.onSurfaceVariant,
    },
    dark: {
      bg: legacyDark.surface,
      surface: legacyDark.surfaceContainerLow,
      border: legacyDark.outlineVariant,
      text: legacyDark.onSurface,
      muted: legacyDark.onSurfaceVariant,
    },
  },
  semantic: {
    light: {
      success: legacyLight.success,
      warning: legacyLight.warning,
      danger: legacyLight.error,
    },
    dark: {
      success: legacyDark.success,
      warning: legacyDark.warning,
      danger: legacyDark.error,
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Spacing — 4dp grid
// ---------------------------------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

/** M3 numeric spacing scale (multiples of 4dp). */
export const spacingScale = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// ---------------------------------------------------------------------------
// Shape scale — M3 Expressive
// ---------------------------------------------------------------------------

export const shape = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 28,
  full: 9999,
} as const;

/** Back-compat alias. New code uses `shape.*` directly. */
export const radii = {
  sm: shape.sm,
  md: shape.md,
  lg: shape.lg,
  xl: shape.xl,
  pill: shape.full,
} as const;

// ---------------------------------------------------------------------------
// Type scale — M3 Expressive (Roboto variable)
// ---------------------------------------------------------------------------

type TypeStyle = {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing?: number;
};

export const typeScale = {
  displayLg: { fontSize: 57, lineHeight: 64, fontWeight: '400' },
  displayMd: { fontSize: 45, lineHeight: 52, fontWeight: '400' },
  displaySm: { fontSize: 36, lineHeight: 44, fontWeight: '500' },
  headlineLg: { fontSize: 32, lineHeight: 40, fontWeight: '500' },
  headlineMd: { fontSize: 28, lineHeight: 36, fontWeight: '500' },
  headlineSm: { fontSize: 24, lineHeight: 32, fontWeight: '500' },
  titleLg: { fontSize: 22, lineHeight: 28, fontWeight: '500' },
  titleMd: { fontSize: 16, lineHeight: 24, fontWeight: '500', letterSpacing: 0.15 },
  titleSm: { fontSize: 14, lineHeight: 20, fontWeight: '500', letterSpacing: 0.1 },
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0.5 },
  bodyMd: { fontSize: 14, lineHeight: 20, fontWeight: '400', letterSpacing: 0.25 },
  bodySm: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0.4 },
  labelLg: { fontSize: 14, lineHeight: 20, fontWeight: '500', letterSpacing: 0.1 },
  labelMd: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.5 },
  labelSm: { fontSize: 11, lineHeight: 16, fontWeight: '500', letterSpacing: 0.5 },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof typeScale;

/**
 * Legacy variant aliases. The keys map to the closest M3 variant. Every
 * component that uses these still compiles; new code uses M3 names.
 */
export const legacyVariantAlias = {
  display: 'displaySm',
  h1: 'headlineLg',
  h2: 'headlineSm',
  h3: 'titleLg',
  body: 'bodyMd',
  bodyStrong: 'titleMd',
  caption: 'bodySm',
  label: 'labelMd',
} as const satisfies Record<string, TypeVariant>;

type LegacyVariant = keyof typeof legacyVariantAlias;

/** Combined surface (M3 names + legacy aliases) used by `<Text variant=...>`. */
export const typography: Record<TypeVariant | LegacyVariant, TypeStyle> = {
  ...typeScale,
  ...(Object.fromEntries(
    Object.entries(legacyVariantAlias).map(([alias, m3]) => [alias, typeScale[m3]]),
  ) as Record<LegacyVariant, TypeStyle>),
};

export type TypographyVariant = keyof typeof typography;

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

export const motion = {
  durations: {
    instant: 0,
    fast: 150,
    normal: 200,
    medium: 300,
    slow: 450,
    emphasized: 550,
  },
  easings: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
    pop: 'cubic-bezier(0.2, 0.7, 0.3, 1.1)',
  },
} as const;

// ---------------------------------------------------------------------------
// Elevation — M3 levels 0/1/3/5
// ---------------------------------------------------------------------------

export type ElevationStyle = {
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
};

const level0: ElevationStyle = {
  shadowOpacity: 0,
  shadowRadius: 0,
  shadowOffset: { width: 0, height: 0 },
  elevation: 0,
};
const level1: ElevationStyle = {
  shadowOpacity: 0.3,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
};
const level3: ElevationStyle = {
  shadowOpacity: 0.3,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};
const level5: ElevationStyle = {
  shadowOpacity: 0.3,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
};

export const elevation = {
  level0,
  level1,
  level3,
  level5,
  // Back-compat aliases
  sm: level1,
  md: level3,
  lg: level5,
} as const;

export const hitSlop = { top: 8, right: 8, bottom: 8, left: 8 } as const;

/** Translucent overlay used behind modal sheets. */
export const overlay = 'rgba(0, 0, 0, 0.5)';
