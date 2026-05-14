import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { Logo } from '@/branding/Logo';
import { useTheme } from '@/design/ThemeProvider';
import { supabase } from '@/services/api/supabase';
import { routeAfterSignIn } from '@/services/auth/postSignIn';
import { useAuthStore } from '@/state/authStore';
import { useToastStore } from '@/state/toastStore';

// Errors that mean another path (the deep-link callback screen) won the
// race and already minted a session. Treat them like 'Sign-in cancelled':
// don't toast, just navigate.
const SUPPRESS_ERROR_PATTERNS = [
  /Sign-in cancelled/i,
  /code verifier could not be found/i,
  /invalid_grant/i,
  /invalid_request/i,
];

function shouldSuppress(msg: string): boolean {
  return SUPPRESS_ERROR_PATTERNS.some((p) => p.test(msg));
}

export default function SignInScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { return_to } = useLocalSearchParams<{ return_to?: string }>();
  const signIn = useAuthStore((s) => s.signInWithGoogle);
  const showToast = useToastStore((s) => s.show);
  const [busy, setBusy] = useState(false);

  const onSignIn = async () => {
    setBusy(true);
    try {
      await signIn();
      routeAfterSignIn(return_to);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      // If a session got minted by a parallel code path, treat as success.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        routeAfterSignIn(return_to);
        return;
      }
      if (!shouldSuppress(msg)) {
        showToast({
          kind: 'danger',
          message: __DEV__ ? msg : t('errors.generic'),
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.brand}>
        <Logo height={40} />
        <Text variant="caption" color="muted">
          {t('common.tagline')}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label={t('auth.withGoogle')}
          variant="primary"
          fullWidth
          loading={busy}
          onPress={onSignIn}
        />
        <Button
          label={t('auth.continueAsGuest')}
          variant="ghost"
          fullWidth
          onPress={() => router.replace('/')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', padding: 24 },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  actions: { gap: 12, paddingBottom: 32 },
});
