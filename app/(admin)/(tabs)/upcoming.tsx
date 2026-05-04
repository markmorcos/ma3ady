import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
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
    <View style={styles.flex}>
      <View style={[styles.tabs, { borderBottomColor: theme.colors.border }]}>
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
              {t(`admin.bucket.${b}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {active.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.brand[500]} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon="calendar"
            title={t(bucket === 'upcoming' ? 'admin.upcomingEmpty' : 'admin.pastEmpty')}
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={active.isFetching}
              onRefresh={active.refetch}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderBottomWidth: 2,
    alignItems: 'center',
  },
  content: { padding: 16, gap: 8 },
  sectionHeader: { paddingTop: 12, paddingBottom: 4 },
  itemWrap: { marginBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
