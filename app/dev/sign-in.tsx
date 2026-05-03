import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { supabase } from '@/services/api/supabase';
import { useAuthStore } from '@/state/authStore';
import { useToastStore } from '@/state/toastStore';

const DEV_USERS = [
  { label: 'Owner (demo)', email: 'dev-owner@example.com' },
  { label: 'Admin (demo)', email: 'dev-admin@example.com' },
  { label: 'Staff (demo)', email: 'dev-staff@example.com' },
  { label: 'Customer (no tenant)', email: 'dev-customer@example.com' },
] as const;

const DEV_PASSWORD = 'devpassword';

export default function DevSignIn() {
  const theme = useTheme();
  const session = useAuthStore((s) => s.session);
  const refresh = useAuthStore((s) => s.refresh);
  const signOut = useAuthStore((s) => s.signOut);
  const showToast = useToastStore((s) => s.show);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const onSignIn = async (email: string) => {
    setBusy(email);
    setLastError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: DEV_PASSWORD,
      });
      if (error) throw error;
      if (!data.session) throw new Error('signInWithPassword returned no session');
      await refresh();
      router.replace('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('[dev sign-in] failed', err);
      setLastError(msg);
      showToast({ kind: 'danger', message: `Dev sign-in failed: ${msg}` });
    } finally {
      setBusy(null);
    }
  };

  const onSignOut = async () => {
    await signOut();
    showToast({ kind: 'info', message: 'Signed out' });
  };

  return (
    <>
      <Stack.Screen options={{ title: '/dev/sign-in' }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.bg }]}
        contentContainerStyle={styles.content}
      >
        <Text variant="h3">Dev sign-in</Text>
        <Text variant="caption" color="muted">
          Pre-seeded test users. Run `make dev-users` once after `supabase db reset`.
        </Text>

        <View style={[styles.panel, { borderColor: theme.colors.border }]}>
          <Text variant="label" color="muted">
            Supabase URL
          </Text>
          <Text variant="caption">{process.env.EXPO_PUBLIC_SUPABASE_URL ?? '(unset)'}</Text>
        </View>

        <View style={[styles.panel, { borderColor: theme.colors.border }]}>
          <Text variant="label" color="muted">
            Current session
          </Text>
          <Text variant="caption">
            {session ? `${session.user.email ?? session.user.id}` : 'not signed in'}
          </Text>
          {session && (
            <Pressable
              onPress={onSignOut}
              accessibilityRole="button"
              style={[styles.signOut, { borderColor: theme.colors.border }]}
            >
              <Text variant="caption" color="danger">
                Sign out
              </Text>
            </Pressable>
          )}
        </View>

        {lastError && (
          <View
            style={[
              styles.panel,
              { borderColor: theme.colors.danger, backgroundColor: theme.colors.danger + '15' },
            ]}
          >
            <Text variant="label" color="danger">
              Last error
            </Text>
            <Text variant="caption" color="danger">
              {lastError}
            </Text>
          </View>
        )}

        <View style={[styles.panel, { borderColor: theme.colors.border }]}>
          <Text variant="label" color="muted">
            Sign in as
          </Text>
          {DEV_USERS.map((u) => (
            <Pressable
              key={u.email}
              onPress={() => onSignIn(u.email)}
              disabled={busy !== null}
              accessibilityRole="button"
              style={[
                styles.row,
                {
                  borderColor: theme.colors.border,
                  opacity: busy === u.email ? 0.5 : 1,
                },
              ]}
            >
              <Text variant="caption">{u.label}</Text>
              <Text variant="caption" color="muted">
                {u.email}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  panel: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  row: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  signOut: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
});
