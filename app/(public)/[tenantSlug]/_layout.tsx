import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { TenantHeader } from '@/components/TenantHeader';
import { useTheme } from '@/design/ThemeProvider';
import { getTenantBySlug } from '@/services/api/tenants';

export default function TenantLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { tenantSlug } = useLocalSearchParams<{ tenantSlug: string }>();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', tenantSlug],
    queryFn: () => getTenantBySlug(tenantSlug ?? ''),
    enabled: !!tenantSlug,
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator color={theme.colors.brand[500]} />
      </View>
    );
  }

  if (!tenant) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <EmptyState
          icon="alert-triangle"
          title={t('booking.tenantNotFound')}
          body={t('booking.tenantNotFoundBody')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <TenantHeader tenant={tenant} subtitle={tenant.timezone} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
