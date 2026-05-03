import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { DayStrip, groupSlotsByDay } from '@/components/DayStrip';
import { EmptyState } from '@/components/EmptyState';
import { SlotGrid } from '@/components/SlotGrid';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { getAvailableSlots } from '@/services/api/availability';
import { rescheduleAppointmentAuthed, getAppointment } from '@/services/api/appointments';
import { getService } from '@/services/api/services';
import { getTenantById } from '@/services/api/tenants';
import { useToastStore } from '@/state/toastStore';
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

export default function CustomerRescheduleScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showToast = useToastStore((s) => s.show);

  const [windowStart] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const appt = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => getAppointment(id ?? ''),
    enabled: !!id,
  });
  const tenant = useQuery({
    queryKey: ['tenant-by-id', appt.data?.tenant_id],
    queryFn: () => getTenantById(appt.data?.tenant_id ?? ''),
    enabled: !!appt.data?.tenant_id,
  });
  const service = useQuery({
    queryKey: ['service', appt.data?.service_id],
    queryFn: () => getService(appt.data?.service_id ?? ''),
    enabled: !!appt.data?.service_id,
  });

  const rangeEnd = useMemo(() => {
    const e = new Date(windowStart);
    e.setDate(e.getDate() + WINDOW_DAYS);
    return e;
  }, [windowStart]);

  const slots = useQuery({
    queryKey: [
      'reschedule-slots',
      tenant.data?.slug,
      service.data?.id,
      windowStart.toISOString(),
    ],
    queryFn: () =>
      getAvailableSlots({
        tenantSlug: tenant.data?.slug ?? '',
        serviceId: service.data?.id ?? '',
        from: windowStart,
        to: rangeEnd,
      }),
    enabled: !!tenant.data?.slug && !!service.data?.id,
  });

  const tz = tenant.data?.timezone ?? 'UTC';
  const grouped = useMemo(
    () => groupSlotsByDay(slots.data ?? [], tz),
    [slots.data, tz],
  );

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

  const reschedule = useMutation({
    mutationFn: (slot: AvailableSlot) =>
      rescheduleAppointmentAuthed(id ?? '', slot.starts_at),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      void queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      showToast({ kind: 'success', message: t('app.rescheduleSuccess') });
      router.back();
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'unknown';
      showToast({
        kind: msg.includes('slot_taken') || msg.includes('slot_unavailable') ? 'warning' : 'danger',
        message:
          msg.includes('slot_taken') || msg.includes('slot_unavailable')
            ? t('booking.slotTakenToast')
            : msg,
      });
    },
  });

  if (appt.isLoading || tenant.isLoading || service.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.brand[500]} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('booking.rescheduleTitle') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h2">{service.data?.name ?? ''}</Text>
        <Text variant="caption" color="muted">
          {t('booking.minutes', { count: service.data?.duration_minutes ?? 0 })}
        </Text>

        <DayStrip
          days={days}
          selected={day}
          hasSlotsByDay={Object.fromEntries(days.map((d) => [d, !!grouped[d]?.length]))}
          onSelect={setSelectedDay}
          locale={i18n.language}
        />

        {slots.isFetching ? (
          <ActivityIndicator color={theme.colors.brand[500]} />
        ) : (slots.data ?? []).length === 0 ? (
          <EmptyState icon="calendar" title={t('booking.noSlots')} />
        ) : (
          <SlotGrid
            slots={slotsForDay}
            timezone={tz}
            onPick={(slot) => reschedule.mutate(slot)}
          />
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
