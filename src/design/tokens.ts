/**
 * Design tokens — single source of truth for colors, type, spacing, radii, motion.
 * Components MUST consume the resolved theme (`useTheme()`), not these raw maps directly.
 */

export const palette = {
  brand: {
    light: { 500: '#0F766E', 600: '#0E6660' },
    dark: { 500: '#2DD4BF', 600: '#14B8A6' },
  },
  accent: {
    light: { 500: '#F59E0B' },
    dark: { 500: '#FBBF24' },
  },
  neutral: {
    light: {
      bg: '#FAFAF9',
      surface: '#FFFFFF',
      border: '#E7E5E4',
      text: '#0C0A09',
      muted: '#78716C',
    },
    dark: {
      bg: '#0A0A0A',
      surface: '#171717',
      border: '#262626',
      text: '#FAFAF9',
      muted: '#A8A29E',
    },
  },
  semantic: {
    light: {
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
    },
    dark: {
      success: '#34D399',
      warning: '#FBBF24',
      danger: '#F87171',
    },
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 40, lineHeight: 48, fontWeight: '700' as const },
  h1: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const },
  h2: { fontSize: 24, lineHeight: 32, fontWeight: '600' as const },
  h3: { fontSize: 20, lineHeight: 28, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
} as const;

export type TypographyVariant = keyof typeof typography;

export const motion = {
  durations: { fast: 120, normal: 200, slow: 320 },
  easings: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  },
} as const;

export const elevation = {
  sm: { shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  md: { shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  lg: { shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
} as const;

export const hitSlop = { top: 8, right: 8, bottom: 8, left: 8 } as const;
