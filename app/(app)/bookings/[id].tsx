import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { Time } from '@/components/Time';
import { useTheme } from '@/design/ThemeProvider';
import { useThemedHeaderOptions } from '@/hooks/useThemedHeader';
import { updateAppointmentStatus } from '@/services/api/admin';
import { getAppointment } from '@/services/api/appointments';
import { getService } from '@/services/api/services';
import { getTenantById } from '@/services/api/tenants';
import { useToastStore } from '@/state/toastStore';

export default function CustomerBookingDetailScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showToast = useToastStore((s) => s.show);
  const headerOptions = useThemedHeaderOptions(t('app.bookingTitle'));
  const [confirmingCancel, setConfirmingCancel] = useState(false);

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

  const cancel = useMutation({
    mutationFn: () => updateAppointmentStatus(id ?? '', 'cancelled'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      void queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      showToast({ kind: 'success', message: t('booking.cancelled') });
      setConfirmingCancel(false);
    },
    onError: (err) => {
      showToast({
        kind: 'danger',
        message: err instanceof Error ? err.message : 'unknown',
      });
    },
  });

  if (appt.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surface }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  if (!appt.data) {
    return (
      <>
        <Stack.Screen options={headerOptions} />
        <View style={[styles.center, { backgroundColor: theme.colors.surface }]}>
          <EmptyState icon="alert-triangle" title={t('admin.appointmentNotFound')} />
        </View>
      </>
    );
  }

  const a = appt.data;
  const tz = tenant.data?.timezone ?? 'UTC';
  const canMutate = a.status === 'pending' || a.status === 'confirmed';

  return (
    <>
      <Stack.Screen options={headerOptions} />
      <ScrollView
        contentContainerStyle={styles.content}
        style={{ backgroundColor: theme.colors.surface }}
      >
        <View style={styles.headerBlock}>
          <Text variant="headlineSm" style={{ color: theme.colors.onSurface }}>
            {tenant.data?.name ?? '—'}
          </Text>
          <Text variant="bodyMd" style={{ color: theme.colors.onSurfaceVariant }}>
            {service.data?.name ?? ''}
          </Text>
          <View style={styles.badgeRow}>
            <StatusBadge status={a.status} />
          </View>
        </View>

        <Card kind="outlined">
          <Time
            value={a.starts_at}
            context="customer-bookings"
            tenantTimezone={tz}
            format="long"
            style={{ color: theme.colors.onSurface, fontSize: 18, fontWeight: '500' }}
          />
          <Text
            variant="bodyMd"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
          >
            {t('booking.minutes', { count: service.data?.duration_minutes ?? 0 })}
          </Text>
        </Card>

        {canMutate && !confirmingCancel && (
          <View style={styles.actions}>
            <Button
              label={t('app.bookingReschedule')}
              variant="tonal"
              fullWidth
              onPress={() =>
                router.push({
                  pathname: '/(app)/bookings/[id]/reschedule',
                  params: { id: a.id },
                })
              }
            />
            <Button
              label={t('booking.cancelBooking')}
              variant="text"
              fullWidth
              onPress={() => setConfirmingCancel(true)}
            />
          </View>
        )}

        {confirmingCancel && (
          <Card kind="filled">
            <Text variant="titleMd" style={{ color: theme.colors.onSurface }}>
              {t('booking.cancelConfirmTitle')}
            </Text>
            <Text variant="bodySm" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('booking.cancelConfirmBody')}
            </Text>
            <View style={styles.confirmRow}>
              <Button
                label={t('booking.keepIt')}
                variant="text"
                onPress={() => setConfirmingCancel(false)}
              />
              <Button
                label={t('booking.cancelConfirm')}
                variant="danger"
                loading={cancel.isPending}
                onPress={() => cancel.mutate()}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  headerBlock: { gap: 4 },
  badgeRow: { marginTop: 8 },
  actions: { gap: 8 },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
