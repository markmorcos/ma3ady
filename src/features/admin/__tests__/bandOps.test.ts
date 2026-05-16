import {
  isMinuteInsideBands,
  mergeBands,
  removeSlot,
  toHHMMSS,
  toMinutes,
  type Band,
} from '../bandOps';

const b = (start: string, end: string): Band => ({ start_time: start, end_time: end });

describe('toMinutes / toHHMMSS', () => {
  it('round-trips arbitrary minute values', () => {
    for (const m of [0, 30, 60, 540, 1080, 1439]) {
      expect(toMinutes(toHHMMSS(m))).toBe(m);
    }
  });

  it('parses HH:mm and HH:mm:ss the same way', () => {
    expect(toMinutes('09:30')).toBe(toMinutes('09:30:00'));
  });

  it('pads single-digit hours and minutes', () => {
    expect(toHHMMSS(9 * 60)).toBe('09:00:00');
    expect(toHHMMSS(9 * 60 + 5)).toBe('09:05:00');
  });
});

describe('mergeBands', () => {
  it('returns an empty array when given no bands', () => {
    expect(mergeBands([])).toEqual([]);
  });

  it('leaves a single band untouched', () => {
    expect(mergeBands([b('09:00:00', '17:00:00')])).toEqual([
      b('09:00:00', '17:00:00'),
    ]);
  });

  it('sorts bands by start time', () => {
    expect(
      mergeBands([b('14:00:00', '15:00:00'), b('09:00:00', '10:00:00')]),
    ).toEqual([b('09:00:00', '10:00:00'), b('14:00:00', '15:00:00')]);
  });

  it('merges two overlapping bands into one', () => {
    expect(
      mergeBands([b('09:00:00', '12:00:00'), b('11:00:00', '14:00:00')]),
    ).toEqual([b('09:00:00', '14:00:00')]);
  });

  it('merges two touching bands (end == start) into one', () => {
    expect(
      mergeBands([b('09:00:00', '12:00:00'), b('12:00:00', '15:00:00')]),
    ).toEqual([b('09:00:00', '15:00:00')]);
  });

  it('absorbs a band fully contained inside another', () => {
    expect(
      mergeBands([b('09:00:00', '17:00:00'), b('10:00:00', '11:00:00')]),
    ).toEqual([b('09:00:00', '17:00:00')]);
  });

  it('keeps disjoint bands separate', () => {
    expect(
      mergeBands([b('09:00:00', '12:00:00'), b('13:00:00', '17:00:00')]),
    ).toEqual([b('09:00:00', '12:00:00'), b('13:00:00', '17:00:00')]);
  });

  it('collapses a chain of three overlapping bands', () => {
    expect(
      mergeBands([
        b('09:00:00', '11:00:00'),
        b('10:30:00', '13:00:00'),
        b('12:30:00', '15:00:00'),
      ]),
    ).toEqual([b('09:00:00', '15:00:00')]);
  });

  it('does not mutate the input array', () => {
    const input = [b('14:00:00', '15:00:00'), b('09:00:00', '10:00:00')];
    const snapshot = JSON.parse(JSON.stringify(input)) as Band[];
    mergeBands(input);
    expect(input).toEqual(snapshot);
  });
});

describe('removeSlot', () => {
  it('returns the input when no band overlaps the slice', () => {
    const input = [b('09:00:00', '11:00:00'), b('14:00:00', '17:00:00')];
    expect(removeSlot(input, 12 * 60, 13 * 60)).toEqual(input);
  });

  it('removes a band entirely when the slice covers it', () => {
    expect(removeSlot([b('09:00:00', '11:00:00')], 9 * 60, 11 * 60)).toEqual(
      [],
    );
  });

  it('shortens a band when the slice clips its end', () => {
    expect(
      removeSlot([b('09:00:00', '17:00:00')], 16 * 60, 18 * 60),
    ).toEqual([b('09:00:00', '16:00:00')]);
  });

  it('shortens a band when the slice clips its start', () => {
    expect(
      removeSlot([b('09:00:00', '17:00:00')], 8 * 60, 10 * 60),
    ).toEqual([b('10:00:00', '17:00:00')]);
  });

  it('splits a band into two when the slice falls inside', () => {
    // Removing 12:00–12:30 from 09:00–17:00 should leave 09:00–12:00 and 12:30–17:00.
    expect(
      removeSlot([b('09:00:00', '17:00:00')], 12 * 60, 12 * 60 + 30),
    ).toEqual([b('09:00:00', '12:00:00'), b('12:30:00', '17:00:00')]);
  });

  it('handles multiple bands, splitting some and leaving others alone', () => {
    expect(
      removeSlot(
        [b('09:00:00', '12:00:00'), b('13:00:00', '17:00:00')],
        10 * 60,
        14 * 60,
      ),
    ).toEqual([b('09:00:00', '10:00:00'), b('14:00:00', '17:00:00')]);
  });

  it('treats an empty slice (end == start) as a no-op', () => {
    const input = [b('09:00:00', '17:00:00')];
    expect(removeSlot(input, 12 * 60, 12 * 60)).toEqual(input);
  });

  it('treats a reversed slice (end < start) as a no-op', () => {
    const input = [b('09:00:00', '17:00:00')];
    expect(removeSlot(input, 15 * 60, 12 * 60)).toEqual(input);
  });
});

describe('isMinuteInsideBands', () => {
  it('is true at the start of a band', () => {
    expect(isMinuteInsideBands([b('09:00:00', '17:00:00')], 9 * 60)).toBe(true);
  });

  it('is true at the last minute inside a band', () => {
    expect(
      isMinuteInsideBands([b('09:00:00', '17:00:00')], 17 * 60 - 1),
    ).toBe(true);
  });

  it('is false at the end of a band (half-open interval)', () => {
    expect(isMinuteInsideBands([b('09:00:00', '17:00:00')], 17 * 60)).toBe(false);
  });

  it('is false outside every band', () => {
    expect(
      isMinuteInsideBands([b('09:00:00', '11:00:00'), b('14:00:00', '17:00:00')], 12 * 60),
    ).toBe(false);
  });
});
