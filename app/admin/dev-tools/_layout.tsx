import { Redirect, Stack } from 'expo-router';
import { isAdminRole, useCurrentRole } from '@/state/tenantStore';

export default function DevToolsLayout() {
  const role = useCurrentRole();
  // Owner/admin only — staff and customer roles can't see error reports.
  if (!isAdminRole(role)) {
    return <Redirect href="/" />;
  }
  return <Stack screenOptions={{ headerShown: true }} />;
}
