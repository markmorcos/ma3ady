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
  if (tenants.length === 1) return tenants[0]?.id ?? null;
  // Multiple memberships: don't auto-pick; the picker resolves it.
  return null;
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

/**
 * Role classification helpers. Single source of truth so callsites
 * don't enumerate `role === 'owner' || role === 'admin' || ...` inline
 * and drift apart when a new role lands.
 *
 * - `isStaffRole`  → can enter the /admin surface (owner / admin / staff).
 * - `isAdminRole`  → can edit tenant config (owner / admin only).
 * - `homeRouteForRole` → where the user should land after sign-in or
 *   tenant switch given their role. Staff land on /admin; everyone
 *   else (customer or unknown) lands on /.
 */
const STAFF_ROLES: ReadonlySet<TenantRole> = new Set(['owner', 'admin', 'staff']);
const ADMIN_ROLES: ReadonlySet<TenantRole> = new Set(['owner', 'admin']);

export function isStaffRole(role: TenantRole | null | undefined): boolean {
  return role != null && STAFF_ROLES.has(role);
}

export function isAdminRole(role: TenantRole | null | undefined): boolean {
  return role != null && ADMIN_ROLES.has(role);
}

export function homeRouteForRole(role: TenantRole | null | undefined): '/admin' | '/' {
  return isStaffRole(role) ? '/admin' : '/';
}
