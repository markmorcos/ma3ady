import { Redirect, Stack, usePathname } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { useTheme } from '@/design/ThemeProvider';
import { useBootGate } from '@/hooks/useBootGate';
import { useAuthStore } from '@/state/authStore';
import { isStaffRole, useCurrentRole } from '@/state/tenantStore';

export default function AdminLayout() {
  const theme = useTheme();
  const ready = useBootGate();
  const session = useAuthStore((s) => s.session);
  const role = useCurrentRole();
  const pathname = usePathname();

  // Defer ALL redirect decisions until the boot sequence has settled
  // and any in-flight tenant fetch (e.g. immediately after sign-in)
  // has resolved. Otherwise a hard refresh on /admin bounces the user
  // to /sign-in because session reads null before the auth phase
  // restores it.
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
  if (role && !isStaffRole(role)) {
    return <Redirect href="/" />;
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
