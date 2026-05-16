/**
 * Pure helpers for manipulating availability bands inside a single day.
 *
 * A "band" is a half-open interval `[start_time, end_time)` of minutes.
 * Both `start_time` and `end_time` are `HH:mm:ss` strings; conversion to
 * and from minute integers lives here so the operations stay closed over
 * the band shape.
 *
 * These helpers drive the admin Hours screen's tap-to-toggle interaction:
 *  - Tapping a closed cell adds a 30-minute band, merged with neighbours
 *    via `mergeBands`.
 *  - Tapping an open cell carves the 30-minute slice out via `removeSlot`,
 *    which can split a single band into two.
 *
 * They're pure and unit-tested in isolation — the screen just orchestrates.
 */

export type Band = { start_time: string; end_time: string };

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map((p) => parseInt(p, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

export function toHHMMSS(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

/**
 * Sort + merge overlapping or touching bands so a "fill the gap between
 * two existing bands" or "duplicate add" collapses into one band rather
 * than producing N overlapping rows.
 */
export function mergeBands(bands: Band[]): Band[] {
  if (bands.length === 0) return bands;
  const sorted = [...bands].sort(
    (a, b) => toMinutes(a.start_time) - toMinutes(b.start_time),
  );
  const out: Band[] = [{ ...sorted[0]! }];
  for (let i = 1; i < sorted.length; i++) {
    const prev = out[out.length - 1]!;
    const curr = sorted[i]!;
    if (toMinutes(curr.start_time) <= toMinutes(prev.end_time)) {
      if (toMinutes(curr.end_time) > toMinutes(prev.end_time)) {
        prev.end_time = curr.end_time;
      }
    } else {
      out.push({ ...curr });
    }
  }
  return out;
}

/**
 * Subtract a half-open `[startMin, endMin)` slice from each band. Bands
 * with no overlap pass through unchanged; an overlapping band yields the
 * pieces that lie outside the slice — which can split a single band into
 * two (e.g. removing 12:00–12:30 from 09:00–17:00 yields 09:00–12:00
 * and 12:30–17:00).
 */
export function removeSlot(
  bands: Band[],
  startMin: number,
  endMin: number,
): Band[] {
  if (endMin <= startMin) return bands;
  const out: Band[] = [];
  for (const b of bands) {
    const s = toMinutes(b.start_time);
    const e = toMinutes(b.end_time);
    if (e <= startMin || s >= endMin) {
      out.push(b);
      continue;
    }
    if (s < startMin) out.push({ start_time: b.start_time, end_time: toHHMMSS(startMin) });
    if (e > endMin) out.push({ start_time: toHHMMSS(endMin), end_time: b.end_time });
  }
  return out;
}

/** True if `minutes` falls inside any band in `bands`. */
export function isMinuteInsideBands(bands: Band[], minutes: number): boolean {
  return bands.some(
    (b) => toMinutes(b.start_time) <= minutes && toMinutes(b.end_time) > minutes,
  );
}
