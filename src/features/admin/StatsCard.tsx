import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';

type Props = {
  label: string;
  value: string;
};

export function StatsCard({ label, value }: Props) {
  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <Text variant="label" color="muted" numberOfLines={1}>
          {label}
        </Text>
        <Text variant="h2" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  card: { minHeight: 92, justifyContent: 'space-between' },
  value: { marginTop: 4 },
});
