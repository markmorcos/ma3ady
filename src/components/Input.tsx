import { useState, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { Text } from './Text';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  helper?: string;
  /** Leading icon node — rendered inside the field on the start edge. */
  leadingIcon?: ReactNode;
  /** Trailing icon node — rendered inside the field on the end edge. */
  trailingIcon?: ReactNode;
  /** Inline prefix text (e.g. `ma3ady.com/t/` for the slug input). */
  prefix?: string;
};

export function Input({
  label,
  error,
  helper,
  leadingIcon,
  trailingIcon,
  prefix,
  style,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.error
    : focused
      ? theme.colors.primary
      : theme.colors.outline;

  const fieldRadius = theme.shape.md;

  return (
    <View style={styles.container}>
      {label ? (
        <Text variant="labelLg" style={{ color: theme.colors.onSurfaceVariant }}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.fieldRow,
          {
            borderColor,
            borderWidth: focused || error ? 2 : 1,
            borderRadius: fieldRadius,
            backgroundColor: theme.colors.surface,
            paddingHorizontal: leadingIcon || prefix ? 12 : 16,
          },
        ]}
      >
        {leadingIcon ? <View style={styles.iconStart}>{leadingIcon}</View> : null}
        {prefix ? (
          <Text variant="bodyMd" style={{ color: theme.colors.onSurfaceVariant }}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: theme.colors.onSurface,
              writingDirection: 'auto',
              flex: 1,
            },
            style,
          ]}
          {...rest}
        />
        {trailingIcon ? <View style={styles.iconEnd}>{trailingIcon}</View> : null}
      </View>
      {error ? (
        <Text variant="bodySm" style={{ color: theme.colors.error }}>
          {error}
        </Text>
      ) : helper ? (
        <Text variant="bodySm" style={{ color: theme.colors.onSurfaceVariant }}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: 8,
  },
  input: {
    fontSize: 16,
    minHeight: 48,
    paddingVertical: 12,
  },
  iconStart: { marginEnd: 4 },
  iconEnd: { marginStart: 4 },
});
