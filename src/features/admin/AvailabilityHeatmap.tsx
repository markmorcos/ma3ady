import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { Text } from '@/components/Text';
import { type AvailabilityException, type AvailabilityRule } from '@/types/db';

/**
 * 30-row × 7-column M3 weekly heatmap used on the admin Hours screen.
 *
 * Rows are 30-minute steps from 07:00 → 22:00 (30 rows). Columns are days,
 * Mon → Sun (matching the UI order; Postgres day_of_week is 0=Sun..6=Sat).
 *
 * Cell states:
 * - open (within a rule)         → primary fill
 * - closed                       → surfaceContainerHighest
 * - block exception (overlap)    → errorContainer
 * - extra-hours exception        → successContainer
 *
 * Contiguous open cells in a column read as one capsule (first cell takes
 * a top radius, last cell takes a bottom radius). Drag-painting a band is
 * tracked locally and committed via `onCommitBand`.
 */

const START_HOUR = 7; // 07:00
const END_HOUR = 22; // 22:00 (exclusive of the END_HOUR row — last row is 21:30)
const STEP_MIN = 30;
const ROW_COUNT = ((END_HOUR - START_HOUR) * 60) / STEP_MIN;
const GUTTER = 36;

// UI Mon-first index → Postgres DOW (0=Sun..6=Sat)
const UI_TO_DOW = [1, 2, 3, 4, 5, 6, 0];

type CellState = 'open' | 'closed' | 'block' | 'extra';

type Props = {
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  /** Called when a drag-painted band is released. */
  onCommitBand?: (uiDayIndex: number, startMinutes: number, endMinutes: number) => void;
  /** Called for a single-tap toggle. */
  onToggleCell?: (uiDayIndex: number, startMinutes: number) => void;
};

function minutesAtRow(row: number): number {
  return START_HOUR * 60 + row * STEP_MIN;
}

function rowAtMinutes(min: number): number {
  return Math.floor((min - START_HOUR * 60) / STEP_MIN);
}

function timeStrToMinutes(t: string): number {
  // Accepts "HH:mm" or "HH:mm:ss"
  const [h, m] = t.split(':').map((p) => parseInt(p, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

function isoToMinutes(iso: string, dayOfWeek: number): { match: boolean; minutes: number } {
  const d = new Date(iso);
  if (d.getUTCDay() !== dayOfWeek) return { match: false, minutes: 0 };
  return { match: true, minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

export function AvailabilityHeatmap({
  rules,
  exceptions,
  onCommitBand,
  onToggleCell,
}: Props) {
  const theme = useTheme();
  const [paintStart, setPaintStart] = useState<{ ui: number; row: number } | null>(null);
  const [paintEnd, setPaintEnd] = useState<{ ui: number; row: number } | null>(null);

  // Build cell-state matrix: rules per UI day, then overlay exceptions.
  const matrix = useMemo<CellState[][]>(() => {
    const out: CellState[][] = [];
    for (let ui = 0; ui < 7; ui++) {
      const dow = UI_TO_DOW[ui]!;
      const rulesForDay = rules.filter((r) => r.day_of_week === dow);
      const col: CellState[] = [];
      for (let row = 0; row < ROW_COUNT; row++) {
        const min = minutesAtRow(row);
        const inRule = rulesForDay.some(
          (r) => min >= timeStrToMinutes(r.start_time) && min < timeStrToMinutes(r.end_time),
        );
        col.push(inRule ? 'open' : 'closed');
      }

      // Overlay exceptions (best-effort: project onto a UTC day-of-week).
      for (const ex of exceptions) {
        const start = isoToMinutes(ex.starts_at, dow);
        if (!start.match) continue;
        const end = isoToMinutes(ex.ends_at, dow);
        const endMinutes = end.match ? end.minutes : END_HOUR * 60;
        const startRow = Math.max(0, rowAtMinutes(start.minutes));
        const endRow = Math.min(ROW_COUNT, rowAtMinutes(endMinutes));
        for (let r = startRow; r < endRow; r++) {
          col[r] = ex.kind === 'block' ? 'block' : 'extra';
        }
      }

      out.push(col);
    }
    return out;
  }, [rules, exceptions]);

  // Painted-overlay set for the active drag.
  const painted = useMemo(() => {
    if (!paintStart || !paintEnd || paintStart.ui !== paintEnd.ui) return null;
    const lo = Math.min(paintStart.row, paintEnd.row);
    const hi = Math.max(paintStart.row, paintEnd.row);
    return { ui: paintStart.ui, lo, hi };
  }, [paintStart, paintEnd]);

  const colorForState = (s: CellState): { bg: string; stripe?: string } => {
    switch (s) {
      case 'open':
        return { bg: theme.colors.primary };
      case 'closed':
        return { bg: theme.colors.surfaceContainerHighest };
      case 'block':
        return { bg: theme.colors.errorContainer, stripe: theme.colors.error };
      case 'extra':
        return { bg: theme.colors.successContainer, stripe: theme.colors.success };
    }
  };

  const onCellPress = (ui: number, row: number) => {
    onToggleCell?.(ui, minutesAtRow(row));
  };

  const onCellPressIn = (ui: number, row: number) => {
    setPaintStart({ ui, row });
    setPaintEnd({ ui, row });
  };

  const onCellPressOut = () => {
    if (paintStart && paintEnd && paintStart.ui === paintEnd.ui) {
      const lo = Math.min(paintStart.row, paintEnd.row);
      const hi = Math.max(paintStart.row, paintEnd.row);
      if (hi !== lo) {
        onCommitBand?.(paintStart.ui, minutesAtRow(lo), minutesAtRow(hi + 1));
      }
    }
    setPaintStart(null);
    setPaintEnd(null);
  };

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={{ width: GUTTER }} />
        {dayLabels.map((d) => (
          <View key={d} style={styles.dayHeader}>
            <Text variant="labelMd" style={{ color: theme.colors.onSurfaceVariant }}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: ROW_COUNT }).map((_, row) => {
          const hour = Math.floor(minutesAtRow(row) / 60);
          const isHourBoundary = minutesAtRow(row) % 60 === 0;
          return (
            <View key={row} style={styles.gridRow}>
              <View style={[styles.gutter, { width: GUTTER }]}>
                {isHourBoundary ? (
                  <Text variant="labelSm" style={{ color: theme.colors.onSurfaceVariant }}>
                    {String(hour).padStart(2, '0')}
                  </Text>
                ) : null}
              </View>
              {Array.from({ length: 7 }).map((__, ui) => {
                const state = matrix[ui]?.[row] ?? 'closed';
                let isFirstOfBand = false;
                let isLastOfBand = false;
                if (state === 'open' || state === 'block' || state === 'extra') {
                  const prev = matrix[ui]?.[row - 1];
                  const next = matrix[ui]?.[row + 1];
                  isFirstOfBand = prev !== state;
                  isLastOfBand = next !== state;
                }
                const isPainting =
                  painted && painted.ui === ui && row >= painted.lo && row <= painted.hi;
                const { bg } = colorForState(state);
                const renderBg = isPainting ? theme.colors.primaryContainer : bg;
                return (
                  <Pressable
                    key={ui}
                    onPress={() => onCellPress(ui, row)}
                    onPressIn={() => onCellPressIn(ui, row)}
                    onPressOut={onCellPressOut}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: renderBg,
                        borderTopStartRadius: isFirstOfBand ? 6 : 0,
                        borderTopEndRadius: isFirstOfBand ? 6 : 0,
                        borderBottomStartRadius: isLastOfBand ? 6 : 0,
                        borderBottomEndRadius: isLastOfBand ? 6 : 0,
                      },
                    ]}
                  />
                );
              })}
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <LegendSwatch color={theme.colors.primary} label="Open" />
        <LegendSwatch color={theme.colors.surfaceContainerHighest} label="Closed" />
        <LegendSwatch color={theme.colors.errorContainer} label="Block" />
        <LegendSwatch color={theme.colors.successContainer} label="Extra" />
      </View>
    </View>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text variant="labelMd" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', marginBottom: 4 },
  dayHeader: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  grid: { gap: 1 },
  gridRow: { flexDirection: 'row', alignItems: 'stretch', height: 14, gap: 1 },
  gutter: { alignItems: 'center' },
  cell: { flex: 1, height: 14 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 16, height: 16, borderRadius: 4 },
});
