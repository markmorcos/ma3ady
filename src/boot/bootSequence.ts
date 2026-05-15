import { useAppStore, type BootPhase } from '@/state/appStore';
import { PhaseTimeoutError, runPhase } from './runPhase';

export type PhaseRunners = {
  config: () => Promise<void>;
  i18n: () => Promise<void>;
  theme: () => Promise<void>;
  auth: () => Promise<void>;
  tenant: () => Promise<void>;
};

const ORDER: Exclude<BootPhase, 'ready' | 'degraded' | 'misconfigured'>[] = [
  'config',
  'i18n',
  'theme',
  'auth',
  'tenant',
];

export async function runBootSequence(runners: PhaseRunners, timeoutMs = 5000): Promise<void> {
  const { setBootPhase, setBootError } = useAppStore.getState();
  setBootError(null);
  for (const phase of ORDER) {
    setBootPhase(phase);
    try {
      await runPhase(phase, runners[phase], timeoutMs);
    } catch (err) {
      setBootError(err as Error);
      // A failed `config` phase means the build itself is unusable (e.g.
      // missing EXPO_PUBLIC_SUPABASE_URL) -- route to the misconfigured
      // diagnostic instead of the generic degraded state.
      setBootPhase(phase === 'config' ? 'misconfigured' : 'degraded');
      if (!(err instanceof PhaseTimeoutError)) {
        console.error(`[boot] phase "${phase}" failed`, err);
      }
      return;
    }
  }
  setBootPhase('ready');
}
