import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/services/api/supabase';

export type ClientErrorKind =
  | 'boundary'
  | 'unhandled_rejection'
  | 'manual'
  | 'network'
  | 'rls_denied';

const SAMPLE_RATE = (() => {
  const raw = process.env.EXPO_PUBLIC_CLIENT_ERROR_SAMPLE_RATE;
  if (!raw) return 1.0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return 1.0;
  return n;
})();

function shouldReport(kind: ClientErrorKind): boolean {
  if (kind === 'boundary') return true;
  return Math.random() < SAMPLE_RATE;
}

function appVersion(): string | undefined {
  // Constants.expoConfig is typed loosely across expo-constants versions.
  const version = (Constants.expoConfig as { version?: string } | null)?.version;
  return version;
}

type LogErrorOptions = {
  kind: ClientErrorKind;
  context?: Record<string, unknown>;
  tenantId?: string | null;
};

/**
 * Best-effort error reporter. Never throws — if the reporter itself fails we
 * console.warn the inner error and move on. This prevents error loops where
 * reporting an error triggers more errors.
 */
export async function logError(error: unknown, opts: LogErrorOptions): Promise<void> {
  try {
    if (!shouldReport(opts.kind)) return;

    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'unknown_error';
    const stack = error instanceof Error ? error.stack : undefined;

    const payload: Record<string, unknown> = { ...(opts.context ?? {}) };

    await supabase.functions.invoke('report-client-error', {
      body: {
        kind: opts.kind,
        message: message.slice(0, 2048),
        stack: stack?.slice(0, 8192),
        payload,
        app_version: appVersion(),
        platform: Platform.OS,
        locale: undefined,
        tenant_id: opts.tenantId ?? undefined,
      },
    });
  } catch (innerErr) {
    // Failing to log MUST NOT crash the app. Surface to console so we can spot
    // it in dev, otherwise swallow.
    if (__DEV__) {
      console.warn('[logError] reporter failed', innerErr);
    }
  }
}
