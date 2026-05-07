import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { supabase } from '@/services/api/supabase';
import { useAuthStore } from '@/state/authStore';

export default function DataAndPrivacyScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    if (!session) return;
    try {
      setExporting(true);
      const { data, error } = await supabase.functions.invoke('export-my-data', {
        method: 'POST',
      });
      if (error) throw error;
      const json = JSON.stringify(data, null, 2);
      // Use expo-file-system + expo-sharing on-device. We require them at
      // call time so this screen still loads on environments where the
      // module isn't yet installed (e.g. Expo Go without the dev client).
      const { Paths, File } = await import('expo-file-system');
      const Sharing = await import('expo-sharing');
      const file = new File(Paths.cache, `ma3ady-export-${Date.now()}.json`);
      file.write(json);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
      } else {
        Alert.alert(
          t('dataPrivacy.exportSavedTitle'),
          t('dataPrivacy.exportSavedBody', { path: file.uri }),
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown_error';
      Alert.alert(t('dataPrivacy.exportFailed'), message);
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!session) return;
    Alert.alert(
      t('dataPrivacy.deleteConfirmTitle'),
      t('dataPrivacy.deleteConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('dataPrivacy.deleteConfirmAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const { data, error } = await supabase.functions.invoke<{
                deleted?: boolean;
                error?: string;
                tenants?: { slug: string; name: string }[];
              }>('delete-account', { method: 'POST' });
              if (error) throw error;
              if (data?.error === 'transfer_ownership_first') {
                const names = (data.tenants ?? []).map((x) => x.name).join(', ');
                Alert.alert(
                  t('dataPrivacy.deleteTransferTitle'),
                  t('dataPrivacy.deleteTransferBody', { tenants: names }),
                );
                return;
              }
              await signOut();
              router.replace('/');
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'unknown_error';
              Alert.alert(t('dataPrivacy.deleteFailed'), message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: t('dataPrivacy.title') }} />
      <Text variant="h2">{t('dataPrivacy.title')}</Text>

      <Card>
        <Text variant="bodyStrong">{t('dataPrivacy.collectTitle')}</Text>
        <Text variant="body" color="muted">
          {t('dataPrivacy.collectBody')}
        </Text>
        <View style={{ height: 8 }} />
        <Button
          label={t('dataPrivacy.readPolicy')}
          variant="ghost"
          onPress={() => Linking.openURL('https://ma3ady.com/en/privacy/')}
        />
      </Card>

      <Card>
        <Text variant="bodyStrong">{t('dataPrivacy.exportTitle')}</Text>
        <Text variant="body" color="muted">
          {t('dataPrivacy.exportBody')}
        </Text>
        <View style={{ height: 8 }} />
        <Button
          label={exporting ? t('dataPrivacy.exportingCta') : t('dataPrivacy.exportCta')}
          onPress={handleExport}
          disabled={exporting}
          fullWidth
        />
      </Card>

      <Card>
        <Text variant="bodyStrong">{t('dataPrivacy.deleteTitle')}</Text>
        <Text variant="body" color="muted">
          {t('dataPrivacy.deleteBody')}
        </Text>
        <View style={{ height: 8 }} />
        <Button
          label={deleting ? t('dataPrivacy.deletingCta') : t('dataPrivacy.deleteCta')}
          variant="danger"
          onPress={handleDelete}
          disabled={deleting}
          fullWidth
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
});
