import { logError } from './logError';

declare const ErrorUtils: {
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
};

/**
 * Wires JS-runtime error handlers to logError. Idempotent — calling twice is
 * safe but a no-op the second time.
 */
let installed = false;

export function setupGlobalHandlers(): void {
  if (installed) return;
  installed = true;

  if (typeof ErrorUtils !== 'undefined') {
    const previous = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      void logError(error, {
        kind: 'unhandled_rejection',
        context: { isFatal: !!isFatal },
      });
      previous?.(error, isFatal);
    });
  }
}
