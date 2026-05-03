import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/design/colors';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t('errors.notFoundTitle') }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t('errors.notFoundTitle')}</Text>
        <Text style={styles.body}>{t('errors.notFoundBody')}</Text>
        <Link href="/" style={styles.link} accessibilityRole="link">
          {t('errors.goHome')}
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
