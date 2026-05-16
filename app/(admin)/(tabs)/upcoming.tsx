import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { AppointmentRow } from '@/features/admin/AppointmentRow';
import {
  getPastAppointments,
  getUpcomingAppointments,
  type AdminAppointment,
} from '@/services/api/admin';
import { useTenantStore } from '@/state/tenantStore';

type Bucket = 'upcoming' | 'past';

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
  const [bucket, setBucket] = useState<Bucket>('upcoming');

  const tz = tenant?.timezone ?? 'UTC';
  const upcoming = useQuery({
    queryKey: ['admin-upcoming', tenant?.id],
    queryFn: () => getUpcomingAppointments(tenant?.id ?? '', 30),
    enabled: !!tenant?.id && bucket === 'upcoming',
  });
  const past = useQuery({
    queryKey: ['admin-past', tenant?.id],
    queryFn: () => getPastAppointments(tenant?.id ?? '', 100),
    enabled: !!tenant?.id && bucket === 'past',
  });

  const active = bucket === 'upcoming' ? upcoming : past;

  const sections = useMemo(() => {
    const data = active.data ?? [];
    const grouped = new Map<string, AdminAppointment[]>();
    for (const a of data) {
      const key = dayKey(a.starts_at, tz);
      const arr = grouped.get(key) ?? [];
      arr.push(a);
      grouped.set(key, arr);
    }
    const entries = Array.from(grouped.entries());
    if (bucket === 'past') entries.reverse();
    return entries.map(([day, items]) => ({
      title: new Intl.DateTimeFormat(i18n.language, {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
      }).format(new Date(`${day}T00:00:00`)),
      data: items,
    }));
  }, [active.data, tz, i18n.language, bucket]);

  if (!tenant) {
    return (
      <View style={styles.center}>
        <EmptyState icon="alert-triangle" title={t('admin.noTenantSelected')} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.tabs}>
        {(['upcoming', 'past'] as Bucket[]).map((b) => (
          <Chip
            key={b}
            kind="filter"
            label={t(`admin.bucket.${b}`)}
            selected={bucket === b}
            onPress={() => setBucket(b)}
          />
        ))}
      </View>

      {active.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          // Empty state renders inside the SectionList so it sits in the
          // same area as data would, and inherits the pull-to-refresh
          // affordance. Stretches the container so the centred state lands
          // in the visual middle of the list area instead of glued to the
          // top.
          contentContainerStyle={
            sections.length === 0 ? styles.contentEmpty : styles.content
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="calendar"
                title={t(
                  bucket === 'upcoming' ? 'admin.upcomingEmpty' : 'admin.pastEmpty',
                )}
              />
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={active.isFetching}
              onRefresh={active.refetch}
              tintColor={theme.colors.primary}
            />
          }
          renderSectionHeader={({ section }) => (
            <View
              style={[styles.sectionHeader, { backgroundColor: theme.colors.surface }]}
            >
              <Text
                variant="labelLg"
                style={{
                  color: theme.colors.primary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {section.title}
              </Text>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.outlineVariant },
                ]}
              />
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.itemWrap}>
              <AppointmentRow appointment={item} tenantTimezone={tz} />
            </View>
          )}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  content: { padding: 16, gap: 8 },
  contentEmpty: { flexGrow: 1, padding: 16 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  sectionHeader: { paddingTop: 16, paddingBottom: 8, gap: 8 },
  divider: { height: StyleSheet.hairlineWidth, flex: 1 },
  itemWrap: { marginBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
