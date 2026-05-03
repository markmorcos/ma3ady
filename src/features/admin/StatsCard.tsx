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
      <Card>
        <Text variant="label" color="muted">
          {label}
        </Text>
        <Text variant="h2" style={styles.value}>
          {value}
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  value: { marginTop: 4 },
});
