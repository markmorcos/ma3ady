import { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { Text } from '@/components/Text';
import { type AvailabilityException, type AvailabilityRule } from '@/types/db';
import { createHeatmapGesture, type Cell } from './heatmapGesture';

/**
 * 30-row × 7-column M3 weekly heatmap used on the admin Hours screen.
 *
 * Rows are 30-minute steps from 07:00 → 22:00 (30 rows). Columns are days,
 * Mon → Sun (matching the UI order; Postgres day_of_week is 0=Sun..6=Sat).
 *
 * Interaction model
 * -----------------
 *  - **Tap** (quick touch + release, no drag) → `onToggleCell` for that
 *    one 30-minute slot. Caller decides add vs. remove.
 *  - **Long-press (~300ms) + drag** in a single column → `onCommitBand`
 *    with the painted band on release. Always additive.
 *  - **Long-press, then release without moving** → no-op.
 *  - **Quick swipe** (large move before the long-press timer fires) → the
 *    machine releases its state; the parent ScrollView keeps scrolling.
 *    The screen wires `onPaintingChange` to the wrapping ScrollView's
 *    `scrollEnabled` prop so once paint mode locks in, the page stops
 *    scrolling under your finger.
 *
 * The gesture state machine lives in `./heatmapGesture` and is tested in
 * isolation; this component just wires React's touch events to it.
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

type Props = {
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  /** Called when a drag-painted band spanning multiple cells is released. */
  onCommitBand?: (uiDayIndex: number, startMinutes: number, endMinutes: number) => void;
  /** Called for a single-tap (no drag). Caller decides add vs. remove. */
  onToggleCell?: (uiDayIndex: number, startMinutes: number) => void;
  /**
   * Fires when the long-press lock engages or releases. The screen should
   * pipe this into the wrapping ScrollView's `scrollEnabled` so the page
   * stops scrolling while a band is being painted. Outside of paint mode
   * scroll is unaffected.
   */
  onPaintingChange?: (painting: boolean) => void;
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
  onPaintingChange,
}: Props) {
  const theme = useTheme();

  const gridWidthRef = useRef(0);
  const callbacksRef = useRef({ onCommitBand, onToggleCell, onPaintingChange });
  callbacksRef.current = { onCommitBand, onToggleCell, onPaintingChange };

  // `paintTick` drives a re-render whenever the gesture mutates state. The
  // gesture machine itself is ref-stable so we don't pay rebuild cost per
  // touch event.
  const [, setPaintTick] = useState(0);
  const repaint = (): void => setPaintTick((t) => t + 1);

  const cellFromXY = (x: number, y: number): Cell | null => {
    const w = gridWidthRef.current;
    if (w === 0) return null;
    if (x < GUTTER) return null;
    const inner = w - GUTTER;
    if (inner <= 0) return null;
    // Each cell shares the column pitch with the gap to its right; the
    // last column absorbs the no-gap remainder. Good enough for hit
    // detection — we don't need pixel-perfect alignment with the
    // rendered cell boundaries.
    const colPitch = inner / 7;
    const col = Math.floor((x - GUTTER) / colPitch);
    const row = Math.floor(y / ROW_PITCH);
    if (col < 0 || col > 6 || row < 0 || row >= ROW_COUNT) return null;
    return { ui: col, row };
  };

  const machine = useMemo(
    () =>
      createHeatmapGesture({
        cellFromXY,
        minutesAtRow,
        onCommitBand: (ui, sm, em) => {
          callbacksRef.current.onCommitBand?.(ui, sm, em);
        },
        onToggleCell: (ui, sm) => {
          callbacksRef.current.onToggleCell?.(ui, sm);
        },
        onPaintingChange: (painting) => {
          callbacksRef.current.onPaintingChange?.(painting);
          repaint();
        },
      }),
    // `cellFromXY` closes over `gridWidthRef` which is mutable; the machine
    // re-reads it on every touch. We intentionally don't rebuild the
    // machine across renders.
    [],
  );

  // Clean up the long-press timer if the component unmounts mid-gesture.
  useEffect(() => () => machine.cancel(), [machine]);

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

  const painted = machine.getPainted();

  const onTouchStart = (e: GestureResponderEvent): void => {
    const t = e.nativeEvent.touches[0];
    if (!t) return;
    machine.start(t.locationX, t.locationY);
    repaint();
  };

  const onTouchMove = (e: GestureResponderEvent): void => {
    const t = e.nativeEvent.touches[0];
    if (!t) return;
    machine.move(t.locationX, t.locationY);
    repaint();
  };

  const onTouchEnd = (): void => {
    machine.end();
    repaint();
  };

  const onTouchCancel = (): void => {
    machine.cancel();
    repaint();
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

      <View
        onLayout={(e) => {
          gridWidthRef.current = e.nativeEvent.layout.width;
        }}
        style={styles.grid}
        // Observe every touch on the grid without claiming the responder.
        // ScrollView keeps ownership of the gesture by default; the screen
        // disables ScrollView's scrollEnabled in response to
        // onPaintingChange so the page only locks once the long-press
        // engages paint mode.
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
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
