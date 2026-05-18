import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { DayStrip, groupSlotsByDay } from '@/components/DayStrip';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { SlotGrid } from '@/components/SlotGrid';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { getAvailableSlots } from '@/services/api/availability';
import { getService } from '@/services/api/services';
import { getTenantBySlug } from '@/services/api/tenants';
import { type AvailableSlot } from '@/types/db';

const WINDOW_DAYS = 14;

function isoDate(d: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export default function SlotsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { tenantSlug, serviceId } = useLocalSearchParams<{
    tenantSlug: string;
    serviceId: string;
  }>();

  const [windowStart, setWindowStart] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  const rangeEnd = useMemo(() => {
    const e = new Date(windowStart);
    e.setDate(e.getDate() + WINDOW_DAYS);
    return e;
  }, [windowStart]);

  const { data: slots = [], isFetching } = useQuery({
    queryKey: ['slots', tenantSlug, serviceId, windowStart.toISOString()],
    queryFn: () =>
      getAvailableSlots({
        tenantSlug: tenantSlug ?? '',
        serviceId: serviceId ?? '',
        from: windowStart,
        to: rangeEnd,
      }),
    enabled: !!tenantSlug && !!serviceId,
  });

  const tz = tenant?.timezone ?? 'UTC';
  const grouped = useMemo(() => groupSlotsByDay(slots, tz), [slots, tz]);

  const days = useMemo(() => {
    const out: string[] = [];
    const d = new Date(windowStart);
    for (let i = 0; i < WINDOW_DAYS; i++) {
      out.push(isoDate(d, tz));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [windowStart, tz]);

  const day = selectedDay ?? days.find((d) => grouped[d]?.length) ?? days[0];
  const slotsForDay: AvailableSlot[] = grouped[day] ?? [];

  const onPick = (slot: AvailableSlot) => {
    router.push({
      pathname: '/(public)/t/[tenantSlug]/[serviceId]/book',
      params: { tenantSlug, serviceId, starts_at: slot.starts_at },
    });
  };

  if (!tenant || !service) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.brand[500]} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ backgroundColor: theme.colors.surface }}
    >
      <View style={styles.titleBlock}>
        <Text variant="headlineSm" style={{ color: theme.colors.onSurface }}>
          {service.name}
        </Text>
        <Text variant="bodyMd" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('booking.minutes', { count: service.duration_minutes })}
        </Text>
      </View>

      <DayStrip
        days={days}
        selected={day}
        slotCountByDay={Object.fromEntries(days.map((d) => [d, grouped[d]?.length ?? 0]))}
        onSelect={(d) => setSelectedDay(d)}
        locale={i18n.language}
      />

      {isFetching ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.brand[500]} />
        </View>
      ) : slots.length === 0 ? (
        <EmptyState
          icon="calendar"
          title={t('booking.noSlots')}
          action={
            <Button
              label={t('booking.tryNextWeek')}
              variant="secondary"
              onPress={() => {
                const next = new Date(windowStart);
                next.setDate(next.getDate() + WINDOW_DAYS);
                setWindowStart(next);
                setSelectedDay(null);
              }}
            />
          }
        />
      ) : (
        <SlotGrid slots={slotsForDay} timezone={tz} onPick={onPick} />
      )}

      <View style={styles.footer}>
        <Button
          label={t('booking.tryPreviousWeek')}
          variant="text"
          onPress={() => {
            const prev = new Date(windowStart);
            prev.setDate(prev.getDate() - WINDOW_DAYS);
            setWindowStart(prev);
            setSelectedDay(null);
          }}
        />
        <Button
          label={t('booking.tryNextWeek')}
          variant="text"
          onPress={() => {
            const next = new Date(windowStart);
            next.setDate(next.getDate() + WINDOW_DAYS);
            setWindowStart(next);
            setSelectedDay(null);
          }}
        />
      </View>

      <View
        style={[
          styles.tipCard,
          {
            backgroundColor: theme.colors.surfaceContainerLow,
            borderRadius: theme.shape.lg,
          },
        ]}
      >
        <Icon name="hand" size={18} color="onSurfaceVariant" />
        <Text variant="bodySm" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
          {t('booking.scanHint')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 32 },
  titleBlock: { paddingHorizontal: 16, paddingTop: 16, gap: 4 },
  center: { padding: 32, alignItems: 'center' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
  },
});
