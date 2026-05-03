import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/design/colors';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This page doesn&apos;t exist</Text>
        <Text style={styles.body}>The link you followed may be broken or out of date.</Text>
        <Link href="/" style={styles.link} accessibilityRole="link">
          Go home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '600' },
  body: { fontSize: 14, textAlign: 'center', opacity: 0.7 },
  link: { marginTop: 8, fontSize: 16, color: colors.brand500, fontWeight: '600' },
});
