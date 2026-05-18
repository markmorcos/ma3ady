import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FAB } from '@/components/FAB';
import { Icon } from '@/components/Icon';
import { Switch } from '@/components/Switch';
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
      <View style={[styles.center, { backgroundColor: theme.colors.surface }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const services = data ?? [];

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.surface }]}>
      <FlatList
        data={services}
        keyExtractor={(s: Service) => s.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <EmptyState icon="scissors" title={t('admin.servicesEmpty')} />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/admin/service/[id]',
                params: { id: item.id },
              })
            }
            accessibilityRole="button"
          >
            <Card kind="outlined">
              <View style={styles.row}>
                <View
                  style={[
                    styles.iconTile,
                    {
                      backgroundColor: theme.colors.secondaryContainer,
                      borderRadius: theme.shape.lg,
                    },
                  ]}
                >
                  <Icon name="scissors" size={22} color="onSecondaryContainer" />
                </View>
                <View style={styles.body}>
                  <Text variant="titleMd" style={{ color: theme.colors.onSurface }}>
                    {item.name}
                  </Text>
                  <Text variant="bodyMd" style={{ color: theme.colors.onSurfaceVariant }}>
                    {t('booking.minutes', { count: item.duration_minutes })}
                  </Text>
                </View>
                <Switch
                  value={item.active}
                  disabled={!canEdit || toggleActive.isPending}
                  onValueChange={(v) => toggleActive.mutate({ id: item.id, active: v })}
                />
              </View>
            </Card>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      {canEdit && (
        <View style={styles.fabWrap}>
          <FAB
            extended
            icon={<Icon name="plus" size={20} color="onPrimaryContainer" />}
            label={t('admin.newService')}
            accessibilityLabel={t('admin.newService')}
            onPress={() => router.push('/admin/service/new')}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16, paddingBottom: 96 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconTile: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  separator: { height: 8 },
  empty: { padding: 32, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  fabWrap: {
    position: 'absolute',
    end: 24,
    bottom: 24,
  },
});
