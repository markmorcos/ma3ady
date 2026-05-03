import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Text } from '@/components/Text';
import { brandSwatches } from '@/design/colors';
import { useTheme } from '@/design/ThemeProvider';
import { getDeviceTimezone } from '@/hooks/useDisplayTimezone';
import {
  checkSlugAvailability,
  SlugReservedError,
  SlugTakenError,
} from '@/services/api/onboarding';
import { useTenantStore } from '@/state/tenantStore';
import { type SlugAvailability } from '@/types/db';

const DEBOUNCE_MS = 400;

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
    // Stay quiet while still typing or before the input is plausibly complete.
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
      });
      router.replace('/(onboarding)/joined');
    } catch (err) {
      if (err instanceof SlugTakenError) {
        setSubmitError(t('onboarding.slugTaken'));
      } else if (err instanceof SlugReservedError) {
        setSubmitError(t('onboarding.slugReserved'));
      } else {
        setSubmitError(t('errors.generic'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('onboarding.claimSlugTitle') }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.bg }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="h2">{t('onboarding.claimSlugHeader')}</Text>

        <Input
          label={t('onboarding.slugLabel')}
          value={slug}
          onChangeText={setSlug}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="acme-clinic"
          helper={
            checking
              ? t('common.loading')
              : availability?.available === true
                ? t('onboarding.slugAvailable')
                : t('onboarding.slugHint')
          }
          error={slugError ?? undefined}
        />

        <Input
          label={t('onboarding.nameLabel')}
          value={name}
          onChangeText={setName}
          placeholder="Acme Clinic"
        />

        <View>
          <Text variant="label" color="muted">
            {t('onboarding.localeLabel')}
          </Text>
          <View style={styles.row}>
            {(['en', 'ar'] as const).map((l) => (
              <Pressable
                key={l}
                accessibilityRole="button"
                onPress={() => setLocale(l)}
                style={[
                  styles.chip,
                  {
                    borderColor:
                      locale === l ? theme.colors.brand[500] : theme.colors.border,
                    backgroundColor:
                      locale === l ? theme.colors.brandTint : 'transparent',
                  },
                ]}
              >
                <Text variant="caption">
                  {l === 'en' ? t('common.english') : t('common.arabic')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <Text variant="label" color="muted">
            {t('onboarding.timezoneLabel')}
          </Text>
          <Text variant="body">{timezone}</Text>
          <Text variant="caption" color="muted">
            {t('onboarding.timezoneHint')}
          </Text>
        </View>

        <View>
          <Text variant="label" color="muted">
            {t('onboarding.brandColorLabel')}
          </Text>
          <View style={styles.row}>
            {brandSwatches.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                onPress={() => setBrandColor(brandColor === c ? null : c)}
                style={[
                  styles.swatch,
                  {
                    backgroundColor: c,
                    borderColor:
                      brandColor === c ? theme.colors.text : 'transparent',
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {submitError && (
          <Text variant="caption" style={{ color: theme.colors.danger }}>
            {submitError}
          </Text>
        )}

        <Button
          label={t('onboarding.claimCta')}
          variant="primary"
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
  content: { padding: 16, gap: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
});
