import { StyleSheet, Text, View } from 'react-native';

export default function DevIndex() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>/dev</Text>
      <Text style={styles.line}>· database inspector — coming soon</Text>
      <Text style={styles.line}>· design-system showcase — coming soon</Text>
      <Text style={styles.line}>· locale switcher — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  line: { fontSize: 14 },
});
