import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BookingSummary } from '@/components/BookingSummary';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { bookAppointment, SlotTakenError, SlotUnavailableError } from '@/services/api/booking';
import { getService } from '@/services/api/services';
import { getTenantBySlug } from '@/services/api/tenants';
import { useToastStore } from '@/state/toastStore';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BookScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { tenantSlug, serviceId, starts_at: startsAt } = useLocalSearchParams<{
    tenantSlug: string;
    serviceId: string;
    starts_at: string;
  }>();
  const showToast = useToastStore((s) => s.show);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [tos, setTos] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: tenant } = useQuery({
    queryKey: ['tenant', tenantSlug],
    queryFn: () => getTenantBySlug(tenantSlug ?? ''),
    enabled: !!tenantSlug,
  });
  const { data: service } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => getService(serviceId ?? ''),
    enabled: !!serviceId,
  });

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = !!name.trim() && emailValid && tos && !submitting;

  const onSubmit = async () => {
    if (!canSubmit || !tenantSlug || !serviceId || !startsAt) return;
    setSubmitting(true);
    try {
      const result = await bookAppointment({
        tenantSlug,
        serviceId,
        startsAt,
        guestName: name.trim(),
        guestEmail: email.trim(),
        guestPhone: phone.trim() || null,
      });
      router.replace({
        pathname:
          '/(public)/[tenantSlug]/[serviceId]/confirmation/[appointmentId]',
        params: {
          tenantSlug,
          serviceId,
          appointmentId: result.appointment_id,
          token: result.manage_token,
          starts_at: startsAt,
        },
      });
    } catch (err) {
      if (err instanceof SlotTakenError || err instanceof SlotUnavailableError) {
        showToast({ kind: 'warning', message: t('booking.slotTakenToast') });
        router.back();
      } else {
        const msg = err instanceof Error ? err.message : 'unknown';
        showToast({ kind: 'danger', message: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!tenant || !service || !startsAt) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text variant="h2">{t('booking.confirmTitle')}</Text>
      <BookingSummary service={service} startsAt={startsAt} tenantTimezone={tenant.timezone} />

      <Input label={t('booking.name')} value={name} onChangeText={setName} autoCapitalize="words" />
      <Input
        label={t('booking.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={email && !emailValid ? t('booking.invalidEmail') : undefined}
      />
      <Input
        label={t('booking.phone')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <Input
        label={t('booking.notes')}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        maxLength={500}
      />

      <Pressable
        onPress={() => setTos((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: tos }}
        style={styles.tos}
      >
        <View
          style={[
            styles.box,
            {
              borderColor: theme.colors.border,
              backgroundColor: tos ? theme.colors.brand[500] : 'transparent',
            },
          ]}
        >
          {tos && (
            <Text variant="bodyStrong" style={{ color: theme.colors.white }}>
              ✓
            </Text>
          )}
        </View>
        <Text variant="caption" style={styles.tosLabel}>
          {t('booking.tos')}
        </Text>
      </Pressable>

      <Button
        label={t('booking.submit')}
        variant="primary"
        fullWidth
        loading={submitting}
        disabled={!canSubmit}
        onPress={onSubmit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  tos: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  box: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tosLabel: { flex: 1 },
});
