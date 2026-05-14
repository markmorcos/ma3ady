import { Redirect, Stack, usePathname } from 'expo-router';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { useTheme } from '@/design/ThemeProvider';
import { useAuthStore } from '@/state/authStore';
import { useCurrentRole } from '@/state/tenantStore';

export default function AdminLayout() {
  const theme = useTheme();
  const session = useAuthStore((s) => s.session);
  const role = useCurrentRole();
  const pathname = usePathname();

  if (!session) {
    return (
      <Redirect href={{ pathname: '/sign-in', params: { return_to: pathname } }} />
    );
  }
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
