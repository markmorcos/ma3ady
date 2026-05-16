import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { Card, type CardKind } from './Card';
import { Icon } from './Icon';
import { Text } from './Text';
import { Time } from './Time';
import { type Service, type TenantPublic } from '@/types/db';

type Props = {
  service: Service;
  startsAt: string;
  tenantTimezone: string;
  /** Optional tenant — when provided, the summary renders an eyebrow row. */
  tenant?: Pick<TenantPublic, 'name'> | null;
  /** Card visual. Defaults to `primary` (the booking-step summary). */
  kind?: CardKind;
};

/**
 * Primary-container summary card used on the booking confirmation step and
 * on the post-success confirmation screen. Title Lg service name, inline
 * chip-style metadata row (date + time + duration).
 */
export function BookingSummary({
  service,
  startsAt,
  tenantTimezone,
  tenant,
  kind = 'primary',
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isAccent = kind === 'primary' || kind === 'tertiary';
  const titleColor = isAccent
    ? kind === 'primary'
      ? theme.colors.onPrimaryContainer
      : theme.colors.onTertiaryContainer
    : theme.colors.onSurface;
  const labelColor = isAccent
    ? titleColor
    : theme.colors.onSurfaceVariant;

  return (
    <Card kind={kind}>
      {tenant ? (
        <Text
          variant="labelMd"
          style={{
            color: labelColor,
            opacity: 0.85,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {tenant.name}
        </Text>
      ) : null}
      <Text variant="headlineSm" style={{ color: titleColor, marginTop: tenant ? 4 : 0 }}>
        {service.name}
      </Text>
      <View style={styles.metaRow}>
        <View style={styles.chip}>
          <Icon name="calendar" size={16} colorHex={labelColor} />
          <Time
            value={startsAt}
            context="public-booking"
            tenantTimezone={tenantTimezone}
            format="short"
            style={{ color: labelColor }}
          />
        </View>
        <View style={styles.chip}>
          <Icon name="clock" size={16} colorHex={labelColor} />
          <Text variant="bodyMd" style={{ color: labelColor }}>
            {t('booking.minutes', { count: service.duration_minutes })}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    opacity: 0.9,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
