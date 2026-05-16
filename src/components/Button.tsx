import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
} from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { type Theme } from '@/design/theme';
import { Text } from './Text';

/**
 * Material Design 3 button.
 *
 * `filled` — primary CTA. Solid `primary` background, `onPrimary` foreground.
 * `tonal`  — secondary CTA. `secondaryContainer` background.
 * `outlined` — emphasis-2 secondary. Outline + transparent fill.
 * `text`   — emphasis-3. No background, primary-colored label.
 * `elevated` — surface-container-low background + level1 shadow.
 * `danger` — destructive. `error` background.
 *
 * Legacy variant names are accepted and re-mapped:
 * `primary` → `filled`, `secondary` → `outlined`, `ghost` → `text`.
 */
export type ButtonVariant =
  | 'filled'
  | 'tonal'
  | 'outlined'
  | 'text'
  | 'elevated'
  | 'danger'
  // Legacy aliases
  | 'primary'
  | 'secondary'
  | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
};

const SIZE_STYLES = {
  sm: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 16, fontVariant: 'labelLg' as const },
  md: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 24, fontVariant: 'labelLg' as const },
  lg: { minHeight: 56, paddingVertical: 16, paddingHorizontal: 28, fontVariant: 'titleMd' as const },
};

function normalize(variant: ButtonVariant): ButtonVariant {
  switch (variant) {
    case 'primary':
      return 'filled';
    case 'secondary':
      return 'outlined';
    case 'ghost':
      return 'text';
    default:
      return variant;
  }
}

type VariantStyle = {
  bg: string;
  fg: string;
  border: string;
  elevated: boolean;
};

function variantStyles(theme: Theme, variant: ButtonVariant): VariantStyle {
  const v = normalize(variant);
  switch (v) {
    case 'filled':
      return {
        bg: theme.colors.primary,
        fg: theme.colors.onPrimary,
        border: 'transparent',
        elevated: false,
      };
    case 'tonal':
      return {
        bg: theme.colors.secondaryContainer,
        fg: theme.colors.onSecondaryContainer,
        border: 'transparent',
        elevated: false,
      };
    case 'outlined':
      return {
        bg: 'transparent',
        fg: theme.colors.primary,
        border: theme.colors.outline,
        elevated: false,
      };
    case 'text':
      return {
        bg: 'transparent',
        fg: theme.colors.primary,
        border: 'transparent',
        elevated: false,
      };
    case 'elevated':
      return {
        bg: theme.colors.surfaceContainerLow,
        fg: theme.colors.primary,
        border: 'transparent',
        elevated: true,
      };
    case 'danger':
      return {
        bg: theme.colors.error,
        fg: theme.colors.onError,
        border: 'transparent',
        elevated: false,
      };
    default:
      return {
        bg: theme.colors.primary,
        fg: theme.colors.onPrimary,
        border: 'transparent',
        elevated: false,
      };
  }
}

export function Button({
  label,
  variant = 'filled',
  size = 'md',
  loading,
  disabled,
  leadingIcon,
  trailingIcon,
  fullWidth,
  style,
  ...rest
}: Props) {
  const theme = useTheme();
  const v = variantStyles(theme, variant);
  const s = SIZE_STYLES[size];
  const isDisabled = disabled || loading;
  const radius = theme.expressive ? theme.shape.full : theme.shape.lg;
  const borderWidth = normalize(variant) === 'outlined' ? 1 : 0;
  const shadow = v.elevated && !isDisabled ? theme.elevation.level1 : theme.elevation.level0;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        shadow,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth,
          minHeight: s.minHeight,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: radius,
          opacity: isDisabled ? 0.4 : state.pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {leadingIcon ? <View style={styles.iconStart}>{leadingIcon}</View> : null}
          <Text variant={s.fontVariant} style={{ color: v.fg }}>
            {label}
          </Text>
          {trailingIcon ? <View style={styles.iconEnd}>{trailingIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconStart: { marginEnd: 4 },
  iconEnd: { marginStart: 4 },
});
