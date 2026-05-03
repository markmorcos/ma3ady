import { resolveDisplayTimezone } from '../useDisplayTimezone';

describe('resolveDisplayTimezone', () => {
  it('returns the public-booking session override when set', () => {
    expect(
      resolveDisplayTimezone('public-booking', 'America/Los_Angeles', {
        tenantTimezone: 'Europe/Berlin',
      }),
    ).toBe('America/Los_Angeles');
  });

  it('ignores the session override outside public-booking', () => {
    expect(
      resolveDisplayTimezone('admin', 'America/Los_Angeles', {
        tenantTimezone: 'Europe/Berlin',
      }),
    ).toBe('Europe/Berlin');
  });

  it('uses the admin override on admin surfaces', () => {
    expect(
      resolveDisplayTimezone('admin', null, {
        tenantTimezone: 'Europe/Berlin',
        adminOverride: 'Asia/Dubai',
      }),
    ).toBe('Asia/Dubai');
  });

  it('does not apply the admin override on public-booking', () => {
    expect(
      resolveDisplayTimezone('public-booking', null, {
        tenantTimezone: 'Europe/Berlin',
        adminOverride: 'Asia/Dubai',
      }),
    ).toBe('Europe/Berlin');
  });

  it('falls back to tenant timezone for customer-bookings', () => {
    expect(
      resolveDisplayTimezone('customer-bookings', null, {
        tenantTimezone: 'Europe/Berlin',
      }),
    ).toBe('Europe/Berlin');
  });

  it('falls back to device timezone when nothing else resolves', () => {
    const result = resolveDisplayTimezone('admin', null, {});
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
