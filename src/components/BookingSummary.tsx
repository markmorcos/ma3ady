import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';
import { Time } from './Time';
import { type Service } from '@/types/db';

type Props = {
  service: Service;
  startsAt: string;
  tenantTimezone: string;
};

export function BookingSummary({ service, startsAt, tenantTimezone }: Props) {
  const { t } = useTranslation();
  return (
    <Card>
      <View style={styles.row}>
        <Text variant="label" color="muted">
          {t('booking.service')}
        </Text>
        <Text variant="bodyStrong">{service.name}</Text>
      </View>
      <View style={styles.row}>
        <Text variant="label" color="muted">
          {t('booking.when')}
        </Text>
        <Time
          value={startsAt}
          context="public-booking"
          tenantTimezone={tenantTimezone}
          format="long"
          secondary
        />
      </View>
      <View style={styles.row}>
        <Text variant="label" color="muted">
          {t('booking.duration')}
        </Text>
        <Text variant="body">
          {t('booking.minutes', { count: service.duration_minutes })}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
});
