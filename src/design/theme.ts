import { palette, radii, spacing, typography, elevation, motion } from './tokens';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

type ThemeColors = {
  brand: { 500: string; 600: string };
  accent: { 500: string };
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  success: string;
  warning: string;
  danger: string;
  white: string;
  brandTint: string;
};

export type Theme = {
  name: 'light' | 'dark';
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  elevation: typeof elevation;
  motion: typeof motion;
};

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    brand: palette.brand.light,
    accent: palette.accent.light,
    bg: palette.neutral.light.bg,
    surface: palette.neutral.light.surface,
    border: palette.neutral.light.border,
    text: palette.neutral.light.text,
    muted: palette.neutral.light.muted,
    success: palette.semantic.light.success,
    warning: palette.semantic.light.warning,
    danger: palette.semantic.light.danger,
    white: '#FFFFFF',
    brandTint: '#0F766E10',
  },
  spacing,
  radii,
  typography,
  elevation,
  motion,
};

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    brand: palette.brand.dark,
    accent: palette.accent.dark,
    bg: palette.neutral.dark.bg,
    surface: palette.neutral.dark.surface,
    border: palette.neutral.dark.border,
    text: palette.neutral.dark.text,
    muted: palette.neutral.dark.muted,
    success: palette.semantic.dark.success,
    warning: palette.semantic.dark.warning,
    danger: palette.semantic.dark.danger,
    white: '#FFFFFF',
    brandTint: '#2DD4BF10',
  },
  spacing,
  radii,
  typography,
  elevation,
  motion,
};

/**
 * Status → semantic-color mapping per `project.md` §1b.
 * Color is never the only differentiator: every Badge also carries an icon + label.
 */
export const statusColorMap: Record<AppointmentStatus, keyof ThemeColors> = {
  pending: 'warning',
  confirmed: 'brand',
  completed: 'success',
  cancelled: 'muted',
  no_show: 'danger',
};

export type ColorToken =
  | `brand.${500 | 600}`
  | `accent.${500}`
  | 'bg'
  | 'surface'
  | 'border'
  | 'text'
  | 'muted'
  | 'success'
  | 'warning'
  | 'danger'
  | 'white'
  | 'brandTint';

export function resolveColor(theme: Theme, token: ColorToken): string {
  if (token.includes('.')) {
    const [group, shade] = token.split('.') as [keyof ThemeColors, string];
    const value = theme.colors[group];
    if (typeof value === 'object') return (value as Record<string, string>)[shade];
    return value as string;
  }
  return theme.colors[token as keyof ThemeColors] as string;
}
