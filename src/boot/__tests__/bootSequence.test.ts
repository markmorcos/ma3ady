import { runBootSequence } from '../bootSequence';
import { useAppStore } from '@/state/appStore';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('runBootSequence', () => {
  beforeEach(() => {
    useAppStore.setState({ bootPhase: 'i18n', bootError: null });
  });

  it('advances through every phase to ready on the happy path', async () => {
    const order: string[] = [];
    await runBootSequence({
      config: async () => {
        order.push('config');
      },
      i18n: async () => {
        order.push('i18n');
      },
      theme: async () => {
        order.push('theme');
      },
      auth: async () => {
        order.push('auth');
      },
      tenant: async () => {
        order.push('tenant');
      },
    });
    expect(order).toEqual(['config', 'i18n', 'theme', 'auth', 'tenant']);
    expect(useAppStore.getState().bootPhase).toBe('ready');
  });

  it('drops to degraded on a hung phase', async () => {
    const promise = runBootSequence(
      {
        config: async () => undefined,
        i18n: async () => undefined,
        theme: async () => undefined,
        auth: () => new Promise<void>(() => undefined),
        tenant: async () => undefined,
      },
      50,
    );
    await flush();
    await promise;
    expect(useAppStore.getState().bootPhase).toBe('degraded');
    expect(useAppStore.getState().bootError?.message).toMatch(/auth/i);
  });

  it('drops to degraded on a thrown phase', async () => {
    await runBootSequence(
      {
        config: async () => undefined,
        i18n: async () => undefined,
        theme: async () => undefined,
        auth: async () => {
          throw new Error('boom');
        },
        tenant: async () => undefined,
      },
      1000,
    );
    expect(useAppStore.getState().bootPhase).toBe('degraded');
    expect(useAppStore.getState().bootError?.message).toBe('boom');
  });
});
