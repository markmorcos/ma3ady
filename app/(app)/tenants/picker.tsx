import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ListItem } from '@/components/ListItem';
import { useTheme } from '@/design/ThemeProvider';
import { homeRouteForRole, useTenantStore } from '@/state/tenantStore';
import { type TenantWithRole } from '@/services/api/tenants';

export default function TenantPicker() {
  const { t } = useTranslation();
  const theme = useTheme();
  const tenants = useTenantStore((s) => s.tenants);
  const selectTenant = useTenantStore((s) => s.selectTenant);
  const currentTenantId = useTenantStore((s) => s.currentTenantId);

  const onPick = async (tenantId: string) => {
    const picked = tenants.find((tt) => tt.id === tenantId);
    await selectTenant(tenantId);
    router.replace(homeRouteForRole(picked?.role));
  };

  return (
    <>
      <Stack.Screen
        options={{ title: t('onboarding.pickerTitle'), presentation: 'modal' }}
      />
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <FlatList
          data={tenants}
          keyExtractor={(tt) => tt.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TenantRow
              tenant={item}
              selected={item.id === currentTenantId}
              onPress={() => onPick(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.gap} />}
        />
        <View style={styles.footer}>
          <Button
            label={t('onboarding.addAnotherTenant')}
            variant="tonal"
            fullWidth
            leadingIcon={<Icon name="plus" size={18} color="onSecondaryContainer" />}
            onPress={() => router.push('/(onboarding)/claim-slug')}
          />
        </View>
      </View>
    </>
  );
}

function TenantRow({
  tenant,
  selected,
  onPress,
}: {
  tenant: TenantWithRole;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Card kind="filled" padded={false}>
      <ListItem
        leading={
          <View
            style={[
              styles.swatch,
              {
                backgroundColor: tenant.brand_color ?? theme.colors.primary,
                borderRadius: theme.shape.md,
              },
            ]}
          >
            <Icon name="sparkles" size={18} colorHex={theme.colors.onPrimary} />
          </View>
        }
        headline={tenant.name}
        supporting={`${t(`onboarding.roleLabel.${tenant.role}`)} · ${tenant.slug}`}
        trailing={
          selected ? (
            <Icon name="check" size={20} color="primary" />
          ) : (
            <Icon name="chevron-right" size={20} color="onSurfaceVariant" />
          )
        }
        onPress={onPress}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 8 },
  gap: { height: 8 },
  swatch: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { padding: 16 },
});
