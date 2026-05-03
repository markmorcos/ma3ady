import { log } from '../log.ts';
import type { WhatsappDispatcher, WhatsappMessage } from './types.ts';

declare const Deno: { env: { get(name: string): string | undefined } };

export class MockWhatsappDispatcher implements WhatsappDispatcher {
  async send(msg: WhatsappMessage): Promise<{ provider_id: string }> {
    log({
      event: 'whatsapp_mock_sent',
      level: 'info',
      to: msg.to,
      template: msg.template,
      params: msg.params,
    });
    return { provider_id: `mock-wa-${crypto.randomUUID()}` };
  }
}

export class MetaWhatsappDispatcher implements WhatsappDispatcher {
  constructor(
    private readonly accessToken: string,
    private readonly phoneNumberId: string,
  ) {}

  async send(msg: WhatsappMessage): Promise<{ provider_id: string }> {
    const url = `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: msg.to,
        type: 'template',
        template: {
          name: msg.template,
          language: { code: msg.locale === 'ar' ? 'ar' : 'en' },
          components: [
            {
              type: 'body',
              parameters: msg.params.map((value) => ({
                type: 'text',
                text: value,
              })),
            },
          ],
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`whatsapp_send_failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as {
      messages?: { id: string }[];
    };
    return { provider_id: data.messages?.[0]?.id ?? '' };
  }
}

export function getWhatsappDispatcher(): WhatsappDispatcher {
  const mode = Deno.env.get('WHATSAPP_DISPATCHER') ?? 'mock';
  if (mode === 'real') {
    const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    if (!token || !phoneId) {
      throw new Error(
        'whatsapp_dispatcher_real_missing_env: WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID',
      );
    }
    return new MetaWhatsappDispatcher(token, phoneId);
  }
  return new MockWhatsappDispatcher();
}
