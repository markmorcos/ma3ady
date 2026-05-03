import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/design/colors';

export default function DevIndex() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>/dev</Text>
      <Link href="/dev/i18n" style={styles.link}>
        · /dev/i18n — locale switcher
      </Link>
      <Link href="/dev/design-system" style={styles.link}>
        · /dev/design-system — component showcase
      </Link>
      <Text style={styles.line}>· database inspector — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  line: { fontSize: 14 },
  link: { fontSize: 14, color: colors.brand500 },
});
