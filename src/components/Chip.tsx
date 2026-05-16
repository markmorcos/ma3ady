import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
} from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '@/design/ThemeProvider';
import { Text } from './Text';

/**
 * Material Design 3 chip.
 *
 * `filter` — exclusive selection. Selected = `secondaryContainer` background.
 * `assist` — neutral pill, used to attach metadata (e.g. "Open · closes 21:00").
 * `input`  — selectable tag with leading/trailing slots.
 * `suggestion` — outlined transparent pill.
 */
export type ChipKind = 'filter' | 'assist' | 'input' | 'suggestion';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  kind?: ChipKind;
  selected?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function Chip({
  label,
  kind = 'assist',
  selected,
  leading,
  trailing,
  disabled,
  style,
  ...rest
}: Props) {
  const theme = useTheme();
  const radius = theme.expressive ? theme.shape.full : theme.shape.sm;

  let bg = 'transparent';
  let fg = theme.colors.onSurface;
  let border = theme.colors.outline;
  let borderWidth = 1;

  if (selected && (kind === 'filter' || kind === 'input')) {
    bg = theme.colors.secondaryContainer;
    fg = theme.colors.onSecondaryContainer;
    border = 'transparent';
    borderWidth = 0;
  } else if (kind === 'assist') {
    bg = theme.colors.surfaceContainerHigh;
    fg = theme.colors.onSurface;
    border = 'transparent';
    borderWidth = 0;
  } else if (kind === 'suggestion') {
    bg = 'transparent';
    fg = theme.colors.onSurfaceVariant;
    border = theme.colors.outline;
  }

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole={kind === 'filter' ? 'radio' : 'button'}
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      style={(state) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth,
          borderRadius: radius,
          opacity: disabled ? 0.4 : state.pressed ? 0.85 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {leading ? <View style={styles.iconStart}>{leading}</View> : null}
      <Text variant="labelLg" style={{ color: fg }}>
        {label}
      </Text>
      {trailing ? <View style={styles.iconEnd}>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 6,
  },
  iconStart: { marginEnd: 2 },
  iconEnd: { marginStart: 2 },
});
