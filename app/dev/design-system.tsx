import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { Skeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { Logo } from '@/branding/Logo';
import { Mark } from '@/branding/Mark';
import { useTheme, useThemePreference } from '@/design/ThemeProvider';
import { useLocale } from '@/hooks/useLocale';

export default function DevDesignSystem() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();
  const { lang, setLang } = useLocale();

  return (
    <>
      <Stack.Screen options={{ title: '/dev/design-system' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.bg }}
        contentContainerStyle={styles.content}
      >
        {/* toggles */}
        <Card>
          <Text variant="label" color="muted">
            {t('devShowcase.theme')}
          </Text>
          <View style={styles.row}>
            {(
              [
                { key: 'light', label: t('devShowcase.themeLight') },
                { key: 'dark', label: t('devShowcase.themeDark') },
                { key: 'system', label: t('devShowcase.themeSystem') },
              ] as const
            ).map((p) => (
              <Pressable
                key={p.key}
                onPress={() => void setPreference(p.key)}
                accessibilityRole="button"
                style={[
                  styles.chip,
                  {
                    borderColor:
                      preference === p.key ? theme.colors.brand[500] : theme.colors.border,
                    backgroundColor:
                      preference === p.key ? theme.colors.brandTint : 'transparent',
                  },
                ]}
              >
                <Text variant="caption">{p.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text variant="label" color="muted" style={styles.spaced}>
            {t('devShowcase.locale')}
          </Text>
          <View style={styles.row}>
            {(['en', 'ar'] as const).map((l) => (
              <Pressable
                key={l}
                onPress={() => void setLang(l)}
                accessibilityRole="button"
                style={[
                  styles.chip,
                  {
                    borderColor: lang === l ? theme.colors.brand[500] : theme.colors.border,
                    backgroundColor: lang === l ? theme.colors.brandTint : 'transparent',
                  },
                ]}
              >
                <Text variant="caption">{l === 'en' ? t('common.english') : t('common.arabic')}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* branding */}
        <Card>
          <Text variant="h3">{t('devShowcase.branding')}</Text>
          <View style={[styles.row, { marginTop: 8 }]}>
            <Logo height={32} />
            <Mark size={32} color="brand.500" />
          </View>
        </Card>

        {/* typography */}
        <Card>
          <Text variant="h3">{t('devShowcase.typography')}</Text>
          <Text variant="display">{t('devShowcase.typographyDisplay')}</Text>
          <Text variant="h1">{t('devShowcase.typographyH1')}</Text>
          <Text variant="h2">{t('devShowcase.typographyH2')}</Text>
          <Text variant="h3">{t('devShowcase.typographyH3')}</Text>
          <Text variant="body">{t('devShowcase.typographyBody')}</Text>
          <Text variant="caption" color="muted">
            {t('devShowcase.typographyCaption')}
          </Text>
          <Text variant="label" color="muted">
            {t('devShowcase.typographyLabel')}
          </Text>
        </Card>

        {/* buttons */}
        <Card>
          <Text variant="h3">{t('devShowcase.buttons')}</Text>
          <Button label={t('common.confirm')} variant="primary" />
          <Button label={t('common.cancel')} variant="secondary" />
          <Button label={t('common.back')} variant="ghost" />
          <Button label={t('common.delete')} variant="danger" />
          <Button label={t('common.loading')} variant="primary" loading />
          <Button label={t('common.save')} variant="primary" disabled />
        </Card>

        {/* inputs */}
        <Card>
          <Text variant="h3">{t('devShowcase.input')}</Text>
          <Input
            label={t('common.profile')}
            placeholder={t('common.profile')}
            helper={t('common.save')}
          />
        </Card>

        {/* badges */}
        <Card>
          <Text variant="h3">{t('devShowcase.badges')}</Text>
          <View style={styles.row}>
            <Badge status="pending" label={t('appointments.status.pending')} />
            <Badge status="confirmed" label={t('appointments.status.confirmed')} />
            <Badge status="completed" label={t('appointments.status.completed')} />
            <Badge status="cancelled" label={t('appointments.status.cancelled')} />
            <Badge status="no_show" label={t('appointments.status.no_show')} />
          </View>
        </Card>

        {/* icons */}
        <Card>
          <Text variant="h3">{t('devShowcase.icons')}</Text>
          <View style={styles.row}>
            <Icon name="calendar" />
            <Icon name="clock" />
            <Icon name="check" color="success" />
            <Icon name="x" color="danger" />
            <Icon name="alert-triangle" color="warning" />
            <Icon name="settings" color="muted" />
          </View>
        </Card>

        {/* skeletons */}
        <Card>
          <Text variant="h3">{t('devShowcase.skeleton')}</Text>
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={16} style={{ marginTop: 8 }} />
        </Card>

        {/* empty state */}
        <Card>
          <EmptyState
            icon="calendar"
            title={t('appointments.empty.title')}
            body={t('appointments.empty.body')}
          />
        </Card>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  spaced: { marginTop: 12 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
});
