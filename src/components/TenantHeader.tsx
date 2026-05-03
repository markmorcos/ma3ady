import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { Text } from './Text';
import { type TenantPublic } from '@/types/db';

type Props = {
  tenant: TenantPublic;
  subtitle?: string;
};

export function TenantHeader({ tenant, subtitle }: Props) {
  const theme = useTheme();
  const accent = tenant.brand_color ?? theme.colors.brand[500];
  return (
    <View style={[styles.container, { borderColor: theme.colors.border }]}>
      <View style={[styles.bar, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <Text variant="h2">{tenant.name}</Text>
        {subtitle ? (
          <Text variant="caption" color="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  body: { flex: 1, gap: 2 },
});
