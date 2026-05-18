/* eslint-disable import/first, ma3ady-rules/no-inline-hex */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

// Jest hoists `jest.mock` calls; factory may only reference names prefixed
// with `mock`. Using inline `jest.fn()` here so we can grab it post-import.
jest.mock('@/services/api/tenants', () => ({
  __esModule: true,
  getMyMemberships: jest.fn(),
}));

jest.mock('@/services/api/onboarding', () => ({
  __esModule: true,
  claimSlug: jest.fn(),
}));

import { getMyMemberships, type TenantWithRole } from '@/services/api/tenants';
import { useTenantStore } from '../tenantStore';

const ag = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const getMyMembershipsMock = getMyMemberships as jest.MockedFunction<typeof getMyMemberships>;

function tenant(
  id: string,
  role: 'owner' | 'admin' | 'staff' | 'customer' = 'owner',
): TenantWithRole {
  return {
    id,
    slug: id,
    name: `Tenant ${id}`,
    timezone: 'Europe/Berlin',
    default_locale: 'en',
    brand_color: '#0F766E',
    type: 'generic',
    location: null,
    cancellation_policy: null,
    role,
  };
}

function resetStore() {
  useTenantStore.setState({ tenants: [], currentTenantId: null, loading: false });
}

beforeEach(() => {
  resetStore();
  ag.getItem.mockReset().mockResolvedValue(null);
  ag.setItem.mockReset().mockResolvedValue();
  getMyMembershipsMock.mockReset();
});

describe('tenantStore.refresh', () => {
  it('sets currentTenantId to the stored value if it still matches a membership', async () => {
    getMyMembershipsMock.mockResolvedValue([tenant('a'), tenant('b'), tenant('c')]);
    ag.getItem.mockResolvedValue('b');
    await useTenantStore.getState().refresh();
    expect(useTenantStore.getState().currentTenantId).toBe('b');
    // Already stored; no rewrite expected.
    expect(ag.setItem).not.toHaveBeenCalled();
  });

  it('auto-picks the first membership when nothing is stored, even for multi-tenant users', async () => {
    getMyMembershipsMock.mockResolvedValue([tenant('first'), tenant('second'), tenant('third')]);
    ag.getItem.mockResolvedValue(null);
    await useTenantStore.getState().refresh();
    expect(useTenantStore.getState().currentTenantId).toBe('first');
    // Auto-pick persists so subsequent refreshes are deterministic.
    expect(ag.setItem).toHaveBeenCalledWith('app.tenantId', 'first');
  });

  it('falls back to the only membership when stored value is stale', async () => {
    getMyMembershipsMock.mockResolvedValue([tenant('only')]);
    ag.getItem.mockResolvedValue('non-existent');
    await useTenantStore.getState().refresh();
    expect(useTenantStore.getState().currentTenantId).toBe('only');
    expect(ag.setItem).toHaveBeenCalledWith('app.tenantId', 'only');
  });

  it('falls back to the first membership when stored value is stale (multi-tenant)', async () => {
    getMyMembershipsMock.mockResolvedValue([tenant('a'), tenant('b')]);
    ag.getItem.mockResolvedValue('was-removed');
    await useTenantStore.getState().refresh();
    expect(useTenantStore.getState().currentTenantId).toBe('a');
    expect(ag.setItem).toHaveBeenCalledWith('app.tenantId', 'a');
  });

  it('leaves currentTenantId null when the user has no memberships', async () => {
    getMyMembershipsMock.mockResolvedValue([]);
    ag.getItem.mockResolvedValue(null);
    await useTenantStore.getState().refresh();
    expect(useTenantStore.getState().currentTenantId).toBeNull();
    expect(ag.setItem).not.toHaveBeenCalled();
  });
});
