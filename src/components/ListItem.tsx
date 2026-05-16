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
  leading?: ReactNode;
  headline: string;
  supporting?: string;
  trailing?: ReactNode;
  /** When true, the headline + supporting text render in the error color. */
  destructive?: boolean;
};

/**
 * Material Design 3 list item. Three slots: leading icon, headline (+ optional
 * supporting line), trailing action.
 */
export function ListItem({
  leading,
  headline,
  supporting,
  trailing,
  destructive,
  onPress,
  style,
  ...rest
}: Props) {
  const theme = useTheme();
  const isPressable = !!onPress;
  const headlineColor = destructive ? theme.colors.error : theme.colors.onSurface;
  const supportingColor = destructive ? theme.colors.error : theme.colors.onSurfaceVariant;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={isPressable ? 'button' : undefined}
      style={(state) => [
        styles.row,
        {
          backgroundColor: state.pressed && isPressable ? theme.colors.surfaceContainer : 'transparent',
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.text}>
        <Text variant="bodyLg" style={{ color: headlineColor }} numberOfLines={2}>
          {headline}
        </Text>
        {supporting ? (
          <Text variant="bodyMd" style={{ color: supportingColor }} numberOfLines={2}>
            {supporting}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 16,
  },
  leading: { width: 24, alignItems: 'center', justifyContent: 'center' },
  trailing: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
