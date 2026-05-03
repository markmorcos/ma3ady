import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { type ColorToken } from '@/design/theme';
import { useToastStore, type ToastKind } from '@/state/toastStore';
import { Text } from './Text';

const KIND_TO_COLOR: Record<ToastKind, ColorToken> = {
  info: 'text',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const theme = useTheme();
  if (toasts.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={styles.viewport}>
      {toasts.map((toast) => (
        <Pressable
          key={toast.id}
          onPress={() => dismiss(toast.id)}
          accessibilityRole="alert"
          style={[
            styles.toast,
            { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md, borderColor: theme.colors.border },
          ]}
        >
          <View
            style={[
              styles.bar,
              { backgroundColor: KIND_TO_COLOR[toast.kind] === 'text' ? theme.colors.muted : theme.colors[KIND_TO_COLOR[toast.kind] as 'success' | 'warning' | 'danger'] },
            ]}
          />
          <Text variant="caption">{toast.message}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    bottom: 32,
    start: 16,
    end: 16,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
  },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
});
