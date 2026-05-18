import { renderHook, act } from '@testing-library/react-native';
import type { Session } from '@supabase/supabase-js';
import { useBootGate } from '../useBootGate';
import { useAppStore } from '@/state/appStore';
import { useAuthStore } from '@/state/authStore';
import { useTenantStore } from '@/state/tenantStore';

const STUB_SESSION = { user: { id: 'u1' } } as unknown as Session;

function resetStores() {
  act(() => {
    useAppStore.setState({ bootPhase: 'config', bootError: null });
    useAuthStore.setState({ session: null, profile: null, loading: false });
    useTenantStore.setState({ tenants: [], currentTenantId: null, loading: false });
  });
}

describe('useBootGate', () => {
  beforeEach(resetStores);

  it('returns false while the boot sequence is still running', () => {
    act(() => useAppStore.setState({ bootPhase: 'auth' }));
    const { result } = renderHook(() => useBootGate());
    expect(result.current).toBe(false);
  });

  it('returns true once bootPhase reaches `ready`', () => {
    act(() => useAppStore.setState({ bootPhase: 'ready' }));
    const { result } = renderHook(() => useBootGate());
    expect(result.current).toBe(true);
  });

  it('also accepts `degraded` and `misconfigured` as boot-settled', () => {
    const { result, rerender } = renderHook(() => useBootGate());
    act(() => useAppStore.setState({ bootPhase: 'degraded' }));
    rerender(undefined);
    expect(result.current).toBe(true);
    act(() => useAppStore.setState({ bootPhase: 'misconfigured' }));
    rerender(undefined);
    expect(result.current).toBe(true);
  });

  it('stays false while session is present but tenants are loading', () => {
    act(() => {
      useAppStore.setState({ bootPhase: 'ready' });
      useAuthStore.setState({ session: STUB_SESSION });
      useTenantStore.setState({ loading: true });
    });
    const { result } = renderHook(() => useBootGate());
    expect(result.current).toBe(false);
  });

  it('returns true after tenants finish loading', () => {
    act(() => {
      useAppStore.setState({ bootPhase: 'ready' });
      useAuthStore.setState({ session: STUB_SESSION });
      useTenantStore.setState({ loading: false });
    });
    const { result } = renderHook(() => useBootGate());
    expect(result.current).toBe(true);
  });

  it('does not wait on tenant loading when there is no session (anonymous)', () => {
    act(() => {
      useAppStore.setState({ bootPhase: 'ready' });
      useAuthStore.setState({ session: null });
      useTenantStore.setState({ loading: true });
    });
    const { result } = renderHook(() => useBootGate());
    expect(result.current).toBe(true);
  });
});
