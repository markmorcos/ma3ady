import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/design/ThemeProvider';
import { resolveColor } from '@/design/theme';
import { type AppointmentStatus } from '@/types/db';

const COLOR_BY_STATUS: Record<AppointmentStatus, 'warning' | 'brand.500' | 'success' | 'muted' | 'danger'> = {
  pending: 'warning',
  confirmed: 'brand.500',
  completed: 'success',
  cancelled: 'muted',
  no_show: 'danger',
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colorToken = COLOR_BY_STATUS[status];
  const tint = resolveColor(theme, colorToken);
  return (
    <View style={[styles.badge, { backgroundColor: tint + '20', borderColor: tint }]}>
      <Text variant="label" style={{ color: tint }}>
        {t(`admin.status.${status}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
