import { Redirect, Stack, usePathname } from 'expo-router';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { useTheme } from '@/design/ThemeProvider';
import { useAuthStore } from '@/state/authStore';

export default function AppLayout() {
  const theme = useTheme();
  const session = useAuthStore((s) => s.session);
  const pathname = usePathname();

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
