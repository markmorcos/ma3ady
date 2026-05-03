import { Stack } from 'expo-router';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { useTheme } from '@/design/ThemeProvider';

export default function PublicLayout() {
  const theme = useTheme();
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
