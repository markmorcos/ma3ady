import { useAppStore } from '@/state/appStore';
import { useAuthStore } from '@/state/authStore';
import { useTenantStore } from '@/state/tenantStore';

/**
 * Returns true once the boot sequence has settled AND any post-sign-in
 * tenant fetch has finished. Route layouts use this to defer
 * auth-based redirects until session + tenants are stable.
 *
 * Without this gate, a hard refresh on /admin races:
 *   - `app/_layout.tsx` mounts and kicks `runBootSequence` async.
 *   - `app/admin/_layout.tsx` mounts immediately, reads
 *     `authStore.session` (still null) and `<Redirect href="/sign-in" />`
 *     fires before the `auth` boot phase restores the localStorage
 *     session a few ms later.
 *
 * Same for the customer side. The hook isolates the "is it safe to
 * route based on auth state yet?" decision in one place.
 */
export function useBootGate(): boolean {
  const bootPhase = useAppStore((s) => s.bootPhase);
  const session = useAuthStore((s) => s.session);
  const tenantsLoading = useTenantStore((s) => s.loading);

  const bootReady =
    bootPhase === 'ready' || bootPhase === 'degraded' || bootPhase === 'misconfigured';
  // While a session exists but tenants are still being fetched
  // (post-sign-in callback path), keep routing decisions on hold —
  // role-based gates would otherwise see `role=null` and bounce the
  // user to the wrong stack for the first frame.
  const awaitingRole = !!session && tenantsLoading;
  return bootReady && !awaitingRole;
}
