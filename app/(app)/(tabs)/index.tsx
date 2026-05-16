import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { Time } from '@/components/Time';
import { useTheme } from '@/design/ThemeProvider';
import { getMyAppointments } from '@/services/api/appointments';
import { supabase } from '@/services/api/supabase';
import { useAuthStore } from '@/state/authStore';

type TenantWithRecentBooking = {
  id: string;
  slug: string;
  name: string;
  brand_color: string | null;
  last_visit?: string;
};

async function getMyTenants(): Promise<TenantWithRecentBooking[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('starts_at, tenant:tenants(id, slug, name, brand_color)')
    .order('starts_at', { ascending: false });
  if (error) throw error;
  const seen = new Set<string>();
  const out: TenantWithRecentBooking[] = [];
  for (const row of (data ?? []) as unknown as {
    starts_at: string;
    tenant: TenantWithRecentBooking | TenantWithRecentBooking[] | null;
  }[]) {
    const tenant = Array.isArray(row.tenant) ? row.tenant[0] : row.tenant;
    if (!tenant || seen.has(tenant.id)) continue;
    seen.add(tenant.id);
    out.push({ ...tenant, last_visit: row.starts_at });
  }
  return out;
}

export default function CustomerHomeScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const profile = useAuthStore((s) => s.profile);

  const appts = useQuery({ queryKey: ['my-appointments'], queryFn: getMyAppointments });
  const tenants = useQuery({ queryKey: ['my-tenants'], queryFn: getMyTenants });

  const next = (appts.data ?? [])
    .filter((a) => a.status === 'pending' || a.status === 'confirmed')
    .filter((a) => new Date(a.starts_at) > new Date())[0];

  if (appts.isLoading || tenants.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surface }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const places = tenants.data ?? [];
  const visitFormatter = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: 'short',
  });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={{ backgroundColor: theme.colors.surface }}
    >
      <Text variant="headlineMd" style={{ color: theme.colors.onSurface }}>
        {t('app.homeGreeting', { name: profile?.full_name ?? '' })}
      </Text>

      {next ? (
        <Card kind="primary">
          <Text
            variant="labelLg"
            style={{
              color: theme.colors.onPrimaryContainer,
              opacity: 0.85,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {t('app.nextAppointment')}
          </Text>
          <Text
            variant="headlineSm"
            style={{ color: theme.colors.onPrimaryContainer, marginTop: 4 }}
          >
            {next.service?.name ?? '—'}
          </Text>
          <View style={styles.countdownBand}>
            <Icon name="clock" size={16} color="onPrimaryContainer" />
            <Time
              value={next.starts_at}
              context="customer-bookings"
              format="long"
              style={{ color: theme.colors.onPrimaryContainer, fontWeight: '500' }}
            />
          </View>
          <View style={styles.actionRow}>
            <View style={styles.flex}>
              <Button
                label={t('app.checkIn')}
                variant="elevated"
                fullWidth
                leadingIcon={<Icon name="qr-code" size={18} color="primary" />}
                onPress={() => router.push('/(app)/(tabs)/bookings')}
              />
            </View>
            <View style={styles.flex}>
              <Button
                label={t('booking.reschedule')}
                variant="elevated"
                fullWidth
                leadingIcon={<Icon name="repeat" size={18} color="primary" />}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/bookings/[id]/reschedule',
                    params: { id: next.id },
                  })
                }
              />
            </View>
          </View>
        </Card>
      ) : (
        <Card kind="filled">
          <Text variant="titleMd" style={{ color: theme.colors.onSurface }}>
            {t('app.noUpcoming')}
          </Text>
          <Text variant="bodySm" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('app.noUpcomingHint')}
          </Text>
        </Card>
      )}

      <View style={styles.sectionHead}>
        <Text
          variant="titleSm"
          style={{
            color: theme.colors.onSurfaceVariant,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {t('app.tenantsHeading')}
        </Text>
        {places.length > 0 ? (
          <Pressable
            onPress={() => router.push('/(app)/tenants/picker')}
            hitSlop={8}
          >
            <Text variant="labelLg" style={{ color: theme.colors.primary }}>
              {t('app.seeAll')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {places.length === 0 ? (
        <EmptyState icon="calendar" title={t('app.noTenants')} />
      ) : (
        <View style={styles.placesGrid}>
          {places.slice(0, 4).map((tt) => (
            <Pressable
              key={tt.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/(public)/[tenantSlug]',
                  params: { tenantSlug: tt.slug },
                })
              }
              style={styles.placeCardWrap}
            >
              <Card kind="outlined">
                <View
                  style={[
                    styles.placeIconTile,
                    {
                      backgroundColor: tt.brand_color ?? theme.colors.primary,
                      borderRadius: theme.shape.lg,
                    },
                  ]}
                >
                  <Icon name="sparkles" size={18} colorHex={theme.colors.onPrimary} />
                </View>
                <Text variant="titleMd" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
                  {tt.name}
                </Text>
                {tt.last_visit ? (
                  <Text variant="bodySm" style={{ color: theme.colors.onSurfaceVariant }}>
                    {t('app.lastVisit', { date: visitFormatter.format(new Date(tt.last_visit)) })}
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          ))}
        </View>
      )}

      <Card kind="filled">
        <View style={styles.discoverRow}>
          <View
            style={[
              styles.discoverIcon,
              {
                backgroundColor: theme.colors.tertiaryContainer,
                borderRadius: theme.shape.lg,
              },
            ]}
          >
            <Icon name="qr-code" size={22} color="onTertiaryContainer" />
          </View>
          <View style={styles.flex}>
            <Text variant="titleMd" style={{ color: theme.colors.onSurface }}>
              {t('app.discoverTitle')}
            </Text>
            <Text variant="bodyMd" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('app.discoverBody')}
            </Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  countdownBand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  flex: { flex: 1 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  placesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  placeCardWrap: { flexBasis: '47%', flexGrow: 1 },
  placeIconTile: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  discoverRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  discoverIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
