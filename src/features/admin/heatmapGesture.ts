/**
 * Pure gesture state machine for the admin availability heatmap.
 *
 * The machine takes raw touch coordinates and resolves them into the three
 * outcomes the screen needs:
 *
 *  - **Tap** (release with no significant movement, before long-press fires)
 *    → `onToggleCell(ui, startMin)`. The caller decides add vs. remove
 *    based on the cell's current state.
 *  - **Long-press + drag** (hold ~longPressMs, then drag) →
 *    `onCommitBand(ui, startMin, endMin)`. Always additive.
 *  - **Long-press without drag** (held but didn't move) → no-op on release.
 *    The user explicitly opted into paint mode; absorbing the release here
 *    avoids the surprise that "long-press to remove" used to cause.
 *  - **Quick swipe** (move past `scrollIntentPx` before long-press fires)
 *    → cancel the long-press timer; the caller's parent ScrollView keeps
 *    the gesture.
 *
 * The machine is intentionally pure — no React, no responder system, no
 * native APIs. It accepts an `onPaintingChange(boolean)` callback so the
 * screen can lock the wrapping ScrollView's `scrollEnabled` while a band
 * is being painted; that's the mechanism that gives the user back regular
 * page scrolling outside of paint mode.
 */

export type Cell = { ui: number; row: number };

export type PaintedBand = { ui: number; lo: number; hi: number };

export type GestureConfig = {
  cellFromXY: (x: number, y: number) => Cell | null;
  minutesAtRow: (row: number) => number;
  onCommitBand: (uiDayIndex: number, startMinutes: number, endMinutes: number) => void;
  onToggleCell: (uiDayIndex: number, startMinutes: number) => void;
  onPaintingChange?: (painting: boolean) => void;
  longPressMs?: number;
  scrollIntentPx?: number;
};

export type GestureMachine = {
  start: (x: number, y: number) => void;
  move: (x: number, y: number) => void;
  end: () => void;
  /** Drop any in-flight gesture without firing callbacks. */
  cancel: () => void;
  /** Region currently being painted, or null if no band is in progress. */
  getPainted: () => PaintedBand | null;
  /** Whether paint mode (post-long-press) is currently engaged. */
  isPainting: () => boolean;
};

export const DEFAULT_LONG_PRESS_MS = 300;
export const DEFAULT_SCROLL_INTENT_PX = 12;

type InternalState = {
  startCell: Cell | null;
  startXY: { x: number; y: number } | null;
  painting: boolean;
  paint: { start: Cell; end: Cell } | null;
  longPressTimer: ReturnType<typeof setTimeout> | null;
};

export function createHeatmapGesture(config: GestureConfig): GestureMachine {
  const {
    cellFromXY,
    minutesAtRow,
    onCommitBand,
    onToggleCell,
    onPaintingChange,
    longPressMs = DEFAULT_LONG_PRESS_MS,
    scrollIntentPx = DEFAULT_SCROLL_INTENT_PX,
  } = config;

  const state: InternalState = {
    startCell: null,
    startXY: null,
    painting: false,
    paint: null,
    longPressTimer: null,
  };

  const clearLongPress = (): void => {
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
  };

  const setPainting = (next: boolean): void => {
    if (state.painting === next) return;
    state.painting = next;
    onPaintingChange?.(next);
  };

  const reset = (): void => {
    clearLongPress();
    setPainting(false);
    state.startCell = null;
    state.startXY = null;
    state.paint = null;
  };

  const start: GestureMachine['start'] = (x, y) => {
    // A gesture is already in progress — ignore the new touch entirely so
    // a second finger landing during a drag doesn't disturb the band the
    // first finger is painting.
    if (state.startXY !== null) return;
    clearLongPress();
    const c = cellFromXY(x, y);
    state.startCell = c;
    state.startXY = { x, y };
    state.paint = null;
    state.painting = false;
    state.longPressTimer = setTimeout(() => {
      const start = state.startCell;
      if (!start) return;
      state.paint = { start, end: start };
      setPainting(true);
    }, longPressMs);
  };

  const move: GestureMachine['move'] = (x, y) => {
    if (!state.painting) {
      const s = state.startXY;
      if (!s) return;
      const dx = x - s.x;
      const dy = y - s.y;
      if (dx * dx + dy * dy > scrollIntentPx * scrollIntentPx) {
        // The user is dragging too fast / too far before the long-press
        // fires — they're trying to scroll the page, not paint. Cancel
        // the timer and abandon the gesture so the release no-ops.
        clearLongPress();
        state.startCell = null;
        state.startXY = null;
      }
      return;
    }
    const cur = state.paint;
    const startXY = state.startXY;
    if (!cur || !startXY) return;
    // Resolve the cell using the starting x and the current y so the band
    // stays clamped to the originating column even if the finger drifts
    // sideways. Without this clamp a diagonal drag would silently fail
    // to grow the band — cellFromXY would return a different column and
    // the move would be discarded.
    const c = cellFromXY(startXY.x, y);
    if (!c) return;
    if (c.ui !== cur.start.ui) return;
    if (c.row === cur.end.row) return;
    state.paint = { start: cur.start, end: c };
  };

  const end: GestureMachine['end'] = () => {
    try {
      if (state.painting && state.paint) {
        const s = state.paint;
        const lo = Math.min(s.start.row, s.end.row);
        const hi = Math.max(s.start.row, s.end.row);
        if (hi > lo) {
          onCommitBand(s.start.ui, minutesAtRow(lo), minutesAtRow(hi + 1));
        }
        // hi === lo (long-press without drag) is intentionally a no-op.
      } else if (state.startCell) {
        // Tap: timer never fired (either released early or cancelled by
        // a scroll-intent move that then came back to release).
        const sc = state.startCell;
        onToggleCell(sc.ui, minutesAtRow(sc.row));
      }
    } finally {
      reset();
    }
  };

  const cancel: GestureMachine['cancel'] = () => {
    reset();
  };

  const getPainted: GestureMachine['getPainted'] = () => {
    const p = state.paint;
    if (!p || p.start.ui !== p.end.ui) return null;
    const lo = Math.min(p.start.row, p.end.row);
    const hi = Math.max(p.start.row, p.end.row);
    return { ui: p.start.ui, lo, hi };
  };

  const isPainting: GestureMachine['isPainting'] = () => state.painting;

  return { start, move, end, cancel, getPainted, isPainting };
}
