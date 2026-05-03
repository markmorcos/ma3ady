import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { getAllServices, setServiceActive } from '@/services/api/services';
import { useTenantStore } from '@/state/tenantStore';
import { type Service } from '@/types/db';

export default function ServicesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const tenant = useTenantStore((s) =>
    s.tenants.find((tt) => tt.id === s.currentTenantId),
  );
  const role = tenant?.role;
  const canEdit = role === 'owner' || role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-services', tenant?.id],
    queryFn: () => getAllServices(tenant?.id ?? ''),
    enabled: !!tenant?.id,
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setServiceActive(id, active),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-services', tenant?.id] });
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.brand[500]} />
      </View>
    );
  }

  if ((data ?? []).length === 0) {
    return (
      <View style={styles.center}>
        <EmptyState icon="scissors" title={t('admin.servicesEmpty')} />
        {canEdit && (
          <Pressable
            onPress={() => router.push('/(admin)/service/new')}
            accessibilityRole="button"
            style={[styles.fabInline, { backgroundColor: theme.colors.brand[500] }]}
          >
            <Icon name="plus" size={18} colorHex={theme.colors.white} />
            <Text variant="bodyStrong" style={{ color: theme.colors.white }}>
              {t('admin.serviceCreate')}
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={data ?? []}
        keyExtractor={(s: Service) => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(admin)/service/[id]',
                params: { id: item.id },
              })
            }
            accessibilityRole="button"
          >
            <Card>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{item.name}</Text>
                  <Text variant="caption" color="muted">
                    {t('booking.minutes', { count: item.duration_minutes })}
                  </Text>
                </View>
                <Switch
                  value={item.active}
                  disabled={!canEdit || toggleActive.isPending}
                  onValueChange={(v) =>
                    toggleActive.mutate({ id: item.id, active: v })
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.brand[500],
                  }}
                />
              </View>
            </Card>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      {canEdit && (
        <Pressable
          onPress={() => router.push('/(admin)/service/new')}
          accessibilityRole="button"
          accessibilityLabel={t('admin.serviceCreate')}
          style={[styles.fab, { backgroundColor: theme.colors.brand[500] }]}
        >
          <Icon name="plus" size={24} colorHex={theme.colors.white} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  separator: { height: 8 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  fab: {
    position: 'absolute',
    end: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
});
