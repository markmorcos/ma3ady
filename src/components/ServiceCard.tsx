import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { Card } from './Card';
import { Icon } from './Icon';
import { Text } from './Text';
import { type Service } from '@/types/db';

type Props = {
  service: Service;
  onPress: () => void;
};

/**
 * M3 service row card used on the public tenant home. Shows the service name
 * (Title Md), duration + optional description (Body Sm), and a trailing
 * chevron to indicate the row is tappable.
 */
export function ServiceCard({ service, onPress }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.pressable}>
      <Card kind="filled">
        <View style={styles.row}>
          <View style={styles.text}>
            <Text variant="titleMd" style={{ color: theme.colors.onSurface }}>
              {service.name}
            </Text>
            <View style={styles.meta}>
              <Icon name="clock" size={14} color="onSurfaceVariant" />
              <Text variant="bodyMd" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('booking.minutes', { count: service.duration_minutes })}
              </Text>
            </View>
            {service.description ? (
              <Text
                variant="bodySm"
                numberOfLines={2}
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {service.description}
              </Text>
            ) : null}
          </View>
          <Icon name="chevron-right" size={20} color="onSurfaceVariant" />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: { flex: 1, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
