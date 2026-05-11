import { Redirect, Stack } from 'expo-router';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { useTheme } from '@/design/ThemeProvider';
import { useAuthStore } from '@/state/authStore';

export default function AppLayout() {
  const theme = useTheme();
  const session = useAuthStore((s) => s.session);

  if (!session) return <Redirect href="/sign-in" />;

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
