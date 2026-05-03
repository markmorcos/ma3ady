import { formatInTimeZone } from 'date-fns-tz';
import { Text, type TextProps } from 'react-native';
import { type DisplayContext, useDisplayTimezone } from '@/hooks/useDisplayTimezone';
import { type TimeFormat } from './Time';

const PATTERNS: Record<TimeFormat, string> = {
  short: 'HH:mm',
  long: 'EEE d MMM, HH:mm',
  datetime: 'yyyy-MM-dd HH:mm',
  iso: "yyyy-MM-dd'T'HH:mm:ssXXX",
};

type Props = TextProps & {
  start: string | Date;
  end: string | Date;
  context: DisplayContext;
  format?: TimeFormat;
  tenantTimezone?: string | null;
  adminOverride?: string | null;
};

export function DateRange({
  start,
  end,
  context,
  format: fmt = 'short',
  tenantTimezone,
  adminOverride,
  ...rest
}: Props) {
  const zone = useDisplayTimezone(context, { tenantTimezone, adminOverride });
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  const pattern = PATTERNS[fmt];
  return (
    <Text {...rest}>
      {formatInTimeZone(startDate, zone, pattern)} –{' '}
      {formatInTimeZone(endDate, zone, pattern)}
    </Text>
  );
}
