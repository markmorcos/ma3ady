import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { overlay } from '@/design/tokens';
import { useAppStore } from '@/state/appStore';
import { useAuthStore } from '@/state/authStore';
import { useCurrentRole, useTenantStore } from '@/state/tenantStore';

const SHOW_DEV_TOOLS = process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === '1';

const DEV_LINKS: { href: string; label: string }[] = [
  { href: '/dev', label: '/dev' },
  { href: '/dev/sign-in', label: '/dev/sign-in (test users)' },
  { href: '/dev/i18n', label: '/dev/i18n' },
  { href: '/dev/design-system', label: '/dev/design-system' },
  { href: '/sign-in', label: '/sign-in' },
  { href: '/welcome', label: '/welcome (onboarding)' },
  { href: '/tenants/picker', label: '/tenants/picker' },
  { href: '/(public)/t/demo', label: '/t/demo (public booking)' },
  { href: '/manage/invalid-token', label: '/manage/invalid-token' },
];

export default function Home() {
  const { t } = useTranslation();
  const theme = useTheme();
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const role = useCurrentRole();
  const refreshTenants = useTenantStore((s) => s.refresh);
  const tenantsLoading = useTenantStore((s) => s.loading);
  const bootPhase = useAppStore((s) => s.bootPhase);
  const [devOpen, setDevOpen] = useState(false);

  const userId = session?.user.id;
  useEffect(() => {
    if (userId) void refreshTenants();
  }, [userId, refreshTenants]);

  const isStaff = role === 'owner' || role === 'admin' || role === 'staff';

  // Gate the UI on boot completion so admins don't flash the customer
  // landing for a frame while their tenants + role resolve. The boot
  // sequence awaits useTenantStore.refresh() during the `tenant` phase,
  // so by the time bootPhase moves past it we know the role too.
  const bootReady =
    bootPhase === 'ready' || bootPhase === 'degraded' || bootPhase === 'misconfigured';
  // If we have a session but the tenant fetch is mid-flight (e.g. a
  // post-sign-in refetch triggered by the userId effect above), keep the
  // splash up until role resolves. Anonymous users have no role to wait
  // for, so they bypass.
  const awaitingRole = !!session && tenantsLoading;
  if (!bootReady || awaitingRole) {
    return (
      <View style={[styles.bootGate, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator color={theme.colors.brand[500]} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerBar}>
        <View />
        {SHOW_DEV_TOOLS && (
          <Pressable
            onPress={() => setDevOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('home.devMenu')}
            hitSlop={12}
          >
            <Icon name="more-vertical" size={22} color="muted" />
          </Pressable>
        )}
      </View>

      <View style={styles.hero}>
        <Text variant="display">ma3ady</Text>
        <Text variant="body" color="muted" style={styles.tagline}>
          {t('common.tagline')}
        </Text>
      </View>

      {!session ? (
        <View style={styles.actions}>
          <Button
            label={t('home.signIn')}
            variant="primary"
            fullWidth
            onPress={() => router.push('/sign-in')}
          />
          <Pressable onPress={() => router.push('/welcome')} accessibilityRole="button">
            <Text variant="caption" color="muted" style={styles.tenantCta}>
              {t('home.tenantOnboard')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          <Card>
            <Text variant="label" color="muted">
              {t('home.signedInAs')}
            </Text>
            <Text variant="bodyStrong">
              {profile?.full_name ?? session?.user.email ?? '—'}
            </Text>
          </Card>

          {isStaff ? (
            <Button
              label={t('home.openAdmin')}
              variant="primary"
              fullWidth
              onPress={() => router.push('/admin')}
            />
          ) : (
            <Button
              label={t('home.openMyApp')}
              variant="primary"
              fullWidth
              onPress={() => router.push('/(app)/(tabs)')}
            />
          )}
          {!isStaff && (
            <Pressable onPress={() => router.push('/welcome')} accessibilityRole="button">
              <Text variant="caption" color="muted" style={styles.tenantCta}>
                {t('home.tenantOnboardSignedIn')}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      <Modal visible={devOpen} animationType="fade" transparent>
        <Pressable
          style={styles.modalBackdrop}
          accessibilityRole="button"
          onPress={() => setDevOpen(false)}
        >
          <Pressable
            onPress={() => undefined}
            style={[styles.devSheet, { backgroundColor: theme.colors.surface }]}
          >
            <Text variant="h3">{t('home.devTools')}</Text>
            <Text variant="caption" color="muted">
              EXPO_PUBLIC_SHOW_DEV_TOOLS=1
            </Text>
            <View style={styles.devLinks}>
              {DEV_LINKS.map((d) => (
                <Link
                  key={d.href}
                  href={d.href as never}
                  onPress={() => setDevOpen(false)}
                  style={[styles.devLink, { color: theme.colors.brand[500] }]}
                  accessibilityRole="link"
                >
                  {d.label}
                </Link>
              ))}
            </View>
            <Button
              label={t('common.close')}
              variant="ghost"
              onPress={() => setDevOpen(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bootGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexGrow: 1, padding: 24 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between' },
  hero: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
    gap: 8,
  },
  tagline: { textAlign: 'center' },
  actions: { gap: 12, marginTop: 16 },
  tenantCta: { textAlign: 'center', paddingVertical: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: overlay,
    justifyContent: 'flex-end',
  },
  devSheet: {
    padding: 24,
    gap: 12,
    borderTopStartRadius: 24,
    borderTopEndRadius: 24,
  },
  devLinks: { gap: 8, paddingVertical: 8 },
  devLink: { fontSize: 14, paddingVertical: 4 },
});
