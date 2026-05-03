import { useAppStore, type BootPhase } from '@/state/appStore';
import { PhaseTimeoutError, runPhase } from './runPhase';

export type PhaseRunners = {
  i18n: () => Promise<void>;
  theme: () => Promise<void>;
  auth: () => Promise<void>;
  tenant: () => Promise<void>;
};

const ORDER: Exclude<BootPhase, 'ready' | 'degraded'>[] = ['i18n', 'theme', 'auth', 'tenant'];

export async function runBootSequence(runners: PhaseRunners, timeoutMs = 5000): Promise<void> {
  const { setBootPhase, setBootError } = useAppStore.getState();
  setBootError(null);
  for (const phase of ORDER) {
    setBootPhase(phase);
    try {
      await runPhase(phase, runners[phase], timeoutMs);
    } catch (err) {
      setBootError(err as Error);
      setBootPhase('degraded');
      if (!(err instanceof PhaseTimeoutError)) {
        console.error(`[boot] phase "${phase}" failed`, err);
      }
      return;
    }
  }
  setBootPhase('ready');
}
