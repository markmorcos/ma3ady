import { Redirect, Stack } from 'expo-router';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { useTheme } from '@/design/ThemeProvider';
import { useAuthStore } from '@/state/authStore';
import { useCurrentRole } from '@/state/tenantStore';

export default function AdminLayout() {
  const theme = useTheme();
  const session = useAuthStore((s) => s.session);
  const role = useCurrentRole();

  if (!session) return <Redirect href="/sign-in" />;
  if (role && role !== 'owner' && role !== 'admin' && role !== 'staff') {
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
