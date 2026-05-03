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
        <View style={styles.devLinks}>
          <Link href="/dev" style={styles.devLink} accessibilityRole="link">
            /dev
          </Link>
          <Link href="/sign-in" style={styles.devLink} accessibilityRole="link">
            /sign-in
          </Link>
          <Link href="/dev/sign-in" style={styles.devLink} accessibilityRole="link">
            /dev/sign-in (test users)
          </Link>
          <Link href="/welcome" style={styles.devLink} accessibilityRole="link">
            /welcome (onboarding)
          </Link>
          <Link href="/tenants/picker" style={styles.devLink} accessibilityRole="link">
            /tenants/picker
          </Link>
          <Link href="/audit-log" style={styles.devLink} accessibilityRole="link">
            /audit-log
          </Link>
          <Link href="/settings/timezone" style={styles.devLink} accessibilityRole="link">
            /settings/timezone
          </Link>
          <Link
            href="/(public)/demo"
            style={styles.devLink}
            accessibilityRole="link"
          >
            /demo (public booking)
          </Link>
          <Link
            href="/manage/invalid-token"
            style={styles.devLink}
            accessibilityRole="link"
          >
            /manage/invalid-token (manage screen)
          </Link>
        </View>
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
  devLinks: {
    marginTop: 32,
    alignItems: 'center',
    gap: 8,
  },
  devLink: {
    fontSize: 12,
    color: colors.brand500,
    opacity: 0.6,
  },
});
