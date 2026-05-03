import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { type Theme } from '@/design/theme';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
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
  sm: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 12, fontVariant: 'caption' as const },
  md: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 16, fontVariant: 'body' as const },
  lg: { minHeight: 56, paddingVertical: 16, paddingHorizontal: 24, fontVariant: 'bodyStrong' as const },
};

function variantStyles(theme: Theme, variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return { bg: theme.colors.brand[500], fg: theme.colors.white, border: 'transparent' };
    case 'secondary':
      return { bg: theme.colors.surface, fg: theme.colors.text, border: theme.colors.border };
    case 'ghost':
      return { bg: 'transparent', fg: theme.colors.brand[500], border: 'transparent' };
    case 'danger':
      return { bg: theme.colors.danger, fg: theme.colors.white, border: 'transparent' };
  }
}

export function Button({
  label,
  variant = 'primary',
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
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          minHeight: s.minHeight,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: theme.radii.md,
          opacity: isDisabled ? 0.5 : state.pressed ? 0.85 : 1,
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
    borderWidth: 1,
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
