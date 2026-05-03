import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { Text } from './Text';
import { type AvailableSlot } from '@/types/db';

type Props = {
  /** ISO date strings (YYYY-MM-DD) for the days to render. */
  days: string[];
  selected: string;
  /** Map of YYYY-MM-DD → boolean indicating whether any slots exist that day. */
  hasSlotsByDay: Record<string, boolean>;
  onSelect: (day: string) => void;
  locale: string;
};

export function DayStrip({ days, selected, hasSlotsByDay, onSelect, locale }: Props) {
  const theme = useTheme();
  const formatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short' }),
    [locale],
  );
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {days.map((day) => {
        const date = new Date(`${day}T00:00:00`);
        const isSelected = day === selected;
        const hasSlots = !!hasSlotsByDay[day];
        return (
          <Pressable
            key={day}
            accessibilityRole="button"
            onPress={() => onSelect(day)}
            style={[
              styles.day,
              {
                borderColor: isSelected ? theme.colors.brand[500] : theme.colors.border,
                backgroundColor: isSelected ? theme.colors.brandTint : 'transparent',
              },
            ]}
          >
            <Text variant="label" color="muted">
              {formatter.format(date)}
            </Text>
            <Text variant="bodyStrong">{date.getDate()}</Text>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: hasSlots ? theme.colors.success : 'transparent',
                },
              ]}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

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
    minWidth: 56,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
