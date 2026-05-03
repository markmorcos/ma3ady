import { log } from '../log.ts';
import type { PushDispatcher, PushMessage } from './types.ts';

declare const Deno: { env: { get(name: string): string | undefined } };

export class MockPushDispatcher implements PushDispatcher {
  async send(msg: PushMessage): Promise<{ provider_id: string }> {
    log({
      event: 'push_mock_sent',
      level: 'info',
      to: msg.to,
      title: msg.title,
    });
    return { provider_id: `mock-push-${crypto.randomUUID()}` };
  }
}

/**
 * Stub for the real Expo push relay. Wired up in setup-compliance-and-launch
 * once a dev client / production build registers actual push tokens.
 */
export class ExpoPushDispatcher implements PushDispatcher {
  async send(_msg: PushMessage): Promise<{ provider_id: string }> {
    throw new Error('expo_push_not_configured');
  }
}

export function getPushDispatcher(): PushDispatcher {
  const mode = Deno.env.get('PUSH_DISPATCHER') ?? 'mock';
  if (mode === 'real') {
    return new ExpoPushDispatcher();
  }
  return new MockPushDispatcher();
}
