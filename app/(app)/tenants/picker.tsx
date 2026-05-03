import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { useTenantStore } from '@/state/tenantStore';
import { type TenantWithRole } from '@/services/api/tenants';

export default function TenantPicker() {
  const { t } = useTranslation();
  const theme = useTheme();
  const tenants = useTenantStore((s) => s.tenants);
  const selectTenant = useTenantStore((s) => s.selectTenant);
  const currentTenantId = useTenantStore((s) => s.currentTenantId);

  const onPick = async (tenantId: string) => {
    await selectTenant(tenantId);
    router.replace('/');
  };

  return (
    <>
      <Stack.Screen options={{ title: t('onboarding.pickerTitle'), presentation: 'modal' }} />
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <FlatList
          data={tenants}
          keyExtractor={(tt) => tt.id}
          renderItem={({ item }) => (
            <TenantRow
              tenant={item}
              selected={item.id === currentTenantId}
              onPress={() => onPick(item.id)}
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
          )}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(onboarding)/claim-slug')}
          style={[styles.addAnother, { borderColor: theme.colors.border }]}
        >
          <Text variant="bodyStrong" color="brand.500">
            {t('onboarding.addAnotherTenant')}
          </Text>
        </Pressable>
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
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View
        style={[
          styles.swatch,
          { backgroundColor: tenant.brand_color ?? theme.colors.brand[500] },
        ]}
      />
      <View style={styles.rowText}>
        <Text variant="bodyStrong">{tenant.name}</Text>
        <Text variant="caption" color="muted">
          {t(`onboarding.roleLabel.${tenant.role}`)} · {tenant.slug}
        </Text>
      </View>
      {selected && <Text variant="caption" color="brand.500">✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  rowText: { flex: 1, gap: 2 },
  separator: { height: StyleSheet.hairlineWidth },
  addAnother: {
    margin: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
