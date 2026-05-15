import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';

export default function JoinedScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: t('onboarding.joinedTitle') }} />
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.hero}>
          <Icon name="check" size={48} color="success" />
          <Text variant="h2">{t('onboarding.joinedHeader')}</Text>
          <Text variant="body" color="muted" style={styles.body}>
            {t('onboarding.joinedBody')}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            label={t('onboarding.setUpServices')}
            variant="primary"
            fullWidth
            onPress={() => router.replace('/')}
          />
          <Button
            label={t('onboarding.setAvailability')}
            variant="secondary"
            fullWidth
            onPress={() => router.replace('/')}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', padding: 24 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  body: { textAlign: 'center' },
  actions: { gap: 12, paddingBottom: 32 },
});
