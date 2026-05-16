import { formatInTimeZone } from 'date-fns-tz';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { Time } from './Time';
import { type AvailableSlot } from '@/types/db';

type Props = {
  slots: AvailableSlot[];
  timezone: string;
  onPick: (slot: AvailableSlot) => void;
};

type Bucket = 'morning' | 'afternoon' | 'evening';

function bucketOf(slot: AvailableSlot, timezone: string): Bucket {
  const hour = parseInt(formatInTimeZone(new Date(slot.starts_at), timezone, 'H'), 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const BUCKET_ICON: Record<Bucket, IconName> = {
  morning: 'sunrise',
  afternoon: 'sun',
  evening: 'moon',
};

/**
 * Material Design 3 slot grid.
 *
 * Three time-of-day sections (morning < 12, afternoon < 17, evening). Each
 * section header carries a tinted icon tile, the section name, and a
 * `free/total` counter. Free slots render as pill chips in the section's
 * container tint; taken slots are not currently returned by
 * compute_available_slots and therefore not rendered.
 */
export function SlotGrid({ slots, timezone, onPick }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  const buckets = useMemo(() => {
    const grouped: Record<Bucket, AvailableSlot[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };
    for (const s of slots) grouped[bucketOf(s, timezone)].push(s);
    return grouped;
  }, [slots, timezone]);

  if (slots.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="bodyMd" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('booking.noSlotsThisDay')}
        </Text>
      </View>
    );
  }

  type BucketStyling = {
    iconBg: string;
    iconFg: string;
    pillBg: string;
    pillFg: string;
  };

  const bucketStyling = (b: Bucket): BucketStyling => {
    switch (b) {
      case 'morning':
        return {
          iconBg: theme.colors.tertiaryContainer,
          iconFg: theme.colors.onTertiaryContainer,
          pillBg: theme.colors.tertiaryContainer,
          pillFg: theme.colors.onTertiaryContainer,
        };
      case 'afternoon':
        return {
          iconBg: theme.colors.primaryContainer,
          iconFg: theme.colors.onPrimaryContainer,
          pillBg: theme.colors.primaryContainer,
          pillFg: theme.colors.onPrimaryContainer,
        };
      case 'evening':
        return {
          iconBg: theme.colors.secondaryContainer,
          iconFg: theme.colors.onSecondaryContainer,
          pillBg: theme.colors.secondaryContainer,
          pillFg: theme.colors.onSecondaryContainer,
        };
    }
  };

  const renderBucket = (key: Bucket) => {
    const bSlots = buckets[key];
    const total = bSlots.length;
    const free = bSlots.length;
    const s = bucketStyling(key);

    return (
      <View key={key} style={styles.bucket}>
        <View style={styles.header}>
          <View style={[styles.iconTile, { backgroundColor: s.iconBg }]}>
            <Icon name={BUCKET_ICON[key]} size={16} colorHex={s.iconFg} />
          </View>
          <Text variant="titleMd" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            {t(`booking.bucket.${key}`)}
          </Text>
          <Text variant="labelMd" style={{ color: theme.colors.onSurfaceVariant }}>
            {total === 0 ? t('booking.bucketFull') : `${free} / ${total}`}
          </Text>
        </View>
        {bSlots.length === 0 ? null : (
          <View style={styles.grid}>
            {bSlots.map((slot) => (
              <Pressable
                key={slot.starts_at}
                accessibilityRole="button"
                onPress={() => onPick(slot)}
                style={[
                  styles.slot,
                  {
                    backgroundColor: s.pillBg,
                    borderRadius: theme.shape.md,
                  },
                ]}
              >
                <Time
                  value={slot.starts_at}
                  context="public-booking"
                  tenantTimezone={timezone}
                  format="short"
                  style={{ color: s.pillFg, fontWeight: '500', fontSize: 15 }}
                />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderBucket('morning')}
      {renderBucket('afternoon')}
      {renderBucket('evening')}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 20 },
  bucket: { gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconTile: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    minWidth: 84,
    height: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { padding: 24, alignItems: 'center' },
});
