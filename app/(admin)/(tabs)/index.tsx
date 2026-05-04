import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
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
  const tenants = useTenantStore((s) => s.tenants);
  const tenant = useTenantStore((s) =>
    s.tenants.find((tt) => tt.id === s.currentTenantId),
  );
  const multiTenant = tenants.length > 1;

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

  const onShare = async () => {
    if (!tenant) return;
    const url = `https://${tenant.slug}.ma3ady.com/`;
    try {
      await Share.share({
        message: t('admin.shareLinkMessage', { tenantName: tenant.name, url }),
        url,
      });
    } catch {
      // user cancelled or sheet failed; nothing to do
    }
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
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          {multiTenant ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(app)/tenants/picker')}
              style={styles.tenantNameRow}
            >
              <Text variant="h2">{tenant?.name}</Text>
              <Icon name="chevron-right" size={20} color="muted" />
            </Pressable>
          ) : (
            <Text variant="h2">{tenant?.name}</Text>
          )}
          <Text variant="caption" color="muted">
            {t('admin.todaySubtitle')}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('admin.shareLink')}
          onPress={onShare}
          hitSlop={8}
          style={[styles.shareButton, { borderColor: theme.colors.border }]}
        >
          <Icon name="copy" size={18} color="brand.500" />
          <Text variant="caption" color="brand.500">
            {t('admin.shareLink')}
          </Text>
        </Pressable>
      </View>

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
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tenantNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  list: { gap: 8, marginTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
