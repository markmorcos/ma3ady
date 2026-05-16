import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
} from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '@/design/ThemeProvider';
import { Text } from './Text';

type Props = Omit<PressableProps, 'children'> & {
  label?: string;
  icon: ReactNode;
  /** When true, renders the extended FAB (icon + label). Required if `label` is set. */
  extended?: boolean;
};

/**
 * Material Design 3 Floating Action Button.
 *
 * Standard FAB: 56dp, primary-container background. Extended FAB: 56dp tall,
 * pill, icon + label.
 */
export function FAB({ label, icon, extended, style, ...rest }: Props) {
  const theme = useTheme();
  const isExtended = !!extended || !!label;
  const radius = isExtended ? theme.shape.full : theme.shape.lg;
  return (
    <Pressable
      accessibilityRole="button"
      style={(state) => [
        styles.base,
        theme.elevation.level3,
        {
          backgroundColor: theme.colors.primaryContainer,
          borderRadius: radius,
          paddingHorizontal: isExtended ? 20 : 16,
          opacity: state.pressed ? 0.9 : 1,
        },
        isExtended ? styles.extended : styles.compact,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      <View>{icon}</View>
      {isExtended && label ? (
        <Text variant="labelLg" style={{ color: theme.colors.onPrimaryContainer }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { width: 56, height: 56 },
  extended: { height: 56, gap: 8 },
});
