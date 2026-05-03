import * as Updates from 'expo-updates';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/design/colors';

async function restart() {
  try {
    await Updates.reloadAsync();
  } catch {
    // no-op in Expo Go / dev
  }
}

export default function AppError() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ma3ady ran into a problem</Text>
      <Text style={styles.body}>The app couldn&apos;t finish starting up. Restart and try again.</Text>
      <Pressable
        onPress={restart}
        accessibilityRole="button"
        accessibilityLabel="Restart"
        style={styles.cta}
      >
        <Text style={styles.ctaText}>Restart</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '600' },
  body: { fontSize: 14, textAlign: 'center', opacity: 0.7 },
  cta: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.brand500,
  },
  ctaText: { color: colors.white, fontWeight: '600' },
});
