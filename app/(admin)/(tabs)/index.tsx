import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { AppointmentRow } from '@/features/admin/AppointmentRow';
import { StatsCard } from '@/features/admin/StatsCard';
import {
  getTenantStats,
  getTodayAppointments,
} from '@/services/api/admin';
import { useTenantStore } from '@/state/tenantStore';

export default function AdminTodayScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const tenant = useTenantStore((s) =>
    s.tenants.find((tt) => tt.id === s.currentTenantId),
  );

  const tenantId = tenant?.id;
  const tenantTz = tenant?.timezone ?? 'UTC';

  const today = useQuery({
    queryKey: ['admin-today', tenantId, tenantTz],
    queryFn: () => getTodayAppointments(tenantId ?? '', tenantTz),
    enabled: !!tenantId,
  });
  const stats = useQuery({
    queryKey: ['admin-stats', tenantId, tenantTz],
    queryFn: () => getTenantStats(tenantId ?? '', tenantTz),
    enabled: !!tenantId,
  });

  const onRefresh = () => {
    void today.refetch();
    void stats.refetch();
  };

  if (!tenantId) {
    return (
      <View style={styles.center}>
        <EmptyState icon="alert-triangle" title={t('admin.noTenantSelected')} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={today.isFetching || stats.isFetching}
          onRefresh={onRefresh}
          tintColor={theme.colors.brand[500]}
        />
      }
    >
      <Text variant="h2">{tenant?.name}</Text>
      <Text variant="caption" color="muted">
        {t('admin.todaySubtitle')}
      </Text>

      <View style={styles.statsRow}>
        <StatsCard
          label={t('admin.statTodayCount')}
          value={String(stats.data?.todayCount ?? 0)}
        />
        <StatsCard
          label={t('admin.statWeekConfirmed')}
          value={String(stats.data?.weekConfirmed ?? 0)}
        />
        <StatsCard
          label={t('admin.statNoShowRate')}
          value={`${Math.round((stats.data?.noShowRate ?? 0) * 100)}%`}
        />
      </View>

      {today.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.brand[500]} />
        </View>
      ) : (today.data ?? []).length === 0 ? (
        <EmptyState icon="calendar" title={t('admin.todayEmpty')} />
      ) : (
        <View style={styles.list}>
          {(today.data ?? []).map((a) => (
            <AppointmentRow key={a.id} appointment={a} tenantTimezone={tenantTz} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  list: { gap: 8, marginTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
