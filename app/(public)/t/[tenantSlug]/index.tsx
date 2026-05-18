import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ServiceCard } from '@/components/ServiceCard';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { getActiveServices } from '@/services/api/services';
import { getTenantBySlug } from '@/services/api/tenants';

export default function ServicesIndex() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { tenantSlug } = useLocalSearchParams<{ tenantSlug: string }>();

  const tenant = useQuery({
    queryKey: ['tenant', tenantSlug],
    queryFn: () => getTenantBySlug(tenantSlug ?? ''),
    enabled: !!tenantSlug,
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', tenantSlug],
    queryFn: () => getActiveServices(tenantSlug ?? ''),
    enabled: !!tenantSlug,
  });

  if (isLoading || tenant.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surface }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!tenant.data) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surface }]}>
        <EmptyState icon="alert-triangle" title={t('booking.tenantNotFound')} body={t('booking.tenantNotFoundBody')} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.surface }}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        // The TenantHeader is rendered by the parent (public)/t/[tenantSlug]
        // /_layout.tsx — don't duplicate it here. Just the section title.
        <View style={styles.titleRow}>
          <Text variant="titleMd" style={{ color: theme.colors.onSurface }}>
            {t('booking.pickServiceTitle')}
          </Text>
        </View>
      }
      data={services}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => (
        <ServiceCard
          service={item}
          onPress={() =>
            router.push({
              pathname: '/(public)/t/[tenantSlug]/[serviceId]/slots',
              params: { tenantSlug, serviceId: item.id },
            })
          }
        />
      )}
      ListEmptyComponent={
        <EmptyState icon="calendar" title={t('booking.servicesEmpty')} />
      }
      ListFooterComponent={
        <Text
          variant="bodySm"
          style={[styles.footer, { color: theme.colors.onSurfaceVariant }]}
        >
          {t('booking.poweredBy')}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 32 },
  titleRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  footer: { textAlign: 'center', paddingVertical: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
