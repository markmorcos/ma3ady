import {
  getMyAppointments,
  getAppointment,
  rescheduleAppointmentAuthed,
} from '../appointments';
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

function chain(result: { data?: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'maybeSingle']) {
    c[m] = jest.fn().mockReturnValue(c);
  }
  c.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return c;
}

describe('getMyAppointments', () => {
  it('returns rows and rethrows errors', async () => {
    fromMock.mockReturnValueOnce(
      chain({ data: [{ id: 'a' }, { id: 'b' }], error: null }),
    );
    await expect(getMyAppointments()).resolves.toEqual([
      { id: 'a' },
      { id: 'b' },
    ]);

    fromMock.mockReturnValueOnce(chain({ data: null, error: { message: 'boom' } }));
    await expect(getMyAppointments()).rejects.toEqual({ message: 'boom' });
  });
});

describe('getAppointment', () => {
  it('returns a single row or null', async () => {
    fromMock.mockReturnValueOnce(chain({ data: { id: 'a1' }, error: null }));
    await expect(getAppointment('a1')).resolves.toEqual({ id: 'a1' });

    fromMock.mockReturnValueOnce(chain({ data: null, error: null }));
    await expect(getAppointment('missing')).resolves.toBeNull();
  });
});

describe('rescheduleAppointmentAuthed', () => {
  it('invokes reschedule-appointment with appointment_id + new_starts_at', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { appointment: { id: 'a1', starts_at: '2027-01-04T10:00:00.000Z' } },
      error: null,
    });
    const appt = await rescheduleAppointmentAuthed(
      'a1',
      new Date('2027-01-04T10:00:00.000Z'),
    );
    expect(appt.starts_at).toBe('2027-01-04T10:00:00.000Z');
    expect(invokeMock).toHaveBeenCalledWith('reschedule-appointment', {
      body: {
        appointment_id: 'a1',
        new_starts_at: '2027-01-04T10:00:00.000Z',
      },
    });
  });

  it('passes a string starts_at through unchanged', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { appointment: { id: 'a1' } },
      error: null,
    });
    await rescheduleAppointmentAuthed('a1', '2027-01-04T10:00:00Z');
    expect(invokeMock).toHaveBeenCalledWith('reschedule-appointment', {
      body: { appointment_id: 'a1', new_starts_at: '2027-01-04T10:00:00Z' },
    });
  });

  it('throws on function error', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'slot_taken' },
    });
    await expect(
      rescheduleAppointmentAuthed('a1', '2027-01-04T10:00:00Z'),
    ).rejects.toEqual({ message: 'slot_taken' });
  });

  it('throws when no appointment is returned', async () => {
    invokeMock.mockResolvedValueOnce({ data: {}, error: null });
    await expect(
      rescheduleAppointmentAuthed('a1', '2027-01-04T10:00:00Z'),
    ).rejects.toThrow('reschedule-appointment returned no row');
  });
});
