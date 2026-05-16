import {
  elevation,
  motion,
  radii,
  shape,
  spacing,
  spacingScale,
  typography,
} from './tokens';
import { buildPalette, DEFAULT_SOURCE_HEX, type M3Roles, type ThemeMode } from './palette';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

/**
 * Theme color surface.
 *
 * Carries the full M3 role table plus a back-compat block of "legacy" short
 * keys (`brand`, `bg`, `text`, `muted`, etc.) that resolve to the closest M3
 * role. The legacy keys exist so screens not yet migrated to M3 role names
 * keep compiling; the cleanup commit at the end of the revamp deletes them.
 *
 * Note: `surface`, `successContainer`, `warningContainer`, and `errorContainer`
 * are M3 role names; the legacy block reuses them by aliasing the M3 value.
 */
export type ThemeColors = Omit<M3Roles, never> & {
  brand: { 500: string; 600: string };
  accent: { 500: string };
  bg: string;
  border: string;
  text: string;
  muted: string;
  danger: string;
  white: string;
  brandTint: string;
};

export type Theme = {
  name: ThemeMode;
  /** Source hex used to build the palette. */
  sourceHex: string;
  /** Whether expressive shape language is on (default true). */
  expressive: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  spacingScale: typeof spacingScale;
  radii: typeof radii;
  shape: typeof shape;
  typography: typeof typography;
  elevation: typeof elevation;
  motion: typeof motion;
};

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

function withLegacy(roles: M3Roles): ThemeColors {
  return {
    ...roles,
    brand: { 500: roles.primary, 600: roles.onPrimaryContainer },
    accent: { 500: roles.tertiary },
    bg: roles.surface,
    border: roles.outlineVariant,
    text: roles.onSurface,
    muted: roles.onSurfaceVariant,
    danger: roles.error,
    white: '#FFFFFF',
    brandTint: hexWithAlpha(roles.primary, 0.06),
  };
}

export function buildTheme({
  mode,
  sourceHex = DEFAULT_SOURCE_HEX,
  expressive = true,
}: {
  mode: ThemeMode;
  sourceHex?: string;
  expressive?: boolean;
}): Theme {
  const roles = buildPalette(sourceHex, mode);
  return {
    name: mode,
    sourceHex,
    expressive,
    colors: withLegacy(roles),
    spacing,
    spacingScale,
    radii,
    shape,
    typography,
    elevation,
    motion,
  };
}

/** Default light theme (Ma3ady source). Useful as a fallback / test seed. */
export const lightTheme: Theme = buildTheme({ mode: 'light' });

/** Default dark theme (Ma3ady source). */
export const darkTheme: Theme = buildTheme({ mode: 'dark' });

/**
 * Status → role-token mapping per the design handoff §Status badges. Each
 * status maps to a background container role + a foreground role. Color is
 * never the only differentiator: every badge also carries an icon + label.
 */
export const statusColorMap: Record<
  AppointmentStatus,
  { bg: keyof ThemeColors; fg: keyof ThemeColors }
> = {
  pending: { bg: 'warningContainer', fg: 'onWarningContainer' },
  confirmed: { bg: 'successContainer', fg: 'onSuccessContainer' },
  completed: { bg: 'secondaryContainer', fg: 'onSecondaryContainer' },
  cancelled: { bg: 'errorContainer', fg: 'onErrorContainer' },
  no_show: { bg: 'surfaceContainerHighest', fg: 'onSurfaceVariant' },
};

/**
 * Tokens accepted by `<Text color={...}>`, `<Icon color={...}>`, etc.
 * Includes M3 role keys plus the legacy short-key set.
 */
export type ColorToken =
  | keyof M3Roles
  | `brand.${500 | 600}`
  | `accent.${500}`
  | 'bg'
  | 'border'
  | 'text'
  | 'muted'
  | 'danger'
  | 'white'
  | 'brandTint';

export function resolveColor(theme: Theme, token: ColorToken): string {
  const t = String(token);
  if (t.includes('.')) {
    const [group, shadeStr] = t.split('.') as [keyof ThemeColors, string];
    const value = theme.colors[group];
    if (value && typeof value === 'object') {
      return (value as Record<string, string>)[shadeStr] ?? theme.colors.onSurface;
    }
    return (value as string) ?? theme.colors.onSurface;
  }
  const value = theme.colors[t as keyof ThemeColors];
  if (typeof value === 'string') return value;
  return theme.colors.onSurface;
}
