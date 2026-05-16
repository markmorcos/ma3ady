import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';

type Props = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/**
 * Material Design 3 switch.
 *
 * 52dp × 32dp track + 24dp thumb. On = `primary` track with `onPrimary`
 * thumb; off = `surfaceContainerHighest` track with `outline` thumb.
 */
export function Switch({ value, onValueChange, disabled, accessibilityLabel }: Props) {
  const theme = useTheme();
  const trackBg = value ? theme.colors.primary : theme.colors.surfaceContainerHighest;
  const thumbBg = value ? theme.colors.onPrimary : theme.colors.outline;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[
        styles.track,
        {
          backgroundColor: trackBg,
          borderColor: value ? theme.colors.primary : theme.colors.outline,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: thumbBg,
            transform: [{ translateX: value ? 20 : 0 }],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 52,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});
