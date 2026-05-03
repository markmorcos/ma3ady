export class PhaseTimeoutError extends Error {
  constructor(public readonly phase: string) {
    super(`Boot phase "${phase}" timed out`);
    this.name = 'PhaseTimeoutError';
  }
}

export function runPhase<T>(
  phase: string,
  fn: () => Promise<T>,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new PhaseTimeoutError(phase)), timeoutMs);
    fn().then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
