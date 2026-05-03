import { Stack } from 'expo-router';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';

export default function AuthLayout() {
  return (
    <RouteErrorBoundary>
      <Stack screenOptions={{ headerShown: false }} />
    </RouteErrorBoundary>
  );
}
