import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
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
 * The grid wrapper installs a `PanResponder`. The responder converts the
 * gesture's `(locationX, locationY)` into `(uiDayIndex, row)` using the
 * grid's measured width plus the constant row pitch. Pressable per-cell
 * doesn't work for drag-paint — RN only fires `onPressIn` on the cell
 * initially pressed, not on cells you drag into.
 *
 * Release decides between the two callbacks:
 *  - `lo === hi` (no movement) → `onToggleCell` (caller adds or removes
 *    the single 30-minute slot depending on its current state).
 *  - `lo !== hi` (multi-row drag) → `onCommitBand` with the band.
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
const ROW_PITCH = ROW_HEIGHT + ROW_GAP;

// UI Mon-first index → Postgres DOW (0=Sun..6=Sat)
const UI_TO_DOW = [1, 2, 3, 4, 5, 6, 0];

type CellState = 'open' | 'closed' | 'block' | 'extra';

type Cell = { ui: number; row: number };

type Props = {
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  /** Called when a drag-painted band spanning multiple cells is released. */
  onCommitBand?: (uiDayIndex: number, startMinutes: number, endMinutes: number) => void;
  /** Called for a single-tap (no drag). Caller decides add vs. remove. */
  onToggleCell?: (uiDayIndex: number, startMinutes: number) => void;
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
  onCommitBand,
  onToggleCell,
}: Props) {
  const theme = useTheme();

  // The PanResponder is created once; it reads latest props + grid width
  // through refs so we don't pay re-render-per-tap.
  const gridWidthRef = useRef(0);
  const callbacksRef = useRef({ onCommitBand, onToggleCell });
  callbacksRef.current = { onCommitBand, onToggleCell };

  const paintRef = useRef<{ start: Cell; end: Cell } | null>(null);
  // `paintTick` drives a re-render whenever the pan responder mutates the
  // paint ref. Reading the ref directly during render is intentional —
  // we just need to make sure we re-render on each pan move.
  const [, setPaintTick] = useState(0);
  const paint = paintRef.current;

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

  const painted = useMemo(() => {
    if (!paint || paint.start.ui !== paint.end.ui) return null;
    const lo = Math.min(paint.start.row, paint.end.row);
    const hi = Math.max(paint.start.row, paint.end.row);
    return { ui: paint.start.ui, lo, hi };
  }, [paint]);

  const cellFromXY = (x: number, y: number): Cell | null => {
    const w = gridWidthRef.current;
    if (w === 0) return null;
    if (x < GUTTER) return null;
    const inner = w - GUTTER;
    if (inner <= 0) return null;
    // Each cell + its right-edge gap shares the column pitch.
    const colPitch = inner / 7;
    const col = Math.floor((x - GUTTER) / colPitch);
    const row = Math.floor(y / ROW_PITCH);
    if (col < 0 || col > 6 || row < 0 || row >= ROW_COUNT) return null;
    return { ui: col, row };
  };

  const repaint = () => setPaintTick((t) => t + 1);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const c = cellFromXY(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
          if (!c) return;
          paintRef.current = { start: c, end: c };
          repaint();
        },
        onPanResponderMove: (evt) => {
          const c = cellFromXY(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
          if (!c) return;
          const cur = paintRef.current;
          if (!cur) {
            paintRef.current = { start: c, end: c };
            repaint();
            return;
          }
          // Clamp to the column we started in — drag-paint doesn't cross days.
          if (c.ui !== cur.start.ui) return;
          if (c.row === cur.end.row) return;
          paintRef.current = { start: cur.start, end: c };
          repaint();
        },
        onPanResponderRelease: () => {
          const s = paintRef.current;
          if (s) {
            const lo = Math.min(s.start.row, s.end.row);
            const hi = Math.max(s.start.row, s.end.row);
            const { onCommitBand: ocb, onToggleCell: otc } = callbacksRef.current;
            if (lo === hi) {
              otc?.(s.start.ui, minutesAtRow(lo));
            } else {
              ocb?.(s.start.ui, minutesAtRow(lo), minutesAtRow(hi + 1));
            }
          }
          paintRef.current = null;
          repaint();
        },
        onPanResponderTerminate: () => {
          paintRef.current = null;
          repaint();
        },
      }),
    // Static — PanResponder reads everything through refs.
    [],
  );

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

      <View
        onLayout={(e) => {
          gridWidthRef.current = e.nativeEvent.layout.width;
        }}
        style={styles.grid}
        {...panResponder.panHandlers}
      >
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
                const bg = (() => {
                  if (isPainting) return theme.colors.primaryContainer;
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
                  <View
                    key={ui}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: bg,
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
