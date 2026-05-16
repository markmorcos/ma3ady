import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { type AppointmentStatus, statusColorMap } from '@/design/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  status: AppointmentStatus;
  label: string;
};

const STATUS_ICON: Record<AppointmentStatus, IconName> = {
  pending: 'clock',
  confirmed: 'check',
  completed: 'check-check',
  cancelled: 'x',
  no_show: 'alert-triangle',
};

export function Badge({ status, label }: Props) {
  const theme = useTheme();
  const { bg, fg } = statusColorMap[status];
  const bgColor = theme.colors[bg] as string;
  const fgColor = theme.colors[fg] as string;
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bgColor, borderRadius: theme.radii.pill },
      ]}
    >
      <Icon name={STATUS_ICON[status]} size={12} colorHex={fgColor} />
      <Text variant="label" style={{ color: fgColor }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
});
