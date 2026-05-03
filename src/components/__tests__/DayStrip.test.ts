import { groupSlotsByDay } from '../DayStrip';
import { type AvailableSlot } from '@/types/db';

const slot = (startsAt: string): AvailableSlot => ({
  starts_at: startsAt,
  ends_at: startsAt,
});

describe('groupSlotsByDay', () => {
  it('buckets slots by day in the tenant timezone', () => {
    // 2026-05-10 at 23:30 UTC is 2026-05-11 01:30 in Cairo (UTC+2),
    // so it should bucket into the next day.
    const slots = [
      slot('2026-05-10T07:00:00Z'),
      slot('2026-05-10T11:30:00Z'),
      slot('2026-05-10T23:30:00Z'),
    ];
    const grouped = groupSlotsByDay(slots, 'Africa/Cairo');
    expect(Object.keys(grouped).sort()).toEqual(['2026-05-10', '2026-05-11']);
    expect(grouped['2026-05-10']).toHaveLength(2);
    expect(grouped['2026-05-11']).toHaveLength(1);
  });

  it('returns an empty object when no slots are passed', () => {
    expect(groupSlotsByDay([], 'UTC')).toEqual({});
  });

  it('uses ISO 8601 date keys (YYYY-MM-DD)', () => {
    const grouped = groupSlotsByDay([slot('2026-01-01T12:00:00Z')], 'UTC');
    expect(Object.keys(grouped)[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
