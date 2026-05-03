import { formatInTimeZone } from 'date-fns-tz';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import {
  type DisplayContext,
  getDeviceTimezone,
  useDisplayTimezone,
} from '@/hooks/useDisplayTimezone';

export type TimeFormat = 'short' | 'long' | 'datetime' | 'iso';

const PATTERNS: Record<TimeFormat, string> = {
  short: 'HH:mm',
  long: 'EEE d MMM, HH:mm',
  datetime: 'yyyy-MM-dd HH:mm',
  iso: "yyyy-MM-dd'T'HH:mm:ssXXX",
};

type Props = TextProps & {
  value: string | Date;
  context: DisplayContext;
  format?: TimeFormat;
  /** When true, also renders the device-local time in muted parentheses. */
  secondary?: boolean;
  tenantTimezone?: string | null;
  adminOverride?: string | null;
};

export function Time({
  value,
  context,
  format: fmt = 'short',
  secondary,
  tenantTimezone,
  adminOverride,
  style,
  ...rest
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const zone = useDisplayTimezone(context, { tenantTimezone, adminOverride });
  const date = typeof value === 'string' ? new Date(value) : value;
  const pattern = PATTERNS[fmt];
  const primary = formatInTimeZone(date, zone, pattern);
  const colorStyle = { color: theme.colors.text };

  if (!secondary) {
    return (
      <Text style={[colorStyle, style]} {...rest}>
        {primary}
      </Text>
    );
  }

  const deviceZone = getDeviceTimezone();
  if (deviceZone === zone) {
    return (
      <Text style={[colorStyle, style]} {...rest}>
        {primary}
      </Text>
    );
  }

  const local = formatInTimeZone(date, deviceZone, pattern);
  return (
    <Text style={[colorStyle, style]} {...rest}>
      {primary}
      <Text style={styles.muted}>
        {' ('}
        {t('common.yourTime')}
        {': '}
        {local}
        {')'}
      </Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  muted: { opacity: 0.6 },
});
