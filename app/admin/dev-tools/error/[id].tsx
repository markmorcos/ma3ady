import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Time } from '@/components/Time';
import { useTheme } from '@/design/ThemeProvider';
import { getClientError } from '@/services/api/clientErrors';

export default function ErrorDetailScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: err, isLoading } = useQuery({
    queryKey: ['client-error', id],
    queryFn: () => getClientError(id ?? ''),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator color={theme.colors.brand[500]} />
      </View>
    );
  }
  if (!err) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <Text>{t('errorViewer.notFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={{ padding: 16 }}
    >
      <Stack.Screen options={{ title: err.kind }} />
      <View style={{ marginBottom: 16 }}>
        <Text style={[styles.label, { color: theme.colors.muted }]}>
          {t('errorViewer.fields.when')}
        </Text>
        <Time
          value={err.created_at}
          context="admin"
          format="datetime"
          style={[styles.value, { color: theme.colors.text }]}
        />
      </View>
      <Field label={t('errorViewer.fields.kind')} value={err.kind} />
      <Field label={t('errorViewer.fields.platform')} value={err.platform ?? ''} />
      <Field
        label={t('errorViewer.fields.appVersion')}
        value={err.app_version ?? ''}
      />
      <Field label={t('errorViewer.fields.locale')} value={err.locale ?? ''} />
      <Field label={t('errorViewer.fields.message')} value={err.message} multiline />
      {err.stack ? (
        <Field
          label={t('errorViewer.fields.stack')}
          value={err.stack}
          multiline
          mono
        />
      ) : null}
      {Object.keys(err.payload ?? {}).length > 0 ? (
        <Field
          label={t('errorViewer.fields.payload')}
          value={JSON.stringify(err.payload, null, 2)}
          multiline
          mono
        />
      ) : null}
    </ScrollView>
  );
}

function Field({
  label,
  value,
  multiline,
  mono,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  mono?: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.label, { color: theme.colors.muted }]}>{label}</Text>
      <Text
        selectable
        style={[
          styles.value,
          {
            color: theme.colors.text,
            fontFamily: mono ? 'Menlo' : undefined,
          },
          multiline ? styles.multiline : null,
        ]}
      >
        {value || t('common.dash')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 14, marginTop: 4 },
  multiline: { lineHeight: 20 },
});
