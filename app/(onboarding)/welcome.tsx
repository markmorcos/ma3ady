import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Logo } from '@/branding/Logo';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { TonalBlobs } from '@/components/TonalBlobs';
import { useTheme } from '@/design/ThemeProvider';

export default function OnboardingWelcome() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <TonalBlobs />

      <View style={styles.brand}>
        <Logo height={40} />
      </View>

      <View style={styles.heroBlock}>
        <Text variant="displaySm" style={{ color: theme.colors.onSurface }}>
          {t('onboarding.welcomeHeadline')}
        </Text>
        <Text variant="bodyLg" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('onboarding.welcomeBody')}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label={t('onboarding.welcomeSignIn')}
          variant="filled"
          size="lg"
          fullWidth
          leadingIcon={<Icon name="user" size={20} color="onPrimary" />}
          onPress={() => router.push('/(onboarding)/claim-slug')}
        />
        <Button
          label={t('onboarding.welcomeGuest')}
          variant="text"
          size="lg"
          fullWidth
          onPress={() => router.replace('/')}
        />
        <Text
          variant="bodySm"
          style={[styles.tos, { color: theme.colors.onSurfaceVariant }]}
        >
          {t('onboarding.welcomeTos')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  brand: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
  },
  heroBlock: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 16,
    paddingBottom: 32,
  },
  actions: { gap: 12 },
  tos: { textAlign: 'center', marginTop: 8 },
});
