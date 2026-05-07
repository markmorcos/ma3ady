// We control the EXPO_PUBLIC_CLIENT_ERROR_SAMPLE_RATE before requiring the
// module so the cached SAMPLE_RATE picks up our value.

const mockInvoke = jest.fn();
jest.mock('@/services/api/supabase', () => ({
  supabase: { functions: { invoke: mockInvoke } },
}));

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue({ data: null, error: null });
  jest.resetModules();
});

function loadWithRate(rate: string | undefined) {
  if (rate === undefined) delete process.env.EXPO_PUBLIC_CLIENT_ERROR_SAMPLE_RATE;
  else process.env.EXPO_PUBLIC_CLIENT_ERROR_SAMPLE_RATE = rate;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../logError') as typeof import('../logError');
}

describe('logError sampling', () => {
  it('always reports boundary errors regardless of sample rate', async () => {
    const { logError } = loadWithRate('0');
    await logError(new Error('boom'), { kind: 'boundary' });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('drops non-boundary errors when sample rate is 0', async () => {
    const { logError } = loadWithRate('0');
    await logError(new Error('boom'), { kind: 'manual' });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('reports non-boundary errors when sample rate is 1', async () => {
    const { logError } = loadWithRate('1');
    await logError(new Error('boom'), { kind: 'manual' });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('respects fractional rates via Math.random', async () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.05); // < 0.1
    const { logError } = loadWithRate('0.1');
    await logError(new Error('boom'), { kind: 'manual' });
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    spy.mockReturnValue(0.5); // > 0.1
    mockInvoke.mockClear();
    await logError(new Error('boom'), { kind: 'manual' });
    expect(mockInvoke).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('logError shape', () => {
  it('truncates long messages to 2KB and stack to 8KB', async () => {
    const { logError } = loadWithRate('1');
    const big = 'x'.repeat(20_000);
    const err = new Error(big);
    err.stack = big;
    await logError(err, { kind: 'manual' });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    const body = mockInvoke.mock.calls[0][1].body;
    expect(body.message.length).toBeLessThanOrEqual(2048);
    expect(body.stack.length).toBeLessThanOrEqual(8192);
  });

  it('forwards context payload + tenant_id', async () => {
    const { logError } = loadWithRate('1');
    await logError(new Error('boom'), {
      kind: 'manual',
      context: { route: '/x' },
      tenantId: 't1',
    });
    const body = mockInvoke.mock.calls[0][1].body;
    expect(body.payload).toEqual({ route: '/x' });
    expect(body.tenant_id).toBe('t1');
    expect(body.kind).toBe('manual');
  });

  it('does not throw if invoke rejects', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('network'));
    const { logError } = loadWithRate('1');
    await expect(
      logError(new Error('boom'), { kind: 'manual' }),
    ).resolves.toBeUndefined();
  });
});
