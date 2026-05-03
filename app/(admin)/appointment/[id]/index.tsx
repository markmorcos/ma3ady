import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { Time } from '@/components/Time';
import { useTheme } from '@/design/ThemeProvider';
import {
  getAppointmentDetail,
  getAppointmentEvents,
  updateAppointmentStatus,
} from '@/services/api/admin';
import { useTenantStore } from '@/state/tenantStore';
import { useToastStore } from '@/state/toastStore';
import { type AppointmentStatus } from '@/types/db';

const NEXT_STATES: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export default function AppointmentDetailScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tenant = useTenantStore((s) =>
    s.tenants.find((tt) => tt.id === s.currentTenantId),
  );
  const showToast = useToastStore((s) => s.show);
  const [auditOpen, setAuditOpen] = useState(false);

  const appt = useQuery({
    queryKey: ['admin-appointment', id],
    queryFn: () => getAppointmentDetail(id ?? ''),
    enabled: !!id,
  });
  const events = useQuery({
    queryKey: ['appointment-events', id],
    queryFn: () => getAppointmentEvents(id ?? ''),
    enabled: !!id && auditOpen,
  });

  const updateStatus = useMutation({
    mutationFn: (status: AppointmentStatus) =>
      updateAppointmentStatus(id ?? '', status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-appointment', id] });
      void queryClient.invalidateQueries({ queryKey: ['appointment-events', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-today', tenant?.id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-upcoming', tenant?.id] });
      showToast({ kind: 'success', message: t('admin.statusUpdated') });
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
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.brand[500]} />
      </View>
    );
  }
  if (!appt.data) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: t('admin.appointment') }} />
        <View style={styles.center}>
          <EmptyState icon="alert-triangle" title={t('admin.appointmentNotFound')} />
        </View>
      </>
    );
  }

  const a = appt.data;
  const tz = tenant?.timezone ?? 'UTC';
  const transitions = NEXT_STATES[a.status];

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('admin.appointment') }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.headerRow}>
            <Text variant="h3">{a.guest_contact?.name ?? '—'}</Text>
            <StatusBadge status={a.status} />
          </View>
          <Text variant="caption" color="muted">
            {a.service?.name ?? '—'}
          </Text>
          <Time
            value={a.starts_at}
            context="admin"
            tenantTimezone={tz}
            format="long"
            secondary
            style={styles.time}
          />
          <Text variant="caption" color="muted" style={styles.row}>
            {t('booking.minutes', { count: a.service?.duration_minutes ?? 0 })}
          </Text>
          {a.guest_contact?.email ? (
            <Text variant="caption" color="muted" style={styles.row}>
              {a.guest_contact.email}
            </Text>
          ) : null}
          {a.guest_contact?.phone ? (
            <Text variant="caption" color="muted">
              {a.guest_contact.phone}
            </Text>
          ) : null}
          {a.notes ? (
            <View style={styles.notes}>
              <Text variant="label" color="muted">
                {t('booking.notes')}
              </Text>
              <Text variant="body">{a.notes}</Text>
            </View>
          ) : null}
        </Card>

        {(a.status === 'pending' || a.status === 'confirmed') && (
          <Button
            label={t('app.bookingReschedule')}
            variant="secondary"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/(admin)/appointment/[id]/reschedule',
                params: { id: a.id },
              })
            }
          />
        )}

        {transitions.length > 0 && (
          <Card>
            <Text variant="bodyStrong">{t('admin.statusActions')}</Text>
            <View style={styles.actions}>
              {transitions.map((next) => (
                <Button
                  key={next}
                  label={t(`admin.statusAction.${next}`)}
                  variant={next === 'cancelled' || next === 'no_show' ? 'danger' : 'primary'}
                  loading={updateStatus.isPending}
                  onPress={() => updateStatus.mutate(next)}
                />
              ))}
            </View>
          </Card>
        )}

        <Card>
          <Pressable
            onPress={() => setAuditOpen((v) => !v)}
            accessibilityRole="button"
            style={styles.auditHeader}
          >
            <Text variant="bodyStrong">{t('admin.auditLog')}</Text>
            <Icon name={auditOpen ? 'chevron-right' : 'chevron-right'} size={18} color="muted" />
          </Pressable>
          {auditOpen && (
            <View style={styles.auditList}>
              {events.isLoading ? (
                <ActivityIndicator color={theme.colors.brand[500]} />
              ) : (events.data ?? []).length === 0 ? (
                <Text variant="caption" color="muted">
                  {t('admin.auditEmpty')}
                </Text>
              ) : (
                (events.data ?? []).map((e) => (
                  <View key={e.id} style={styles.auditRow}>
                    <Text variant="caption">{e.event_type}</Text>
                    <Time
                      value={e.created_at}
                      context="admin"
                      tenantTimezone={tz}
                      format="datetime"
                    />
                  </View>
                ))
              )}
            </View>
          )}
        </Card>

        <Button
          label={t('common.back')}
          variant="ghost"
          fullWidth
          onPress={() => router.back()}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: { marginTop: 8 },
  row: { marginTop: 4 },
  notes: { marginTop: 12 },
  actions: { gap: 8, marginTop: 8 },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  auditList: { marginTop: 12, gap: 8 },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
