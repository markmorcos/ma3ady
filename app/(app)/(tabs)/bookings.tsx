import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { Time } from '@/components/Time';
import { useTheme } from '@/design/ThemeProvider';
import { getMyAppointments } from '@/services/api/appointments';
import { supabase } from '@/services/api/supabase';
import { type Appointment } from '@/types/db';

type Bucket = 'upcoming' | 'past';

type TenantSlim = { id: string; name: string; timezone: string };
type ServiceSlim = { id: string; name: string; duration_minutes: number };

async function getRefs(appointments: Appointment[]): Promise<{
  tenants: Map<string, TenantSlim>;
  services: Map<string, ServiceSlim>;
}> {
  const tenantIds = Array.from(new Set(appointments.map((a) => a.tenant_id)));
  const serviceIds = Array.from(new Set(appointments.map((a) => a.service_id)));
  const [tenantsRes, servicesRes] = await Promise.all([
    tenantIds.length === 0
      ? Promise.resolve({ data: [] as TenantSlim[] })
      : supabase
          .from('tenants')
          .select('id, name, timezone')
          .in('id', tenantIds),
    serviceIds.length === 0
      ? Promise.resolve({ data: [] as ServiceSlim[] })
      : supabase
          .from('services')
          .select('id, name, duration_minutes')
          .in('id', serviceIds),
  ]);
  return {
    tenants: new Map((tenantsRes.data ?? []).map((tt) => [tt.id, tt])),
    services: new Map((servicesRes.data ?? []).map((s) => [s.id, s])),
  };
}

export default function BookingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [bucket, setBucket] = useState<Bucket>('upcoming');

  const { data: appts, isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: getMyAppointments,
  });
  const { data: refs } = useQuery({
    queryKey: ['my-appointments-refs', appts?.map((a) => a.id).join(',')],
    queryFn: () => getRefs(appts ?? []),
    enabled: !!appts && appts.length > 0,
  });

  const items = useMemo(() => {
    const now = Date.now();
    return (appts ?? []).filter((a) => {
      const t = new Date(a.starts_at).getTime();
      return bucket === 'upcoming' ? t >= now : t < now;
    });
  }, [appts, bucket]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.brand[500]} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.tabs}>
        {(['upcoming', 'past'] as Bucket[]).map((b) => (
          <Pressable
            key={b}
            accessibilityRole="button"
            onPress={() => setBucket(b)}
            style={[
              styles.tabButton,
              {
                borderBottomColor:
                  bucket === b ? theme.colors.brand[500] : 'transparent',
              },
            ]}
          >
            <Text
              variant="bodyStrong"
              style={{
                color: bucket === b ? theme.colors.brand[500] : theme.colors.muted,
              }}
            >
              {t(`app.bookingsBucket.${b}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {items.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon="calendar"
            title={t(`app.bookingsEmpty.${bucket}`)}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const tenant = refs?.tenants.get(item.tenant_id);
            const service = refs?.services.get(item.service_id);
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/(app)/bookings/[id]',
                    params: { id: item.id },
                  })
                }
              >
                <Card>
                  <View style={styles.row}>
                    <View style={styles.flex}>
                      <Text variant="bodyStrong">{tenant?.name ?? '—'}</Text>
                      <Text variant="caption" color="muted">
                        {service?.name ?? ''}
                      </Text>
                    </View>
                    <StatusBadge status={item.status} />
                  </View>
                  <Time
                    value={item.starts_at}
                    context="customer-bookings"
                    tenantTimezone={tenant?.timezone ?? null}
                    format="long"
                    secondary
                    style={styles.time}
                  />
                </Card>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8 },
  tabButton: { flex: 1, paddingVertical: 12, borderBottomWidth: 2, alignItems: 'center' },
  list: { padding: 16 },
  separator: { height: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  time: { marginTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
