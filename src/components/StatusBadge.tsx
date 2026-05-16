import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { statusColorMap } from '@/design/theme';
import { type AppointmentStatus } from '@/types/db';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const STATUS_ICON: Record<AppointmentStatus, IconName> = {
  pending: 'clock',
  confirmed: 'check-check',
  completed: 'check',
  cancelled: 'x-circle',
  no_show: 'circle-alert',
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { bg, fg } = statusColorMap[status];
  const bgColor = theme.colors[bg] as string;
  const fgColor = theme.colors[fg] as string;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bgColor, borderRadius: theme.shape.full },
      ]}
    >
      <Icon name={STATUS_ICON[status]} size={14} colorHex={fgColor} />
      <Text variant="labelMd" style={{ color: fgColor }}>
        {t(`admin.status.${status}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
});
