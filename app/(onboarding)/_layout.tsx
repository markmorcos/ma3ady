import { Stack } from 'expo-router';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { useTheme } from '@/design/ThemeProvider';

export default function OnboardingLayout() {
  const theme = useTheme();
  return (
    <RouteErrorBoundary>
      {/* Onboarding mirrors auth — narrow centered column on desktop. */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.colors.bg,
            alignSelf: 'center',
            width: '100%',
            maxWidth: 480,
          },
        }}
      />
    </RouteErrorBoundary>
  );
}
