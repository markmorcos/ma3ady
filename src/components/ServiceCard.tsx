import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { Icon } from './Icon';
import { Text } from './Text';
import { type Service } from '@/types/db';

type Props = {
  service: Service;
  onPress: () => void;
};

export function ServiceCard({ service, onPress }: Props) {
  const { t } = useTranslation();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.pressable}>
      <Card>
        <View style={styles.header}>
          <Text variant="bodyStrong">{service.name}</Text>
          <View style={styles.duration}>
            <Icon name="clock" size={14} color="muted" />
            <Text variant="caption" color="muted">
              {t('booking.minutes', { count: service.duration_minutes })}
            </Text>
          </View>
        </View>
        {service.description ? (
          <Text variant="caption" color="muted" style={styles.body}>
            {service.description}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { marginBottom: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  duration: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  body: { marginTop: 6 },
});
