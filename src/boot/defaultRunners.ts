import { bootstrapI18n } from '@/i18n';
import { useAuthStore } from '@/state/authStore';
import { useTenantStore } from '@/state/tenantStore';
import { type PhaseRunners } from './bootSequence';

export const defaultRunners: PhaseRunners = {
  i18n: async () => {
    await bootstrapI18n();
  },
  theme: async () => {
    // theme resolution lands in setup-design-system.
  },
  auth: async () => {
    await useAuthStore.getState().refresh();
  },
  tenant: async () => {
    // Only fetch memberships if the user signed in. Anonymous boots
    // (public booking flow, dev navigation) skip this entirely.
    const { session } = useAuthStore.getState();
    if (!session) return;
    await useTenantStore.getState().refresh();
  },
};
