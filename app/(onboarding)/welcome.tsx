import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Logo } from '@/branding/Logo';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';

export default function OnboardingWelcome() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.brand}>
        <Logo height={40} />
        <Text variant="caption" color="muted">
          {t('common.tagline')}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label={t('onboarding.signUpBusiness')}
          variant="primary"
          fullWidth
          onPress={() => router.push('/(onboarding)/claim-slug')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', padding: 24 },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  actions: { gap: 12, paddingBottom: 32 },
});
