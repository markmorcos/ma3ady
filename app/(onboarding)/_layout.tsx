import { Stack } from 'expo-router';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';

export default function OnboardingLayout() {
  return (
    <RouteErrorBoundary>
      <Stack screenOptions={{ headerShown: false }} />
    </RouteErrorBoundary>
  );
}
