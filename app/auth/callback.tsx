import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { supabase } from '@/services/api/supabase';
import { exchangeCodeForSession } from '@/services/auth/googleSignIn';
import { routeAfterSignIn } from '@/services/auth/postSignIn';
import { useAuthStore } from '@/state/authStore';
import { useTenantStore } from '@/state/tenantStore';

const EXCHANGE_TIMEOUT_MS = 10_000;

function timeout<T>(promise: Promise<T>, ms: number, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('exchange_timeout')), ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new Error('aborted'));
    });
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export default function AuthCallback() {
  const { t } = useTranslation();
  const theme = useTheme();
  const params = useLocalSearchParams<{ code?: string; return_to?: string }>();
  const refresh = useAuthStore((s) => s.refresh);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    // Refresh tenants right after the session is established so a fresh
    // sign-in that lands directly on /admin (or routeAfterSignIn picks
    // the admin path) sees the staff role on first render instead of
    // racing through the customer view. Swallow errors — anonymous /
    // brand-new accounts have no memberships, and the screens handle
    // that gracefully.
    const loadTenants = async () => {
      try {
        await useTenantStore.getState().refresh();
      } catch (err) {
        if (__DEV__) console.warn('[auth/callback] tenant refresh failed', err);
      }
    };

    (async () => {
      // If the sign-in screen path already minted a session (it races against
      // this deep-link route on Android once App Links is on), skip the
      // exchange -- OAuth codes are single-use and a second exchange would
      // throw invalid_grant.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (cancelled) return;
        await loadTenants();
        if (cancelled) return;
        routeAfterSignIn(params.return_to);
        return;
      }

      const code = params.code;
      if (!code) {
        setError(t('auth.callbackMissingCode'));
        return;
      }

      try {
        await timeout(exchangeCodeForSession(code), EXCHANGE_TIMEOUT_MS, controller.signal);
        if (cancelled) return;
        await refresh();
        if (cancelled) return;
        await loadTenants();
        if (cancelled) return;
        routeAfterSignIn(params.return_to);
      } catch (err) {
        if (cancelled) return;
        // The other path may have minted a session while we were exchanging.
        const { data: after } = await supabase.auth.getSession();
        if (after.session) {
          await loadTenants();
          if (cancelled) return;
          routeAfterSignIn(params.return_to);
          return;
        }
        const msg = err instanceof Error ? err.message : 'unknown';
        setError(
          msg === 'exchange_timeout'
            ? t('auth.callbackTimeout')
            : __DEV__
              ? msg
              : t('errors.generic'),
        );
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [params.code, params.return_to, refresh, t]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {error ? (
        <>
          <Text variant="h3">{t('auth.callbackErrorTitle')}</Text>
          <Text variant="body" color="muted" style={styles.body}>
            {error}
          </Text>
          <Button
            label={t('common.retry')}
            variant="primary"
            onPress={() => router.replace('/sign-in')}
          />
        </>
      ) : (
        <>
          <ActivityIndicator color={theme.colors.brand[500]} />
          <Text variant="caption" color="muted" style={styles.body}>
            {t('auth.callbackInProgress')}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  body: { textAlign: 'center' },
});
