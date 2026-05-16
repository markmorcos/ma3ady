import { useMemo } from 'react';
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
 * Interaction
 * -----------
 * No drag-and-drop. Three previous attempts at gesture-based painting
 * (PR #5, #7) all regressed something — scrolling, drag, or tap — because
 * RN's responder system doesn't reliably negotiate between a PanResponder
 * inside a ScrollView. Tap is the only direct interaction:
 *
 *  - **Tap a cell** → `onCellPress(uiDayIndex, startMinutes)`. The screen
 *    decides whether that means add a 30-min slot or remove one based on
 *    the cell's current state.
 *  - **Long-press a cell** → `onColumnLongPress(uiDayIndex)`. The screen
 *    opens the per-day band editor sheet for that column so a multi-hour
 *    shift is 3 taps (open → set times → save) rather than 16 taps on
 *    individual cells.
 *
 * Pressable cooperates with the parent ScrollView automatically — the
 * page scrolls if the user drags, presses fire only on a contained
 * touch+release, long-press fires only after the OS-tuned hold delay.
 *
 * Cell states
 * -----------
 *  - open (within a rule)         → primary fill
 *  - closed                       → surfaceContainerHighest
 *  - block exception (overlap)    → errorContainer
 *  - extra-hours exception        → successContainer
 *
 * Contiguous open cells in a column read as one capsule (first cell takes
 * a top radius, last cell takes a bottom radius).
 */

const START_HOUR = 7;
const END_HOUR = 22;
const STEP_MIN = 30;
const ROW_COUNT = ((END_HOUR - START_HOUR) * 60) / STEP_MIN;

const GUTTER = 36;
const ROW_HEIGHT = 22;
const ROW_GAP = 3;
const COL_GAP = 3;

// UI Mon-first index → Postgres DOW (0=Sun..6=Sat)
const UI_TO_DOW = [1, 2, 3, 4, 5, 6, 0];

type CellState = 'open' | 'closed' | 'block' | 'extra';

type Props = {
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  /** Tap on a single cell — toggle that 30-minute slot. */
  onCellPress?: (uiDayIndex: number, startMinutes: number) => void;
  /** Long-press on any cell in a column — open the band editor for that day. */
  onColumnLongPress?: (uiDayIndex: number) => void;
};

function minutesAtRow(row: number): number {
  return START_HOUR * 60 + row * STEP_MIN;
}

function rowAtMinutes(min: number): number {
  return Math.floor((min - START_HOUR * 60) / STEP_MIN);
}

function timeStrToMinutes(t: string): number {
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
  onCellPress,
  onColumnLongPress,
}: Props) {
  const theme = useTheme();

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
                const bg = (() => {
                  switch (state) {
                    case 'open':
                      return theme.colors.primary;
                    case 'block':
                      return theme.colors.errorContainer;
                    case 'extra':
                      return theme.colors.successContainer;
                    case 'closed':
                    default:
                      return theme.colors.surfaceContainerHighest;
                  }
                })();
                return (
                  <Pressable
                    key={ui}
                    accessibilityRole="button"
                    accessibilityLabel={`${dayLabels[ui]} ${String(hour).padStart(2, '0')}:${String(minutesAtRow(row) % 60).padStart(2, '0')}`}
                    onPress={() => onCellPress?.(ui, minutesAtRow(row))}
                    onLongPress={() => onColumnLongPress?.(ui)}
                    delayLongPress={350}
                    style={({ pressed }) => [
                      styles.cell,
                      {
                        backgroundColor: bg,
                        borderTopStartRadius: isFirstOfBand ? 6 : 0,
                        borderTopEndRadius: isFirstOfBand ? 6 : 0,
                        borderBottomStartRadius: isLastOfBand ? 6 : 0,
                        borderBottomEndRadius: isLastOfBand ? 6 : 0,
                        opacity: pressed ? 0.7 : 1,
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
  headerRow: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  grid: { gap: ROW_GAP },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: ROW_HEIGHT,
    gap: COL_GAP,
  },
  gutter: { alignItems: 'center', justifyContent: 'center' },
  cell: { flex: 1, height: ROW_HEIGHT },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 16, height: 16, borderRadius: 4 },
});
