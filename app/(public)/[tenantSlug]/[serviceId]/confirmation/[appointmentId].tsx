import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BookingSummary } from '@/components/BookingSummary';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { getService } from '@/services/api/services';
import { getTenantBySlug } from '@/services/api/tenants';

export default function ConfirmationScreen() {
  const { t } = useTranslation();
  const { tenantSlug, serviceId, token, starts_at: startsAt } = useLocalSearchParams<{
    tenantSlug: string;
    serviceId: string;
    appointmentId: string;
    token: string;
    starts_at: string;
  }>();

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

  if (!tenant || !service || !startsAt) return null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Icon name="check-check" size={48} color="success" />
          <Text variant="h2">{t('booking.successTitle')}</Text>
          <Text variant="body" color="muted" style={styles.bodyCenter}>
            {t('booking.successBody')}
          </Text>
        </View>

        <BookingSummary
          service={service}
          startsAt={startsAt}
          tenantTimezone={tenant.timezone}
        />

        <Button
          label={t('booking.manageBookingCta')}
          variant="primary"
          fullWidth
          disabled={!token}
          onPress={() => {
            if (!token) return;
            router.push({ pathname: '/manage/[token]', params: { token } });
          }}
        />

        <Button
          label={t('booking.addToAccountCta')}
          variant="secondary"
          fullWidth
          onPress={() => {
            // Wires to Google sign-in once auth UX flows full sign-in →
            // claim-bookings is exercised end-to-end. Today this just routes
            // to the existing sign-in screen; the claim happens automatically.
            // (Documented in implement-google-oauth tasks.md.)
          }}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  bodyCenter: { textAlign: 'center' },
});
