import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { Text } from '@/components/Text';
import { BrandColorPicker } from '@/design/BrandColorPicker';
import { useTheme } from '@/design/ThemeProvider';
import { getDeviceTimezone } from '@/hooks/useDisplayTimezone';
import {
  checkSlugAvailability,
  SlugReservedError,
  SlugTakenError,
} from '@/services/api/onboarding';
import { useTenantStore } from '@/state/tenantStore';
import { type SlugAvailability, type TenantType } from '@/types/db';

const DEBOUNCE_MS = 400;
const TENANT_TYPES: readonly TenantType[] = ['generic', 'salon', 'clinic', 'auto'];

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function ClaimSlugScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const createTenant = useTenantStore((s) => s.createTenant);

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [locale, setLocale] = useState<'en' | 'ar'>('en');
  const [tenantType, setTenantType] = useState<TenantType>('generic');
  const [location, setLocation] = useState('');
  const [brandColor, setBrandColor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<SlugAvailability | null>(null);
  const [checking, setChecking] = useState(false);

  const timezone = useMemo(getDeviceTimezone, []);

  const debouncedSlug = useDebounced(slug.trim().toLowerCase(), DEBOUNCE_MS);

  // Don't surface "invalid" while the user is still typing. Only check the
  // server once the input is plausibly complete (3+ chars, not ending in a
  // dash). The server still validates again — this is purely UX gating.
  const isPlausibleSlug = (s: string): boolean =>
    s.length >= 3 && s.length <= 32 && !s.endsWith('-') && !s.startsWith('-');

  useEffect(() => {
    if (!debouncedSlug || !isPlausibleSlug(debouncedSlug)) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    checkSlugAvailability(debouncedSlug)
      .then((res) => {
        if (!cancelled) setAvailability(res);
      })
      .catch(() => {
        if (!cancelled) setAvailability({ available: false, reason: 'invalid' });
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSlug]);

  const slugError = (() => {
    if (!debouncedSlug) return null;
    if (!isPlausibleSlug(debouncedSlug)) return null;
    if (checking) return null;
    if (availability?.available) return null;
    switch (availability?.reason) {
      case 'taken':
        return t('onboarding.slugTaken');
      case 'reserved':
        return t('onboarding.slugReserved');
      case 'invalid':
        return t('onboarding.slugInvalid');
      default:
        return null;
    }
  })();

  const canSubmit =
    !!debouncedSlug &&
    !!name.trim() &&
    !!locale &&
    !!timezone &&
    availability?.available === true &&
    !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createTenant({
        slug: debouncedSlug,
        name: name.trim(),
        timezone,
        default_locale: locale,
        brand_color: brandColor,
        type: tenantType,
        location: location.trim() || null,
      });
      router.replace('/(onboarding)/joined');
    } catch (err) {
      if (err instanceof SlugTakenError) {
        setSubmitError(t('onboarding.slugTaken'));
      } else if (err instanceof SlugReservedError) {
        setSubmitError(t('onboarding.slugReserved'));
      } else {
        setSubmitError(
          __DEV__ && err instanceof Error ? err.message : t('errors.generic'),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('onboarding.claimSlugTitle') }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.surface }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerBlock}>
          <Text variant="headlineSm" style={{ color: theme.colors.onSurface }}>
            {t('onboarding.claimSlugHeader')}
          </Text>
          <Text variant="bodyMd" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('onboarding.claimSlugBody')}
          </Text>
        </View>

        <Input
          label={t('onboarding.slugLabel')}
          value={slug}
          onChangeText={setSlug}
          autoCapitalize="none"
          autoCorrect={false}
          prefix={t('onboarding.slugPrefix')}
          placeholder="cleos-cut"
          helper={
            checking
              ? t('common.loading')
              : availability?.available === true
                ? t('onboarding.slugAvailable')
                : t('onboarding.slugHint')
          }
          error={slugError ?? undefined}
          trailingIcon={
            availability?.available === true ? (
              <Icon name="check" size={18} color="success" />
            ) : null
          }
        />

        <Input
          label={t('onboarding.nameLabel')}
          value={name}
          onChangeText={setName}
          placeholder="Cleo’s Cut"
        />

        <View style={styles.fieldBlock}>
          <Text variant="labelLg" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('onboarding.typeLabel')}
          </Text>
          <View style={styles.chipRow}>
            {TENANT_TYPES.map((tt) => (
              <Chip
                key={tt}
                kind="filter"
                label={t(`onboarding.type.${tt}`)}
                selected={tenantType === tt}
                onPress={() => setTenantType(tt)}
              />
            ))}
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Text variant="labelLg" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('onboarding.localeLabel')}
          </Text>
          <View style={styles.chipRow}>
            {(['en', 'ar'] as const).map((l) => (
              <Chip
                key={l}
                kind="filter"
                label={l === 'en' ? t('common.english') : t('common.arabic')}
                selected={locale === l}
                onPress={() => setLocale(l)}
              />
            ))}
          </View>
        </View>

        <Input
          label={t('onboarding.locationLabel')}
          value={location}
          onChangeText={setLocation}
          placeholder={t('onboarding.locationPlaceholder')}
          maxLength={120}
        />

        <View style={styles.fieldBlock}>
          <Text variant="labelLg" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('onboarding.timezoneLabel')}
          </Text>
          <Text variant="bodyLg" style={{ color: theme.colors.onSurface }}>
            {timezone}
          </Text>
          <Text variant="bodySm" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('onboarding.timezoneHint')}
          </Text>
        </View>

        <View style={styles.fieldBlock}>
          <Text variant="labelLg" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('onboarding.brandColorLabel')}
          </Text>
          <BrandColorPicker value={brandColor} onChange={setBrandColor} />
        </View>

        {submitError && (
          <Text variant="bodySm" style={{ color: theme.colors.error }}>
            {submitError}
          </Text>
        )}

        <Button
          label={t('onboarding.claimCta')}
          variant="filled"
          size="lg"
          fullWidth
          loading={submitting}
          disabled={!canSubmit}
          onPress={onSubmit}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 20, paddingBottom: 48 },
  headerBlock: { gap: 8, paddingTop: 8 },
  fieldBlock: { gap: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
