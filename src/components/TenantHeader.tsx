import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { type TenantPublic, type TenantType } from '@/types/db';

type Props = {
  tenant: TenantPublic;
  /** Optional override; defaults to `tenant.location`. */
  subtitle?: string;
};

const TYPE_ICON: Record<TenantType, IconName> = {
  generic: 'sparkles',
  salon: 'scissors',
  clinic: 'stethoscope',
  auto: 'car',
};

const TYPE_LABEL: Record<TenantType, string> = {
  generic: 'Business',
  salon: 'Salon',
  clinic: 'Clinic',
  auto: 'Auto',
};

/**
 * M3 tenant header used on the public tenant home. 56dp brand-tinted icon
 * tile + business name (Title Lg) + subtitle (`type · location`, Body Md).
 */
export function TenantHeader({ tenant, subtitle }: Props) {
  const theme = useTheme();
  const typeLabel = TYPE_LABEL[tenant.type];
  const tail = subtitle ?? tenant.location ?? null;
  const computed = tail ? `${typeLabel} · ${tail}` : typeLabel;
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: theme.colors.primaryContainer,
            borderRadius: theme.shape.lg,
          },
        ]}
      >
        <Icon name={TYPE_ICON[tenant.type]} size={24} color="onPrimaryContainer" />
      </View>
      <View style={styles.body}>
        <Text variant="titleLg" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
          {tenant.name}
        </Text>
        <Text variant="bodyMd" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
          {computed}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
});
