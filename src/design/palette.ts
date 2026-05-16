/**
 * Material Design 3 dynamic palette generator.
 *
 * The handoff documents this as an OKLCH lightness-ramp approximation of
 * Google's HCT tonal mapping (per `ma3ady-theme.jsx → buildPalette()`).
 * Swap to `@material/material-color-utilities` later for production-grade
 * brand-derived palettes — see `design_handoff_ma3ady_v1/README.md`.
 */

export type ThemeMode = 'light' | 'dark';

export type SourcePresetKey = 'ma3ady' | 'salon' | 'clinic' | 'auto' | 'plum' | 'ember';

/** Canonical source-color presets per design handoff §Color. */
export const SOURCE_PRESETS: Record<SourcePresetKey, { hue: number; hex: string }> = {
  ma3ady: { hue: 256, hex: '#0B6BCB' },
  salon: { hue: 45, hex: '#C77A20' },
  clinic: { hue: 195, hex: '#177387' },
  auto: { hue: 150, hex: '#1E8A6E' },
  plum: { hue: 310, hex: '#8E3F84' },
  ember: { hue: 25, hex: '#B23A48' },
};

export const DEFAULT_SOURCE_HEX = SOURCE_PRESETS.ma3ady.hex;

// ============================================================================
// Color math — sRGB hex ⇄ OKLCH
// ============================================================================

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim()) ?? /^#?([0-9a-fA-F]{3})$/.exec(hex.trim());
  if (!m) return { r: 0, g: 0, b: 0 };
  let body = m[1] as string;
  if (body.length === 3) body = body.split('').map((c) => c + c).join('');
  return {
    r: parseInt(body.slice(0, 2), 16) / 255,
    g: parseInt(body.slice(2, 4), 16) / 255,
    b: parseInt(body.slice(4, 6), 16) / 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const pad = (n: number): string => {
    const v = Math.round(clamp01(n) * 255);
    const s = v.toString(16);
    return s.length === 1 ? `0${s}` : s;
  };
  return `#${pad(r)}${pad(g)}${pad(b)}`;
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

// Linear sRGB → OKLab (Björn Ottosson)
function rgbToOklab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function oklabToRgb(L: number, a: number, b: number): { r: number; g: number; b: number } {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return {
    r: clamp01(linearToSrgb(lr)),
    g: clamp01(linearToSrgb(lg)),
    b: clamp01(linearToSrgb(lb)),
  };
}

/** Convert an sRGB hex to OKLCH (L 0..1, C 0..~0.4, H 0..360). */
export function hexToOklch(hex: string): { L: number; C: number; H: number } {
  const { r, g, b } = hexToRgb(hex);
  const { L, a, b: bb } = rgbToOklab(r, g, b);
  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
}

/** Build an sRGB hex from OKLCH (L 0..1, C 0..~0.4, H 0..360). */
export function oklchToHex(L: number, C: number, H: number): string {
  const rad = (H * Math.PI) / 180;
  const a = Math.cos(rad) * C;
  const b = Math.sin(rad) * C;
  const { r, g, b: bb } = oklabToRgb(L, a, b);
  return rgbToHex(r, g, bb);
}

// ============================================================================
// Role table
// ============================================================================

export type M3Roles = {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  surface: string;
  onSurface: string;
  onSurfaceVariant: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  outline: string;
  outlineVariant: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  // Ma3ady role extensions
  success: string;
  onSuccess: string;
  successContainer: string;
  onSuccessContainer: string;
  warning: string;
  onWarning: string;
  warningContainer: string;
  onWarningContainer: string;
};

/**
 * Build the full role table from a single source hex. Light mode uses
 * mid-tone primaries with light containers; dark mode mirrors with
 * lightness inverted. See handoff §Color "Role mapping".
 */
export function buildPalette(sourceHex: string, mode: ThemeMode): M3Roles {
  const { H } = hexToOklch(sourceHex);
  const H2 = (H + 70) % 360; // tertiary analogous accent
  const lc = (l: number, c: number, h: number): string => oklchToHex(l, c, h);

  if (mode === 'light') {
    return {
      primary: lc(0.48, 0.18, H),
      onPrimary: '#ffffff',
      primaryContainer: lc(0.92, 0.08, H),
      onPrimaryContainer: lc(0.18, 0.12, H),

      secondary: lc(0.46, 0.05, H),
      onSecondary: '#ffffff',
      secondaryContainer: lc(0.91, 0.03, H),
      onSecondaryContainer: lc(0.2, 0.04, H),

      tertiary: lc(0.48, 0.13, H2),
      onTertiary: '#ffffff',
      tertiaryContainer: lc(0.91, 0.07, H2),
      onTertiaryContainer: lc(0.18, 0.09, H2),

      surface: lc(0.98, 0.006, H),
      onSurface: lc(0.14, 0.01, H),
      onSurfaceVariant: lc(0.4, 0.015, H),
      surfaceContainerLow: lc(0.96, 0.008, H),
      surfaceContainer: lc(0.94, 0.01, H),
      surfaceContainerHigh: lc(0.92, 0.012, H),
      surfaceContainerHighest: lc(0.9, 0.014, H),
      outline: lc(0.55, 0.015, H),
      outlineVariant: lc(0.82, 0.015, H),

      error: lc(0.48, 0.2, 27),
      onError: '#ffffff',
      errorContainer: lc(0.92, 0.06, 27),
      onErrorContainer: lc(0.18, 0.1, 27),

      success: lc(0.46, 0.13, 145),
      onSuccess: '#ffffff',
      successContainer: lc(0.92, 0.06, 145),
      onSuccessContainer: lc(0.2, 0.09, 145),
      warning: lc(0.7, 0.16, 75),
      onWarning: '#ffffff',
      warningContainer: lc(0.94, 0.07, 75),
      onWarningContainer: lc(0.25, 0.08, 75),
    };
  }

  // Dark — invert lightness for primary/container/surface families.
  return {
    primary: lc(0.82, 0.16, H),
    onPrimary: lc(0.18, 0.08, H),
    primaryContainer: lc(0.34, 0.12, H),
    onPrimaryContainer: lc(0.92, 0.08, H),

    secondary: lc(0.82, 0.04, H),
    onSecondary: lc(0.2, 0.03, H),
    secondaryContainer: lc(0.34, 0.03, H),
    onSecondaryContainer: lc(0.91, 0.03, H),

    tertiary: lc(0.82, 0.11, H2),
    onTertiary: lc(0.18, 0.06, H2),
    tertiaryContainer: lc(0.34, 0.09, H2),
    onTertiaryContainer: lc(0.91, 0.07, H2),

    surface: lc(0.13, 0.01, H),
    onSurface: lc(0.92, 0.01, H),
    onSurfaceVariant: lc(0.78, 0.015, H),
    surfaceContainerLow: lc(0.15, 0.012, H),
    surfaceContainer: lc(0.17, 0.014, H),
    surfaceContainerHigh: lc(0.2, 0.016, H),
    surfaceContainerHighest: lc(0.23, 0.018, H),
    outline: lc(0.6, 0.02, H),
    outlineVariant: lc(0.35, 0.018, H),

    error: lc(0.78, 0.16, 27),
    onError: lc(0.2, 0.08, 27),
    errorContainer: lc(0.36, 0.12, 27),
    onErrorContainer: lc(0.92, 0.06, 27),

    success: lc(0.78, 0.13, 145),
    onSuccess: lc(0.2, 0.06, 145),
    successContainer: lc(0.34, 0.09, 145),
    onSuccessContainer: lc(0.92, 0.06, 145),
    warning: lc(0.85, 0.14, 75),
    onWarning: lc(0.25, 0.06, 75),
    warningContainer: lc(0.4, 0.1, 75),
    onWarningContainer: lc(0.94, 0.07, 75),
  };
}
