import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ServiceCard } from '@/components/ServiceCard';
import { useTheme } from '@/design/ThemeProvider';
import { getActiveServices } from '@/services/api/services';

export default function ServicesIndex() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { tenantSlug } = useLocalSearchParams<{ tenantSlug: string }>();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', tenantSlug],
    queryFn: () => getActiveServices(tenantSlug ?? ''),
    enabled: !!tenantSlug,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.brand[500]} />
      </View>
    );
  }

  if (services.length === 0) {
    return <EmptyState icon="calendar" title={t('booking.servicesEmpty')} />;
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={services}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => (
        <ServiceCard
          service={item}
          onPress={() =>
            router.push({
              pathname: '/(public)/[tenantSlug]/[serviceId]/slots',
              params: { tenantSlug, serviceId: item.id },
            })
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
