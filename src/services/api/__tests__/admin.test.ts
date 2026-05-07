import {
  getTenantStats,
  updateAppointmentStatus,
  type TenantStats,
} from '../admin';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    functions: { invoke: jest.fn() },
  },
}));

const fromMock = supabase.from as jest.Mock;
const invokeMock = supabase.functions.invoke as jest.Mock;

beforeEach(() => {
  fromMock.mockReset();
  invokeMock.mockReset();
});

// Build a chainable thenable that resolves with the supplied result. The
// chain returns `this` for everything, so the eventual `await` consumes
// `result`.
function chain(result: { data?: unknown; error?: unknown; count?: number }) {
  const c: Record<string, unknown> = {};
  for (const m of [
    'select',
    'eq',
    'in',
    'gte',
    'lt',
    'order',
    'limit',
    'maybeSingle',
  ]) {
    c[m] = jest.fn().mockReturnValue(c);
  }
  c.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return c;
}

describe('getTenantStats', () => {
  it('counts today, week confirmed/completed, and computes no-show rate', async () => {
    // Three .from('appointments') calls in this order:
    //   1. getTodayAppointments (returns array of today rows)
    //   2. count of week confirmed/completed (count: 5)
    //   3. completed/no_show in last 30d (4 rows: 3 completed + 1 no_show)
    fromMock
      .mockReturnValueOnce(
        chain({ data: [{ id: 'a' }, { id: 'b' }], error: null }),
      )
      .mockReturnValueOnce(chain({ count: 5, data: null, error: null }))
      .mockReturnValueOnce(
        chain({
          data: [
            { status: 'completed' },
            { status: 'completed' },
            { status: 'completed' },
            { status: 'no_show' },
          ],
          error: null,
        }),
      );

    const stats: TenantStats = await getTenantStats('tenant-1', 'UTC');
    expect(stats.todayCount).toBe(2);
    expect(stats.weekConfirmed).toBe(5);
    expect(stats.noShowRate).toBeCloseTo(0.25, 5);
  });

  it('returns 0 no-show rate when there are no completed/no_show rows', async () => {
    fromMock
      .mockReturnValueOnce(chain({ data: [], error: null }))
      .mockReturnValueOnce(chain({ count: 0, data: null, error: null }))
      .mockReturnValueOnce(chain({ data: [], error: null }));

    const stats = await getTenantStats('tenant-1', 'UTC');
    expect(stats.todayCount).toBe(0);
    expect(stats.weekConfirmed).toBe(0);
    expect(stats.noShowRate).toBe(0);
  });
});

describe('updateAppointmentStatus', () => {
  it('invokes the update-appointment-status Edge Function and returns the row', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { appointment: { id: 'a1', status: 'completed' } },
      error: null,
    });

    const appt = await updateAppointmentStatus('a1', 'completed');
    expect(appt.id).toBe('a1');
    expect(appt.status).toBe('completed');
    expect(invokeMock).toHaveBeenCalledWith('update-appointment-status', {
      body: { appointment_id: 'a1', status: 'completed' },
    });
  });

  it('throws when the function returns an error', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'forbidden' },
    });
    await expect(updateAppointmentStatus('a1', 'cancelled')).rejects.toEqual({
      message: 'forbidden',
    });
  });

  it('throws when the function returns no appointment payload', async () => {
    invokeMock.mockResolvedValueOnce({ data: {}, error: null });
    await expect(updateAppointmentStatus('a1', 'cancelled')).rejects.toThrow(
      'update-appointment-status returned no appointment',
    );
  });
});
