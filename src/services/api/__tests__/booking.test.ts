import {
  bookAppointment,
  cancelByToken,
  InvalidManageTokenError,
  rescheduleByToken,
  SlotTakenError,
  SlotUnavailableError,
  verifyManageToken,
} from '../booking';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    functions: { invoke: jest.fn() },
  },
}));

const rpc = supabase.rpc as jest.Mock;
const invoke = supabase.functions.invoke as jest.Mock;

beforeEach(() => {
  rpc.mockReset();
  invoke.mockReset();
});

describe('bookAppointment', () => {
  it('returns the booking row from the RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: [{ appointment_id: 'a1', manage_token: 'plaintext' }],
      error: null,
    });
    const result = await bookAppointment({
      tenantSlug: 'demo-clinic',
      serviceId: 'svc1',
      startsAt: '2026-05-10T14:00:00.000Z',
      guestName: 'Mark',
      guestEmail: 'mark@example.com',
    });
    expect(result.appointment_id).toBe('a1');
    expect(result.manage_token).toBe('plaintext');
    expect(rpc).toHaveBeenCalledWith('book_appointment', expect.any(Object));
  });

  it('throws SlotTakenError on EXCLUDE collision', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'slot_taken: appointment exists in window' },
    });
    await expect(
      bookAppointment({
        tenantSlug: 'demo-clinic',
        serviceId: 'svc1',
        startsAt: '2026-05-10T14:00:00.000Z',
        guestName: 'Mark',
        guestEmail: 'mark@example.com',
      }),
    ).rejects.toBeInstanceOf(SlotTakenError);
  });

  it('throws SlotUnavailableError when slot is not in compute_available_slots', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'slot_unavailable' },
    });
    await expect(
      bookAppointment({
        tenantSlug: 'demo-clinic',
        serviceId: 'svc1',
        startsAt: '2026-05-10T14:00:00.000Z',
        guestName: 'Mark',
        guestEmail: 'mark@example.com',
      }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });
});

describe('verifyManageToken', () => {
  it('returns the appointment id when valid', async () => {
    rpc.mockResolvedValueOnce({ data: 'appt-123', error: null });
    await expect(verifyManageToken('plaintext')).resolves.toBe('appt-123');
  });

  it('throws InvalidManageTokenError on appointment_unavailable', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'appointment_unavailable' },
    });
    await expect(verifyManageToken('bad')).rejects.toBeInstanceOf(
      InvalidManageTokenError,
    );
  });

  it('throws InvalidManageTokenError when RPC returns a non-string', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(verifyManageToken('bad')).rejects.toBeInstanceOf(
      InvalidManageTokenError,
    );
  });
});

describe('cancelByToken', () => {
  it('returns the cancelled appointment', async () => {
    invoke.mockResolvedValueOnce({
      data: { appointment: { id: 'appt-123', status: 'cancelled' } },
      error: null,
    });
    const appt = await cancelByToken('plaintext');
    expect(appt.status).toBe('cancelled');
  });

  it('maps invalid_token to InvalidManageTokenError', async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'invalid_token' },
    });
    await expect(cancelByToken('bad')).rejects.toBeInstanceOf(InvalidManageTokenError);
  });
});

describe('rescheduleByToken', () => {
  it('returns the updated appointment on success', async () => {
    invoke.mockResolvedValueOnce({
      data: {
        appointment: {
          id: 'appt-123',
          status: 'confirmed',
          starts_at: '2026-05-12T14:00:00Z',
        },
      },
      error: null,
    });
    const appt = await rescheduleByToken('plaintext', '2026-05-12T14:00:00Z');
    expect(appt.starts_at).toBe('2026-05-12T14:00:00Z');
  });

  it('maps slot_taken to SlotTakenError', async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'slot_taken' },
    });
    await expect(
      rescheduleByToken('plaintext', '2026-05-12T14:00:00Z'),
    ).rejects.toBeInstanceOf(SlotTakenError);
  });

  it('maps invalid_token to InvalidManageTokenError', async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'invalid_token' },
    });
    await expect(
      rescheduleByToken('bad', '2026-05-12T14:00:00Z'),
    ).rejects.toBeInstanceOf(InvalidManageTokenError);
  });
});
