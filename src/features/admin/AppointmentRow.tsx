import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { Time } from '@/components/Time';
import { useTheme } from '@/design/ThemeProvider';
import { type AdminAppointment } from '@/services/api/admin';

type Props = {
  appointment: AdminAppointment;
  tenantTimezone: string;
};

/**
 * M3 admin appointment row used in the Upcoming list. Leading 56dp time
 * pill, headline name + service body, trailing status badge.
 */
export function AppointmentRow({ appointment, tenantTimezone }: Props) {
  const theme = useTheme();
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
      <Card kind="outlined">
        <View style={styles.row}>
          <View
            style={[
              styles.timePill,
              {
                backgroundColor: theme.colors.surfaceContainerHigh,
                borderRadius: theme.shape.md,
              },
            ]}
          >
            <Time
              value={appointment.starts_at}
              context="admin"
              tenantTimezone={tenantTimezone}
              format="short"
              style={{ color: theme.colors.onSurface, fontWeight: '500' }}
            />
          </View>
          <View style={styles.body}>
            <Text
              variant="titleMd"
              style={{ color: theme.colors.onSurface }}
              numberOfLines={1}
            >
              {customerLabel}
            </Text>
            {serviceLabel ? (
              <Text
                variant="bodyMd"
                style={{ color: theme.colors.onSurfaceVariant }}
                numberOfLines={1}
              >
                {serviceLabel}
              </Text>
            ) : null}
          </View>
          <StatusBadge status={appointment.status} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timePill: {
    width: 64,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
});
