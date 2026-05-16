import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { Text } from './Text';
import { type AvailableSlot } from '@/types/db';

type Props = {
  /** ISO date strings (YYYY-MM-DD) for the days to render. */
  days: string[];
  selected: string;
  /** Map of YYYY-MM-DD → number of free slots on that day. */
  slotCountByDay: Record<string, number>;
  /** Optional set of YYYY-MM-DD strings considered "closed". Rendered at 0.45 opacity, non-tappable. */
  closedDays?: ReadonlySet<string>;
  onSelect: (day: string) => void;
  locale: string;
};

/**
 * Material Design 3 day strip for the public slot picker.
 *
 * Each cell is a 56×76 pill carrying the day-of-week (Label Sm), the day
 * number (Title Lg), and a "pressure dot" conveying scarcity:
 *
 * - 0 free slots → no dot (cell renders at 0.45 opacity, non-tappable)
 * - 1–3 free slots → 14dp warning pill (warningContainer)
 * - 4+ free slots → 6dp neutral dot (outlineVariant)
 * - selected cell → primary-filled pill with onPrimary dot
 */
export function DayStrip({
  days,
  selected,
  slotCountByDay,
  closedDays,
  onSelect,
  locale,
}: Props) {
  const theme = useTheme();
  const formatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short' }),
    [locale],
  );
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {days.map((day) => {
        const date = new Date(`${day}T00:00:00`);
        const isSelected = day === selected;
        const free = slotCountByDay[day] ?? 0;
        const isClosed = !!closedDays?.has(day) || free === 0;

        const bg = isSelected ? theme.colors.primary : theme.colors.surfaceContainerHigh;
        const fg = isSelected ? theme.colors.onPrimary : theme.colors.onSurface;
        const dayLabelColor = isSelected
          ? theme.colors.onPrimary
          : theme.colors.onSurfaceVariant;

        let pressureNode: React.ReactNode = null;
        if (free > 0) {
          if (isSelected) {
            pressureNode = (
              <View style={[styles.dot, { backgroundColor: theme.colors.onPrimary }]} />
            );
          } else if (free <= 3) {
            pressureNode = (
              <View style={[styles.pill, { backgroundColor: theme.colors.warningContainer }]} />
            );
          } else {
            pressureNode = (
              <View style={[styles.dot, { backgroundColor: theme.colors.outlineVariant }]} />
            );
          }
        }

        return (
          <Pressable
            key={day}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: isClosed && !isSelected }}
            disabled={isClosed && !isSelected}
            onPress={() => onSelect(day)}
            style={[
              styles.day,
              {
                backgroundColor: bg,
                borderRadius: theme.shape.xl,
                opacity: isClosed && !isSelected ? 0.45 : 1,
              },
            ]}
          >
            <Text
              variant="labelSm"
              style={{
                color: dayLabelColor,
                opacity: isSelected ? 1 : 0.85,
                textTransform: 'uppercase',
              }}
            >
              {formatter.format(date)}
            </Text>
            <Text variant="titleLg" style={{ color: fg }}>
              {date.getDate()}
            </Text>
            <View style={styles.indicatorWrap}>{pressureNode}</View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/**
 * Bucket helper used by `SlotGrid` callers: group a flat list of slots by
 * YYYY-MM-DD in the tenant's timezone.
 */
export function groupSlotsByDay(
  slots: AvailableSlot[],
  timezone: string,
): Record<string, AvailableSlot[]> {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const out: Record<string, AvailableSlot[]> = {};
  for (const s of slots) {
    const day = fmt.format(new Date(s.starts_at));
    (out[day] ??= []).push(s);
  }
  return out;
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  day: {
    width: 56,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  indicatorWrap: {
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pill: { width: 14, height: 6, borderRadius: 3 },
});
