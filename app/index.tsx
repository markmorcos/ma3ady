import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/design/colors';

const SHOW_DEV_TOOLS = process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === '1';

export default function Home() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ma3ady</Text>
      <Text style={styles.subtitle}>{t('common.tagline')}</Text>
      {SHOW_DEV_TOOLS && (
        <Link href="/dev" style={styles.devLink} accessibilityRole="link">
          /dev
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  devLink: {
    marginTop: 32,
    fontSize: 12,
    color: colors.brand500,
    opacity: 0.6,
  },
});
