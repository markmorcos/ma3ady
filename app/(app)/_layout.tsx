import { Redirect, Stack, usePathname } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { useTheme } from '@/design/ThemeProvider';
import { useBootGate } from '@/hooks/useBootGate';
import { useAuthStore } from '@/state/authStore';

export default function AppLayout() {
  const theme = useTheme();
  const ready = useBootGate();
  const session = useAuthStore((s) => s.session);
  const pathname = usePathname();

  // Defer the unauthenticated-redirect until the boot sequence has
  // settled — see app/admin/_layout.tsx for the same rationale.
  if (!ready) {
    return (
      <View style={[styles.gate, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator color={theme.colors.brand[500]} />
      </View>
    );
  }

  if (!session) {
    return (
      <Redirect href={{ pathname: '/sign-in', params: { return_to: pathname } }} />
    );
  }

  return (
    <RouteErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      />
    </RouteErrorBoundary>
  );
}

const styles = StyleSheet.create({
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
