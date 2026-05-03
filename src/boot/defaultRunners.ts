import { bootstrapI18n } from '@/i18n';
import { useAuthStore } from '@/state/authStore';
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
    // tenant resolution lands in implement-tenant-onboarding.
  },
};
