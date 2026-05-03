import { formatInTimeZone } from 'date-fns-tz';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
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
        <Text variant="body" color="muted">
          {t('booking.noSlotsThisDay')}
        </Text>
      </View>
    );
  }

  const renderBucket = (key: Bucket) => {
    const bSlots = buckets[key];
    if (bSlots.length === 0) return null;
    return (
      <View key={key} style={styles.bucket}>
        <Text variant="label" color="muted">
          {t(`booking.bucket.${key}`)}
        </Text>
        <View style={styles.grid}>
          {bSlots.map((s) => (
            <Pressable
              key={s.starts_at}
              accessibilityRole="button"
              onPress={() => onPick(s)}
              style={[
                styles.slot,
                { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
              ]}
            >
              <Time
                value={s.starts_at}
                context="public-booking"
                tenantTimezone={timezone}
                format="short"
              />
            </Pressable>
          ))}
        </View>
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
  container: { padding: 16, gap: 16 },
  bucket: { gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  empty: { padding: 24, alignItems: 'center' },
});
