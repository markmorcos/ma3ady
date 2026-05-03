import { useSessionPrefsStore } from '@/state/sessionPrefsStore';

export type DisplayContext = 'public-booking' | 'admin' | 'customer-bookings';

type Resolver = {
  tenantTimezone?: string | null;
  adminOverride?: string | null;
};

export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function resolveDisplayTimezone(
  context: DisplayContext,
  sessionOverride: string | null,
  resolver: Resolver,
): string {
  if (context === 'public-booking' && sessionOverride) {
    return sessionOverride;
  }
  if (context === 'admin' && resolver.adminOverride) {
    return resolver.adminOverride;
  }
  if (resolver.tenantTimezone) {
    return resolver.tenantTimezone;
  }
  return getDeviceTimezone();
}

export function useDisplayTimezone(context: DisplayContext, resolver: Resolver = {}): string {
  const sessionOverride = useSessionPrefsStore((s) => s.displayTimezoneOverride);
  return resolveDisplayTimezone(context, sessionOverride, resolver);
}
