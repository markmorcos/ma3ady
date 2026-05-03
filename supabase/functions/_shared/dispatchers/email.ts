import { log } from '../log.ts';
import type { EmailDispatcher, EmailMessage } from './types.ts';

declare const Deno: { env: { get(name: string): string | undefined } };

export class MockEmailDispatcher implements EmailDispatcher {
  async send(msg: EmailMessage): Promise<{ provider_id: string }> {
    log({
      event: 'email_mock_sent',
      level: 'info',
      to: msg.to,
      subject: msg.subject,
    });
    return { provider_id: `mock-email-${crypto.randomUUID()}` };
  }
}

export class ResendEmailDispatcher implements EmailDispatcher {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(msg: EmailMessage): Promise<{ provider_id: string }> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: this.from,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        attachments: msg.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          content_type: a.contentType,
        })),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`resend_send_failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as { id: string };
    return { provider_id: data.id };
  }
}

export function getEmailDispatcher(): EmailDispatcher {
  const mode = Deno.env.get('EMAIL_DISPATCHER') ?? 'mock';
  if (mode === 'real') {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('RESEND_FROM');
    if (!apiKey || !from) {
      throw new Error('email_dispatcher_real_missing_env: RESEND_API_KEY/RESEND_FROM');
    }
    return new ResendEmailDispatcher(apiKey, from);
  }
  return new MockEmailDispatcher();
}
