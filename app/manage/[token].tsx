import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Text } from '@/components/Text';
import { Time } from '@/components/Time';
import { useTheme } from '@/design/ThemeProvider';
import {
  cancelByToken,
  getAppointmentByToken,
  InvalidManageTokenError,
} from '@/services/api/booking';
import { getService } from '@/services/api/services';
import { getTenantById } from '@/services/api/tenants';
import { useToastStore } from '@/state/toastStore';

export default function ManageScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { token } = useLocalSearchParams<{ token: string }>();
  const showToast = useToastStore((s) => s.show);
  const queryClient = useQueryClient();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const {
    data: appointment,
    isError: tokenInvalid,
    isLoading: loading,
  } = useQuery({
    queryKey: ['appointment-by-token', token],
    queryFn: () => getAppointmentByToken(token ?? ''),
    enabled: !!token,
    retry: false,
  });

  const { data: service } = useQuery({
    queryKey: ['service', appointment?.service_id],
    queryFn: () => getService(appointment?.service_id ?? ''),
    enabled: !!appointment?.service_id,
  });
  const { data: tenant } = useQuery({
    queryKey: ['tenant-by-id', appointment?.tenant_id],
    queryFn: () => getTenantById(appointment?.tenant_id ?? ''),
    enabled: !!appointment?.tenant_id,
  });

  const onCancel = async () => {
    if (!token) return;
    setCancelling(true);
    try {
      await cancelByToken(token);
      // Drop the cached appointment so a re-open of the manage link doesn't
      // briefly show the stale "active" view before the token is rejected.
      queryClient.removeQueries({ queryKey: ['appointment-by-token', token] });
      setConfirmingCancel(false);
      showToast({ kind: 'success', message: t('booking.cancelled') });
      // The manage token is single-use after cancel; route back home so the
      // user doesn't see the "this link is no longer valid" empty state on
      // the screen they were just on.
      router.replace('/');
    } catch (err) {
      const msg =
        err instanceof InvalidManageTokenError
          ? t('booking.manageInvalid')
          : err instanceof Error
            ? err.message
            : 'unknown';
      showToast({ kind: 'danger', message: msg });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return null;

  if (tokenInvalid || !appointment) {
    return (
      <>
        <Stack.Screen options={{ title: t('booking.manageTitle') }} />
        <View style={styles.empty}>
          <EmptyState icon="alert-triangle" title={t('booking.manageInvalid')} />
        </View>
      </>
    );
  }

  const isCancelled = appointment.status === 'cancelled';

  return (
    <>
      <Stack.Screen options={{ title: t('booking.manageTitle') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {service && tenant && (
          <Card>
            <Text variant="bodyStrong">{tenant.name}</Text>
            <Text variant="caption" color="muted">
              {service.name}
            </Text>
            <Time
              value={appointment.starts_at}
              context="public-booking"
              tenantTimezone={tenant.timezone}
              format="long"
              secondary
              style={styles.time}
            />
            {isCancelled && (
              <View
                style={[
                  styles.cancelledBadge,
                  { backgroundColor: theme.colors.muted + '20' },
                ]}
              >
                <Text variant="caption" color="muted">
                  {t('booking.cancelled')}
                </Text>
              </View>
            )}
          </Card>
        )}

        {!isCancelled && !confirmingCancel && (
          <View style={styles.actions}>
            <Button
              label={t('booking.cancelBooking')}
              variant="danger"
              fullWidth
              onPress={() => setConfirmingCancel(true)}
            />
          </View>
        )}

        {confirmingCancel && (
          <Card>
            <Text variant="bodyStrong">{t('booking.cancelConfirmTitle')}</Text>
            <Text variant="caption" color="muted">
              {t('booking.cancelConfirmBody')}
            </Text>
            <View style={styles.confirmRow}>
              <Pressable
                onPress={() => setConfirmingCancel(false)}
                accessibilityRole="button"
              >
                <Text variant="caption" color="muted">
                  {t('booking.keepIt')}
                </Text>
              </Pressable>
              <Button
                label={t('booking.cancelConfirm')}
                variant="danger"
                loading={cancelling}
                onPress={onCancel}
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
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  time: { marginTop: 8 },
  cancelledBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  actions: { gap: 12 },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
});
