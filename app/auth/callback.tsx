import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { exchangeCodeForSession } from '@/services/auth/googleSignIn';
import { useAuthStore } from '@/state/authStore';

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
  const params = useLocalSearchParams<{ code?: string }>();
  const refresh = useAuthStore((s) => s.refresh);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      const code = params.code;
      if (!code) {
        setError(t('auth.callbackMissingCode'));
        return;
      }
      try {
        await timeout(exchangeCodeForSession(code), EXCHANGE_TIMEOUT_MS, controller.signal);
        if (cancelled) return;
        await refresh();
        router.replace('/');
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'unknown';
        setError(
          msg === 'exchange_timeout' ? t('auth.callbackTimeout') : t('errors.generic'),
        );
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [params.code, refresh, t]);

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
            onPress={() => router.replace('/(auth)/sign-in')}
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
