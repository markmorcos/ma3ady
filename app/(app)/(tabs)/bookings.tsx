import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { Time } from '@/components/Time';
import { useTheme } from '@/design/ThemeProvider';
import { getMyAppointments } from '@/services/api/appointments';

type Bucket = 'upcoming' | 'past';

export default function BookingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [bucket, setBucket] = useState<Bucket>('upcoming');

  const { data: appts, isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: getMyAppointments,
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
      <View style={[styles.center, { backgroundColor: theme.colors.surface }]}>
        <ActivityIndicator color={theme.colors.primary} />
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
            label={t(`app.bookingsBucket.${b}`)}
            selected={bucket === b}
            onPress={() => setBucket(b)}
          />
        ))}
      </View>

      {items.length === 0 ? (
        <View style={styles.center}>
          <EmptyState icon="calendar" title={t(`app.bookingsEmpty.${bucket}`)} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/(app)/bookings/[id]',
                  params: { id: item.id },
                })
              }
            >
              <Card kind="filled">
                <View style={styles.row}>
                  <View
                    style={[
                      styles.iconTile,
                      {
                        backgroundColor: theme.colors.primaryContainer,
                        borderRadius: theme.shape.lg,
                      },
                    ]}
                  >
                    <Icon name="sparkles" size={18} color="onPrimaryContainer" />
                  </View>
                  <View style={styles.body}>
                    <Text variant="titleMd" style={{ color: theme.colors.onSurface }}>
                      {item.tenant?.name ?? '—'}
                    </Text>
                    <Text variant="bodyMd" style={{ color: theme.colors.onSurfaceVariant }}>
                      {item.service?.name ?? ''}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>
                <View style={styles.timeRow}>
                  <Icon name="calendar" size={14} color="onSurfaceVariant" />
                  <Time
                    value={item.starts_at}
                    context="customer-bookings"
                    tenantTimezone={item.tenant?.timezone ?? null}
                    format="long"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  />
                </View>
              </Card>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', padding: 16, gap: 8 },
  list: { padding: 16, paddingTop: 0 },
  separator: { height: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconTile: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
