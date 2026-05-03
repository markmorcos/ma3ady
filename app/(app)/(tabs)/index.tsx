import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
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
};

async function getMyTenants(): Promise<TenantWithRecentBooking[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('tenant:tenants(id, slug, name, brand_color)')
    .order('starts_at', { ascending: false });
  if (error) throw error;
  const seen = new Set<string>();
  const out: TenantWithRecentBooking[] = [];
  for (const row of (data ?? []) as unknown as { tenant: TenantWithRecentBooking | TenantWithRecentBooking[] | null }[]) {
    const tenant = Array.isArray(row.tenant) ? row.tenant[0] : row.tenant;
    if (!tenant || seen.has(tenant.id)) continue;
    seen.add(tenant.id);
    out.push(tenant);
  }
  return out;
}

export default function CustomerHomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const profile = useAuthStore((s) => s.profile);

  const appts = useQuery({
    queryKey: ['my-appointments'],
    queryFn: getMyAppointments,
  });
  const tenants = useQuery({
    queryKey: ['my-tenants'],
    queryFn: getMyTenants,
  });

  const next = (appts.data ?? [])
    .filter((a) => a.status === 'pending' || a.status === 'confirmed')
    .filter((a) => new Date(a.starts_at) > new Date())[0];

  if (appts.isLoading || tenants.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.brand[500]} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="h2">
        {t('app.homeGreeting', { name: profile?.full_name ?? '' })}
      </Text>

      {next ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/(app)/(tabs)/bookings',
            })
          }
        >
          <Card>
            <Text variant="label" color="muted">
              {t('app.nextAppointment')}
            </Text>
            <Time
              value={next.starts_at}
              context="customer-bookings"
              format="long"
              secondary
              style={styles.nextTime}
            />
          </Card>
        </Pressable>
      ) : (
        <Card>
          <Text variant="bodyStrong">{t('app.noUpcoming')}</Text>
          <Text variant="caption" color="muted">
            {t('app.noUpcomingHint')}
          </Text>
        </Card>
      )}

      <Text variant="bodyStrong" style={styles.heading}>
        {t('app.tenantsHeading')}
      </Text>
      {(tenants.data ?? []).length === 0 ? (
        <EmptyState icon="calendar" title={t('app.noTenants')} />
      ) : (
        <View style={styles.tenantGrid}>
          {(tenants.data ?? []).map((tt) => (
            <Pressable
              key={tt.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/(public)/[tenantSlug]',
                  params: { tenantSlug: tt.slug },
                })
              }
              style={styles.tenantCardWrap}
            >
              <Card>
                <View
                  style={[
                    styles.brandBar,
                    { backgroundColor: tt.brand_color ?? theme.colors.brand[500] },
                  ]}
                />
                <Text variant="bodyStrong">{tt.name}</Text>
                <Text variant="caption" color="muted">
                  {tt.slug}
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  nextTime: { marginTop: 8 },
  heading: { marginTop: 8 },
  tenantGrid: { gap: 12 },
  tenantCardWrap: {},
  brandBar: { height: 4, borderRadius: 2, marginBottom: 12 },
});
