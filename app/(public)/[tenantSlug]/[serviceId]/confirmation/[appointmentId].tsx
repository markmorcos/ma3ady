import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AnimatedCheck } from '@/components/AnimatedCheck';
import { BookingSummary } from '@/components/BookingSummary';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { TonalBlobs } from '@/components/TonalBlobs';
import { useTheme } from '@/design/ThemeProvider';
import { getService } from '@/services/api/services';
import { getTenantBySlug } from '@/services/api/tenants';
import { useToastStore } from '@/state/toastStore';

const MS_MINUTE = 60_000;

function useCountdown(startsAtIso: string): string | null {
  const startsAt = useMemo(() => new Date(startsAtIso).getTime(), [startsAtIso]);
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), MS_MINUTE);
    return () => clearInterval(id);
  }, []);
  const delta = startsAt - now;
  if (delta <= 0) return null;
  const totalMinutes = Math.floor(delta / MS_MINUTE);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

export default function ConfirmationScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const showToast = useToastStore((s) => s.show);
  const {
    tenantSlug,
    serviceId,
    token,
    starts_at: startsAt,
  } = useLocalSearchParams<{
    tenantSlug: string;
    serviceId: string;
    appointmentId: string;
    token: string;
    starts_at: string;
  }>();

  const { data: tenant } = useQuery({
    queryKey: ['tenant', tenantSlug],
    queryFn: () => getTenantBySlug(tenantSlug ?? ''),
    enabled: !!tenantSlug,
  });
  const { data: service } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => getService(serviceId ?? ''),
    enabled: !!serviceId,
  });
  const countdown = useCountdown(startsAt ?? '');

  const manageUrl = token ? `https://ma3ady.com/manage/${token}` : null;

  if (!tenant || !service || !startsAt) return null;

  const onShare = async () => {
    if (!manageUrl) return;
    try {
      await Share.share({ message: manageUrl });
    } catch {
      // user dismissed share sheet
    }
  };

  const onCopyLink = async () => {
    if (!manageUrl) return;
    await Clipboard.setStringAsync(manageUrl);
    showToast({ kind: 'success', message: t('booking.linkCopied') });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.content}
        style={{ backgroundColor: theme.colors.surface }}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={() => router.replace('/')}
            hitSlop={8}
            style={styles.iconButton}
          >
            <Icon name="x" size={22} color="onSurface" />
          </Pressable>
        </View>

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.colors.primaryContainer,
              borderRadius: theme.shape.xl,
            },
          ]}
        >
          <TonalBlobs opacity={0.5} />
          <AnimatedCheck size={88} />
          <Text
            variant="labelLg"
            style={[
              styles.eyebrow,
              { color: theme.colors.onPrimaryContainer, opacity: 0.75 },
            ]}
          >
            {t('booking.confirmHero')}
          </Text>
          <Text
            variant="headlineMd"
            style={[styles.center, { color: theme.colors.onPrimaryContainer }]}
          >
            {t('booking.confirmHeadline')}
          </Text>
          {countdown ? (
            <View
              style={[
                styles.countdownPill,
                {
                  backgroundColor: theme.colors.onPrimaryContainer + '14',
                  borderRadius: theme.shape.full,
                },
              ]}
            >
              <Text
                variant="titleMd"
                style={{ color: theme.colors.onPrimaryContainer }}
              >
                {t('booking.confirmCountdown', { value: countdown })}
              </Text>
            </View>
          ) : null}
        </View>

        <BookingSummary
          service={service}
          startsAt={startsAt}
          tenantTimezone={tenant.timezone}
          tenant={tenant}
          kind="outlined"
        />

        <View style={styles.sectionBlock}>
          <Text
            variant="titleSm"
            style={{
              color: theme.colors.onSurfaceVariant,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {t('booking.addToCalendar')}
          </Text>
          <View style={styles.chipRow}>
            <Chip label={t('booking.calendarGoogle')} kind="suggestion" />
            <Chip label={t('booking.calendarApple')} kind="suggestion" />
            <Chip label={t('booking.calendarIcal')} kind="suggestion" />
          </View>
        </View>

        {manageUrl ? (
          <Card kind="tertiary">
            <View style={styles.shareRow}>
              <View
                style={[
                  styles.qrTile,
                  { backgroundColor: theme.colors.onTertiaryContainer + '14' },
                ]}
              >
                <QRCode
                  value={manageUrl}
                  size={64}
                  color={theme.colors.onTertiaryContainer}
                  backgroundColor="transparent"
                />
              </View>
              <View style={styles.shareText}>
                <Text
                  variant="titleMd"
                  style={{ color: theme.colors.onTertiaryContainer }}
                >
                  {t('booking.shareTitle')}
                </Text>
                <Text
                  variant="bodyMd"
                  style={{ color: theme.colors.onTertiaryContainer, opacity: 0.85 }}
                >
                  {t('booking.shareBody')}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        <Card kind="filled">
          <View style={styles.policyRow}>
            <Icon name="info" size={18} color="primary" />
            <View style={styles.policyText}>
              <Text variant="titleSm" style={{ color: theme.colors.onSurface }}>
                {t('booking.policyTitle')}
              </Text>
              <Text variant="bodySm" style={{ color: theme.colors.onSurfaceVariant }}>
                {tenant.cancellation_policy ?? t('booking.policyDefault')}
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.ctas}>
          <Button
            label={t('booking.manageBookingCta')}
            variant="filled"
            size="lg"
            fullWidth
            onPress={() => {
              if (token) router.push({ pathname: '/manage/[token]', params: { token } });
            }}
          />
          <View style={styles.ctaRow}>
            <View style={styles.flex}>
              <Button
                label={t('booking.copyLink')}
                variant="tonal"
                fullWidth
                leadingIcon={<Icon name="copy" size={18} color="onSecondaryContainer" />}
                onPress={onCopyLink}
              />
            </View>
            <View style={styles.flex}>
              <Button
                label={t('booking.addToAccountCta')}
                variant="tonal"
                fullWidth
                leadingIcon={<Icon name="share" size={18} color="onSecondaryContainer" />}
                onPress={onShare}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  topBar: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 12,
    overflow: 'hidden',
  },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
  center: { textAlign: 'center' },
  countdownPill: { paddingVertical: 8, paddingHorizontal: 16, marginTop: 4 },
  sectionBlock: { gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qrTile: {
    width: 76,
    height: 76,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareText: { flex: 1, gap: 4 },
  policyRow: { flexDirection: 'row', gap: 12 },
  policyText: { flex: 1, gap: 4 },
  ctas: { gap: 12, marginTop: 4 },
  ctaRow: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});
