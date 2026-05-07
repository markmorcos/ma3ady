import { Redirect, Stack } from 'expo-router';
import { useCurrentRole } from '@/state/tenantStore';

export default function DevToolsLayout() {
  const role = useCurrentRole();
  // Owner/admin only — staff and customer roles can't see error reports.
  if (role !== 'owner' && role !== 'admin') {
    return <Redirect href="/" />;
  }
  return <Stack screenOptions={{ headerShown: true }} />;
}
