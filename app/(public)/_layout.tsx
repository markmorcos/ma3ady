import { Stack } from 'expo-router';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { useTheme } from '@/design/ThemeProvider';

export default function PublicLayout() {
  const theme = useTheme();
  return (
    <RouteErrorBoundary>
      {/* maxWidth + alignSelf center the booking flow as a narrow column
          on web at desktop widths. Mobile viewports stay full-width
          because maxWidth exceeds them. */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.colors.bg,
            alignSelf: 'center',
            width: '100%',
            maxWidth: 640,
          },
        }}
      />
    </RouteErrorBoundary>
  );
}
