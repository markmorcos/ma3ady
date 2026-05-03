import { runBootSequence } from '@/boot/bootSequence';
import { useAppStore } from '@/state/appStore';

const phaseLatencyMs = 100;
const wait = (ms: number): Promise<void> =>
  new Promise<void>((r) => setTimeout(r, ms));

describe('boot perf budget', () => {
  beforeEach(() => {
    useAppStore.setState({ bootPhase: 'i18n', bootError: null });
  });

  it('completes within a 1500ms synthetic budget when each phase takes 100ms', async () => {
    const start = Date.now();
    await runBootSequence({
      i18n: () => wait(phaseLatencyMs),
      theme: () => wait(phaseLatencyMs),
      auth: () => wait(phaseLatencyMs),
      tenant: () => wait(phaseLatencyMs),
    });
    const elapsed = Date.now() - start;
    expect(useAppStore.getState().bootPhase).toBe('ready');
    expect(elapsed).toBeLessThan(1500);
  });
});
