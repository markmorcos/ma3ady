import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { Time } from '@/components/Time';
import { type AdminAppointment } from '@/services/api/admin';

type Props = {
  appointment: AdminAppointment;
  tenantTimezone: string;
};

export function AppointmentRow({ appointment, tenantTimezone }: Props) {
  const customerLabel = appointment.guest_contact?.name ?? '—';
  const serviceLabel = appointment.service?.name;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/(admin)/appointment/[id]',
          params: { id: appointment.id },
        })
      }
    >
      <Card>
        <View style={styles.header}>
          <Time
            value={appointment.starts_at}
            context="admin"
            tenantTimezone={tenantTimezone}
            format="short"
          />
          <StatusBadge status={appointment.status} />
        </View>
        <Text variant="bodyStrong" style={styles.customer}>
          {customerLabel}
        </Text>
        {serviceLabel ? (
          <Text variant="caption" color="muted">
            {serviceLabel}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customer: { marginTop: 8 },
});
