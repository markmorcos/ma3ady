import { Stack } from 'expo-router';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';

// Placeholder admin route-group layout. The full tabbed layout lands in
// implement-admin-mobile-dashboard.
export default function AdminLayout() {
  return (
    <RouteErrorBoundary>
      <Stack />
    </RouteErrorBoundary>
  );
}
