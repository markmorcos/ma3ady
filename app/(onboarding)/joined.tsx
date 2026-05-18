import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet, View } from 'react-native';
import { AnimatedCheck } from '@/components/AnimatedCheck';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { appHost } from '@/services/appHost';
import { copyToClipboard } from '@/services/clipboard';
import { useTenantStore } from '@/state/tenantStore';
import { useToastStore } from '@/state/toastStore';

export default function JoinedScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const tenant = useTenantStore((s) => s.tenants.find((tt) => tt.id === s.currentTenantId));
  const showToast = useToastStore((s) => s.show);

  const shareUrl = tenant ? `${appHost()}/t/${tenant.slug}` : appHost();
  // The pill in the hero shows the link without the `https://` prefix for
  // visual density; share / copy actions get the full URL.
  const displayUrl = shareUrl.replace(/^https?:\/\//, '');

  const onCopy = async () => {
    await copyToClipboard(shareUrl);
    showToast({ kind: 'success', message: t('onboarding.joinedLinkCopied') });
  };

  const onShare = async () => {
    try {
      await Share.share({ message: shareUrl });
    } catch {
      // user cancelled or sheet failed; nothing to do
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.hero}>
          <AnimatedCheck size={120} />
          <Text variant="headlineLg" style={[styles.center, { color: theme.colors.onSurface }]}>
            {t('onboarding.joinedHeader')}
          </Text>
          <Text
            variant="bodyLg"
            style={[styles.center, { color: theme.colors.onSurfaceVariant, maxWidth: 320 }]}
          >
            {t('onboarding.joinedBody')}
          </Text>

          <View
            style={[
              styles.linkPill,
              {
                backgroundColor: theme.colors.primaryContainer,
                borderRadius: theme.shape.full,
              },
            ]}
          >
            <Icon name="globe" size={16} color="onPrimaryContainer" />
            <Text variant="labelLg" style={{ color: theme.colors.onPrimaryContainer }}>
              {displayUrl}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <View style={styles.actionsRow}>
            <View style={styles.flex}>
              <Button
                label={t('onboarding.joinedCopy')}
                variant="tonal"
                size="md"
                fullWidth
                leadingIcon={<Icon name="copy" size={18} color="onSecondaryContainer" />}
                onPress={onCopy}
              />
            </View>
            <View style={styles.flex}>
              <Button
                label={t('onboarding.joinedShare')}
                variant="tonal"
                size="md"
                fullWidth
                leadingIcon={<Icon name="globe" size={18} color="onSecondaryContainer" />}
                onPress={onShare}
              />
            </View>
          </View>
          <Button
            label={t('onboarding.joinedToDashboard')}
            variant="filled"
            size="lg"
            fullWidth
            trailingIcon={<Icon name="chevron-right" size={20} color="onPrimary" />}
            onPress={() => router.replace('/admin')}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 48,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  center: { textAlign: 'center' },
  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  actions: { gap: 12, paddingBottom: 32 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});
