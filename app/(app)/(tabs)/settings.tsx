import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { useAuthStore } from '@/state/authStore';

export default function CustomerSettingsScreen() {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="h2">{t('app.tabs.settings')}</Text>

      <Card>
        <Text variant="label" color="muted">
          {t('app.signedInAs')}
        </Text>
        <Text variant="bodyStrong">{profile?.full_name ?? '—'}</Text>
        <Text variant="caption" color="muted">
          {session?.user.email ?? ''}
        </Text>
      </Card>

      <Card>
        <Pressable
          onPress={() => router.push('/dev/i18n')}
          accessibilityRole="button"
          style={styles.linkRow}
        >
          <Text variant="body">{t('app.settingsLanguage')}</Text>
          <Icon name="chevron-right" size={18} color="muted" />
        </Pressable>
      </Card>

      <Button
        label={t('admin.signOut')}
        variant="ghost"
        fullWidth
        onPress={async () => {
          await signOut();
          router.replace('/');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
});
