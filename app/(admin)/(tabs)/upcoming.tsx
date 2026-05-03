import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { AppointmentRow } from '@/features/admin/AppointmentRow';
import {
  getUpcomingAppointments,
  type AdminAppointment,
} from '@/services/api/admin';
import { useTenantStore } from '@/state/tenantStore';

function dayKey(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

export default function UpcomingScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const tenant = useTenantStore((s) =>
    s.tenants.find((tt) => tt.id === s.currentTenantId),
  );

  const tz = tenant?.timezone ?? 'UTC';
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-upcoming', tenant?.id],
    queryFn: () => getUpcomingAppointments(tenant?.id ?? '', 30),
    enabled: !!tenant?.id,
  });

  const sections = useMemo(() => {
    const grouped = new Map<string, AdminAppointment[]>();
    for (const a of data ?? []) {
      const key = dayKey(a.starts_at, tz);
      const arr = grouped.get(key) ?? [];
      arr.push(a);
      grouped.set(key, arr);
    }
    return Array.from(grouped.entries()).map(([day, items]) => ({
      title: new Intl.DateTimeFormat(i18n.language, {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
      }).format(new Date(`${day}T00:00:00`)),
      data: items,
    }));
  }, [data, tz, i18n.language]);

  if (!tenant) {
    return (
      <View style={styles.center}>
        <EmptyState icon="alert-triangle" title={t('admin.noTenantSelected')} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.brand[500]} />
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={styles.center}>
        <EmptyState icon="calendar" title={t('admin.upcomingEmpty')} />
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={refetch}
          tintColor={theme.colors.brand[500]}
        />
      }
      renderSectionHeader={({ section }) => (
        <View style={[styles.sectionHeader, { backgroundColor: theme.colors.bg }]}>
          <Text variant="label" color="muted">
            {section.title}
          </Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={styles.itemWrap}>
          <AppointmentRow appointment={item} tenantTimezone={tz} />
        </View>
      )}
      stickySectionHeadersEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8 },
  sectionHeader: { paddingTop: 12, paddingBottom: 4 },
  itemWrap: { marginBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
