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
 * Real Expo push relay. Posts to Expo's push API; treats the response status
 * as authoritative and bubbles up the provider id (`receipt id` once we
 * implement receipt polling, otherwise the message hash).
 *
 * Caller passes one ExpoPushToken (`ExponentPushToken[xxx]`) at a time. To
 * support multi-device fanout the caller iterates over `push_tokens` rows.
 */
export class ExpoPushDispatcher implements PushDispatcher {
  private readonly endpoint = 'https://exp.host/--/api/v2/push/send';

  async send(msg: PushMessage): Promise<{ provider_id: string }> {
    if (!msg.to.startsWith('ExponentPushToken[') && !msg.to.startsWith('ExpoPushToken[')) {
      throw new Error('expo_push_invalid_token');
    }
    const body = [
      {
        to: msg.to,
        sound: 'default',
        title: msg.title,
        body: msg.body,
        data: msg.data ?? {},
      },
    ];
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'accept-encoding': 'gzip, deflate',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      log({
        event: 'expo_push_failed',
        level: 'error',
        status: res.status,
        body: text.slice(0, 1024),
      });
      throw new Error(`expo_push_http_${res.status}`);
    }
    const json = (await res.json()) as { data?: Array<{ status: string; id?: string; message?: string }> };
    const ticket = json.data?.[0];
    if (!ticket || ticket.status !== 'ok') {
      log({
        event: 'expo_push_ticket_error',
        level: 'error',
        ticket: ticket ?? null,
      });
      throw new Error(`expo_push_ticket_${ticket?.status ?? 'missing'}`);
    }
    return { provider_id: ticket.id ?? `expo-${crypto.randomUUID()}` };
  }
}

export function getPushDispatcher(): PushDispatcher {
  const mode = Deno.env.get('PUSH_DISPATCHER') ?? 'mock';
  if (mode === 'real') {
    return new ExpoPushDispatcher();
  }
  return new MockPushDispatcher();
}
