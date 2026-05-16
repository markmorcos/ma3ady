/**
 * Tests for the heatmap gesture state machine.
 *
 * The machine drives the admin availability heatmap. It receives raw touch
 * events (start/move/end) and decides between three outcomes:
 *  - `onToggleCell` for a tap (release without long-press),
 *  - `onCommitBand` for a long-press-then-drag,
 *  - no-op for a long-press with no drag, or a quick swipe (scroll intent).
 *
 * The machine is pure: it doesn't touch React, the responder system, or any
 * RN APIs — it accepts a `cellFromXY` resolver and minutes/row helpers from
 * the caller. That keeps these tests fast and deterministic, and pins down
 * exactly the behaviour the screen depends on.
 */

import {
  createHeatmapGesture,
  DEFAULT_LONG_PRESS_MS,
} from '../heatmapGesture';

// A 7-column × 4-row test grid covering rows 0..3 (i.e. 30-min slots from
// 07:00 to 09:00). Column pitch 100px, row pitch 25px, gutter at x < 36.
const GUTTER = 36;
const COL_PITCH = 100;
const ROW_PITCH = 25;
const START_MIN = 7 * 60;
const STEP_MIN = 30;

function cellFromXY(x: number, y: number): { ui: number; row: number } | null {
  if (x < GUTTER) return null;
  const ui = Math.floor((x - GUTTER) / COL_PITCH);
  const row = Math.floor(y / ROW_PITCH);
  if (ui < 0 || ui > 6 || row < 0) return null;
  return { ui, row };
}

const minutesAtRow = (r: number): number => START_MIN + r * STEP_MIN;

function make() {
  const onCommitBand = jest.fn();
  const onToggleCell = jest.fn();
  const onPaintingChange = jest.fn();
  const machine = createHeatmapGesture({
    cellFromXY,
    minutesAtRow,
    onCommitBand,
    onToggleCell,
    onPaintingChange,
  });
  return { machine, onCommitBand, onToggleCell, onPaintingChange };
}

// Helpers that compute coordinates of a specific cell so tests stay readable.
const xOf = (col: number): number => GUTTER + col * COL_PITCH + COL_PITCH / 2;
const yOf = (row: number): number => row * ROW_PITCH + ROW_PITCH / 2;

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('heatmap gesture — tap to toggle', () => {
  it('fires onToggleCell on a quick touch+release with no movement', () => {
    const { machine, onToggleCell, onCommitBand } = make();
    machine.start(xOf(2), yOf(1));
    machine.end();
    expect(onToggleCell).toHaveBeenCalledTimes(1);
    expect(onToggleCell).toHaveBeenCalledWith(2, minutesAtRow(1));
    expect(onCommitBand).not.toHaveBeenCalled();
  });

  it('tolerates small finger jitter — still a tap', () => {
    const { machine, onToggleCell, onCommitBand } = make();
    machine.start(xOf(0), yOf(0));
    // 5px move — within the SCROLL_INTENT_PX jitter window.
    machine.move(xOf(0) + 5, yOf(0) + 3);
    machine.end();
    expect(onToggleCell).toHaveBeenCalledWith(0, minutesAtRow(0));
    expect(onCommitBand).not.toHaveBeenCalled();
  });
});

describe('heatmap gesture — long-press to paint', () => {
  it('fires onCommitBand when the user long-presses and then drags', () => {
    const { machine, onCommitBand, onToggleCell, onPaintingChange } = make();
    machine.start(xOf(3), yOf(0));
    jest.advanceTimersByTime(DEFAULT_LONG_PRESS_MS + 1);
    // The long-press fired; the parent should now be told to lock scroll.
    expect(onPaintingChange).toHaveBeenCalledWith(true);
    // Drag down two rows.
    machine.move(xOf(3), yOf(2));
    machine.end();
    expect(onCommitBand).toHaveBeenCalledTimes(1);
    // Band runs from row 0 inclusive to row 3 exclusive (lo..hi+1).
    expect(onCommitBand).toHaveBeenCalledWith(3, minutesAtRow(0), minutesAtRow(3));
    expect(onToggleCell).not.toHaveBeenCalled();
    // After the gesture ends, paint mode releases.
    expect(onPaintingChange).toHaveBeenLastCalledWith(false);
  });

  it('handles dragging upwards (end above start)', () => {
    const { machine, onCommitBand } = make();
    machine.start(xOf(1), yOf(3));
    jest.advanceTimersByTime(DEFAULT_LONG_PRESS_MS + 1);
    machine.move(xOf(1), yOf(1));
    machine.end();
    expect(onCommitBand).toHaveBeenCalledWith(1, minutesAtRow(1), minutesAtRow(4));
  });

  it('long-press with no movement is a no-op on release', () => {
    const { machine, onCommitBand, onToggleCell, onPaintingChange } = make();
    machine.start(xOf(2), yOf(1));
    jest.advanceTimersByTime(DEFAULT_LONG_PRESS_MS + 1);
    machine.end();
    expect(onCommitBand).not.toHaveBeenCalled();
    expect(onToggleCell).not.toHaveBeenCalled();
    // Paint mode was entered (visual cue on the held cell) and then exited
    // cleanly so the screen unlocks scrolling.
    expect(onPaintingChange).toHaveBeenNthCalledWith(1, true);
    expect(onPaintingChange).toHaveBeenLastCalledWith(false);
  });

  it('clamps drag to the column the long-press started on', () => {
    const { machine, onCommitBand } = make();
    machine.start(xOf(2), yOf(0));
    jest.advanceTimersByTime(DEFAULT_LONG_PRESS_MS + 1);
    // Try to drag both down (rows) and sideways (columns).
    machine.move(xOf(4), yOf(2));
    machine.end();
    // The band lands in the originating column, not the column the finger
    // wandered into.
    expect(onCommitBand).toHaveBeenCalledWith(2, minutesAtRow(0), minutesAtRow(3));
  });
});

describe('heatmap gesture — scroll intent', () => {
  it('fast drag before the long-press timer cancels the gesture', () => {
    const { machine, onCommitBand, onToggleCell, onPaintingChange } = make();
    machine.start(xOf(2), yOf(1));
    // Move 40px well within the long-press window — scroll intent.
    machine.move(xOf(2), yOf(1) + 40);
    // Even after the long-press timer would have fired, paint mode does not
    // engage because the timer was cancelled.
    jest.advanceTimersByTime(DEFAULT_LONG_PRESS_MS + 1);
    machine.end();
    expect(onCommitBand).not.toHaveBeenCalled();
    expect(onToggleCell).not.toHaveBeenCalled();
    expect(onPaintingChange).not.toHaveBeenCalled();
  });

  it('does not lock the scroll view while the finger is still within the jitter window', () => {
    const { machine, onPaintingChange } = make();
    machine.start(xOf(0), yOf(0));
    machine.move(xOf(0) + 3, yOf(0) + 3);
    expect(onPaintingChange).not.toHaveBeenCalled();
  });
});

describe('heatmap gesture — state hygiene', () => {
  it('forgets state between gestures so a tap after a band does not commit twice', () => {
    const { machine, onCommitBand, onToggleCell } = make();

    // First gesture: long-press + drag → commit band.
    machine.start(xOf(0), yOf(0));
    jest.advanceTimersByTime(DEFAULT_LONG_PRESS_MS + 1);
    machine.move(xOf(0), yOf(2));
    machine.end();
    expect(onCommitBand).toHaveBeenCalledTimes(1);

    // Second gesture: a tap on a different cell. Must NOT re-fire commit.
    machine.start(xOf(1), yOf(0));
    machine.end();
    expect(onCommitBand).toHaveBeenCalledTimes(1);
    expect(onToggleCell).toHaveBeenCalledTimes(1);
    expect(onToggleCell).toHaveBeenCalledWith(1, minutesAtRow(0));
  });

  it('cancel() drops any in-flight gesture without firing callbacks', () => {
    const { machine, onCommitBand, onToggleCell, onPaintingChange } = make();
    machine.start(xOf(2), yOf(1));
    jest.advanceTimersByTime(DEFAULT_LONG_PRESS_MS + 1);
    machine.move(xOf(2), yOf(3));
    machine.cancel();
    expect(onCommitBand).not.toHaveBeenCalled();
    expect(onToggleCell).not.toHaveBeenCalled();
    // We still toggled paint mode on (visual cue fired) — make sure the
    // cancel cleanly toggles it back off so the parent unlocks scroll.
    expect(onPaintingChange).toHaveBeenLastCalledWith(false);
  });

  it('start() ignores a second touch — multi-touch is not painted as a second band', () => {
    const { machine, onCommitBand } = make();
    machine.start(xOf(0), yOf(0));
    jest.advanceTimersByTime(DEFAULT_LONG_PRESS_MS + 1);
    machine.move(xOf(0), yOf(2));
    // A second finger lands. The machine should ignore it: still painting
    // the original column.
    machine.start(xOf(5), yOf(0));
    machine.end();
    expect(onCommitBand).toHaveBeenCalledTimes(1);
    expect(onCommitBand).toHaveBeenCalledWith(0, minutesAtRow(0), minutesAtRow(3));
  });
});

describe('heatmap gesture — painted overlay', () => {
  it('exposes the current band so the UI can render an overlay', () => {
    const { machine } = make();
    machine.start(xOf(2), yOf(1));
    jest.advanceTimersByTime(DEFAULT_LONG_PRESS_MS + 1);
    machine.move(xOf(2), yOf(3));
    const painted = machine.getPainted();
    expect(painted).toEqual({ ui: 2, lo: 1, hi: 3 });
  });

  it('returns null when no band is in progress', () => {
    const { machine } = make();
    expect(machine.getPainted()).toBeNull();
    machine.start(xOf(0), yOf(0));
    // Before long-press fires, no overlay.
    expect(machine.getPainted()).toBeNull();
  });
});
