import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { getMyMemberships, type TenantWithRole } from '@/services/api/tenants';
import { claimSlug, type ClaimSlugInput } from '@/services/api/onboarding';
import { type TenantRole } from '@/types/db';

const STORAGE_KEY_TENANT_ID = 'app.tenantId';

type TenantState = {
  tenants: TenantWithRole[];
  currentTenantId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  selectTenant: (tenantId: string) => Promise<void>;
  /** @deprecated kept for compatibility; use selectTenant */
  switchTenant: (tenantId: string) => Promise<void>;
  createTenant: (input: ClaimSlugInput) => Promise<TenantWithRole>;
  reset: () => void;
};

function deriveCurrent(tenants: TenantWithRole[], stored: string | null): string | null {
  if (tenants.length === 0) return null;
  if (stored && tenants.some((t) => t.id === stored)) return stored;
  // First-load fallback. Without this, multi-tenant users land on the
  // home screen with `currentTenantId=null` → `useCurrentRole()` returns
  // null → `isStaff` evaluates false → the customer view renders even
  // though the user is an owner of three tenants. They can still switch
  // via the picker later; persisting the choice is handled by
  // `selectTenant`, so the auto-pick only fires on the very first load.
  return tenants[0]?.id ?? null;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  tenants: [],
  currentTenantId: null,
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const tenants = await getMyMemberships();
      const stored = await AsyncStorage.getItem(STORAGE_KEY_TENANT_ID);
      const currentTenantId = deriveCurrent(tenants, stored);
      // Persist the derived choice so the next refresh is deterministic
      // even if the memberships query returns rows in a different order
      // (the API has no explicit ORDER BY). Skip if the derived value
      // matches what was already stored.
      if (currentTenantId && currentTenantId !== stored) {
        await AsyncStorage.setItem(STORAGE_KEY_TENANT_ID, currentTenantId);
      }
      set({ tenants, currentTenantId, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  selectTenant: async (tenantId) => {
    const { tenants } = get();
    if (!tenants.some((t) => t.id === tenantId)) {
      throw new Error(`Cannot select tenant ${tenantId}: not a member`);
    }
    await AsyncStorage.setItem(STORAGE_KEY_TENANT_ID, tenantId);
    set({ currentTenantId: tenantId });
  },
  switchTenant: async (tenantId) => {
    await get().selectTenant(tenantId);
  },
  createTenant: async (input) => {
    const tenant = await claimSlug(input);
    await get().refresh();
    const created: TenantWithRole = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      timezone: tenant.timezone,
      default_locale: tenant.default_locale as 'en' | 'ar',
      brand_color: tenant.brand_color ?? null,
      type: tenant.type,
      location: tenant.location ?? null,
      cancellation_policy: tenant.cancellation_policy ?? null,
      role: 'owner',
    };
    await get().selectTenant(tenant.id);
    return created;
  },
  reset: () => set({ tenants: [], currentTenantId: null, loading: false }),
}));

/**
 * Resolve the current user's role in the active tenant. Returns null if no
 * current tenant or no membership row matches.
 */
export function useCurrentRole(): TenantRole | null {
  const tenants = useTenantStore((s) => s.tenants);
  const currentTenantId = useTenantStore((s) => s.currentTenantId);
  if (!currentTenantId) return null;
  return tenants.find((t) => t.id === currentTenantId)?.role ?? null;
}
