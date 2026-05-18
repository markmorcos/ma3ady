import { Slot } from 'expo-router';
import { AppShell } from '@/components/AppShell';

export default function CustomerTabsLayoutWeb() {
  return (
    <AppShell role="customer">
      <Slot />
    </AppShell>
  );
}
