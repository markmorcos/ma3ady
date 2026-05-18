import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/design/ThemeProvider';

type Props = {
  label: string;
  /** "HH:MM" (24h). */
  value: string;
  onChange: (next: string) => void;
};

// Web implementation backs the field with the browser's native
// `<input type="time">`. The input emits "HH:MM" already, matching
// what callers expect.
export function TimeField({ label, value, onChange }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text variant="label" color="muted">
        {label}
      </Text>
      <input
        type="time"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          minHeight: 44,
          padding: '11px 14px',
          borderRadius: 12,
          border: `1px solid ${theme.colors.border}`,
          background: theme.colors.surface,
          color: theme.colors.text,
          fontSize: 16,
          fontFamily: 'inherit',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 4 },
});
