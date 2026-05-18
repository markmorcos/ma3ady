import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/design/colors';
import { reloadApp } from '@/services/reloadApp';

async function restart() {
  try {
    await reloadApp();
  } catch {
    // no-op in Expo Go / dev
  }
}

export default function AppError() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('errors.appCrashTitle')}</Text>
      <Text style={styles.body}>{t('errors.appCrashBody')}</Text>
      <Pressable
        onPress={restart}
        accessibilityRole="button"
        accessibilityLabel={t('errors.restart')}
        style={styles.cta}
      >
        <Text style={styles.ctaText}>{t('errors.restart')}</Text>
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
