import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { Logo } from '@/branding/Logo';
import { useTheme } from '@/design/ThemeProvider';
import { useAuthStore } from '@/state/authStore';
import { useToastStore } from '@/state/toastStore';

export default function SignInScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const signIn = useAuthStore((s) => s.signInWithGoogle);
  const showToast = useToastStore((s) => s.show);
  const [busy, setBusy] = useState(false);

  const onSignIn = async () => {
    setBusy(true);
    try {
      await signIn();
      router.replace('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      if (msg !== 'Sign-in cancelled') {
        showToast({ kind: 'danger', message: t('errors.generic') });
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
