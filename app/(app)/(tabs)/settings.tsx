import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ListItem } from '@/components/ListItem';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { useAuthStore } from '@/state/authStore';

export default function CustomerSettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={{ backgroundColor: theme.colors.surface }}
    >
      <Text variant="headlineSm" style={{ color: theme.colors.onSurface }}>
        {t('app.tabs.settings')}
      </Text>

      <Card kind="filled">
        <View style={styles.profileRow}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: theme.colors.tertiaryContainer,
                borderRadius: theme.shape.lg,
              },
            ]}
          >
            <Icon name="user" size={28} color="onTertiaryContainer" />
          </View>
          <View style={styles.profileText}>
            <Text variant="titleLg" style={{ color: theme.colors.onSurface }}>
              {profile?.full_name ?? '—'}
            </Text>
            <Text variant="bodyMd" style={{ color: theme.colors.onSurfaceVariant }}>
              {session?.user.email ?? ''}
            </Text>
          </View>
        </View>
      </Card>

      <Section title={t('app.settingsSectionAppearance')}>
        <Card kind="filled" padded={false}>
          <ListItem
            leading={<Icon name="globe" size={20} color="onSurfaceVariant" />}
            headline={t('app.settingsLanguage')}
            trailing={<Icon name="chevron-right" size={20} color="onSurfaceVariant" />}
            onPress={() => router.push('/dev/i18n')}
          />
        </Card>
      </Section>

      <Section title={t('app.settingsSectionAccount')}>
        <Card kind="filled" padded={false}>
          <ListItem
            leading={<Icon name="users" size={20} color="onSurfaceVariant" />}
            headline={t('app.settingsDataPrivacy')}
            trailing={<Icon name="chevron-right" size={20} color="onSurfaceVariant" />}
            onPress={() => router.push('/(app)/data-and-privacy' as never)}
          />
        </Card>
      </Section>

      <Button
        label={t('admin.signOut')}
        variant="text"
        fullWidth
        onPress={async () => {
          await signOut();
          router.replace('/');
        }}
      />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text
        variant="labelLg"
        style={{
          color: theme.colors.primary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  section: { gap: 8 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1, gap: 2 },
});
