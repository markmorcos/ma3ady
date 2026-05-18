import { Slot } from 'expo-router';
import { AppShell } from '@/components/AppShell';

export default function AdminTabsLayoutWeb() {
  return (
    <AppShell role="admin">
      <Slot />
    </AppShell>
  );
}
