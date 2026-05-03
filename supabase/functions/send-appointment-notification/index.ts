// send-appointment-notification Edge Function (Deno).
//
// Triggered (today) by direct invocation from the report flows. The eventual
// pg_net trigger from `appointment_events` writes a queued `notifications`
// row that this function picks up. For idempotency, we skip if a queued/sent
// row already exists for (appointment_id, channel, event).

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import {
  getEmailDispatcher,
  getPushDispatcher,
  getWhatsappDispatcher,
  type DispatchVars,
  type Locale,
} from '../_shared/dispatchers/index.ts';
import { buildIcs } from '../_shared/ics.ts';
import { log } from '../_shared/log.ts';
import { emailContent, pushContent, whatsappParams } from '../_shared/templates.ts';
import { withLogging } from '../_shared/withLogging.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

type Input = {
  appointment_id: string;
  event: string;
};

const NOTIFY_EVENTS = new Set([
  'booked',
  'confirmed',
  'cancelled',
  'rescheduled',
  'reminder_24h',
  'reminder_1h',
]);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function formatDateTime(iso: string, timezone: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en-GB', {
    timeZone: timezone,
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function base64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

Deno.serve(
  withLogging('send-appointment-notification', async (req, { requestId }) => {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405);
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'not_configured' }, 500);
    }

    let body: Input;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'invalid_json' }, 400);
    }
    if (!body.appointment_id || !body.event) {
      return jsonResponse({ error: 'missing_fields' }, 400);
    }
    if (!NOTIFY_EVENTS.has(body.event)) {
      return jsonResponse({ ok: true, skipped: 'no_notification_for_event' });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    try {
      await admin.rpc('set_app_context' as any, {
        p_request_id: requestId,
        p_is_guest_token: false,
      } as any);
    } catch {
      /* best-effort */
    }

    const { data: appt, error: apptErr } = await admin
      .from('appointments')
      .select(
        'id, tenant_id, service_id, user_id, guest_contact_id, starts_at, ends_at, status',
      )
      .eq('id', body.appointment_id)
      .single();
    if (apptErr || !appt) {
      return jsonResponse({ error: 'appointment_not_found' }, 404);
    }

    const { data: tenant } = await admin
      .from('tenants')
      .select('name, timezone, default_locale, slug')
      .eq('id', appt.tenant_id)
      .single();
    const { data: service } = await admin
      .from('services')
      .select('name, duration_minutes')
      .eq('id', appt.service_id)
      .single();

    type RecipientShape = {
      email: string | null;
      phone: string | null;
      name: string;
      locale: Locale;
    };
    let recipient: RecipientShape | null = null;
    if (appt.user_id) {
      const { data: profile } = await admin
        .from('profiles')
        .select('full_name, locale')
        .eq('id', appt.user_id)
        .single();
      const { data: { user } = { user: null } } = await admin.auth.admin.getUserById(appt.user_id);
      recipient = {
        email: user?.email ?? null,
        phone: null,
        name: profile?.full_name ?? user?.email ?? 'there',
        locale: ((profile?.locale ?? tenant?.default_locale ?? 'en') as Locale) ?? 'en',
      };
    } else if (appt.guest_contact_id) {
      const { data: guest } = await admin
        .from('guest_contacts')
        .select('name, email, phone, locale')
        .eq('id', appt.guest_contact_id)
        .single();
      if (guest) {
        recipient = {
          email: guest.email,
          phone: guest.phone,
          name: guest.name,
          locale: ((guest.locale ?? tenant?.default_locale ?? 'en') as Locale) ?? 'en',
        };
      }
    }

    if (!recipient || !tenant || !service) {
      log({
        event: 'notification_skipped_missing_recipient',
        request_id: requestId,
        appointment_id: appt.id,
      });
      return jsonResponse({ ok: true, skipped: 'no_recipient' });
    }

    const tz = tenant.timezone ?? 'UTC';
    const display = formatDateTime(appt.starts_at, tz, recipient.locale);

    const vars: DispatchVars = {
      recipient_name: recipient.name,
      tenant_name: tenant.name,
      service_name: service.name,
      starts_at_iso: appt.starts_at,
      starts_at_display: display,
      duration_minutes: service.duration_minutes,
    };

    // Idempotency check: skip channels with an existing queued/sent row.
    const { data: existing } = await admin
      .from('notifications')
      .select('id, channel, status')
      .eq('appointment_id', appt.id)
      .eq('event', body.event);
    const sentChannels = new Set(
      (existing ?? [])
        .filter((r) => r.status === 'queued' || r.status === 'sent')
        .map((r) => r.channel),
    );

    const results: Record<string, { status: string; provider_id?: string; error?: string }> = {};

    // Email — always attempted if we have an address.
    if (recipient.email && !sentChannels.has('email')) {
      const { subject, text, html } = emailContent(body.event, recipient.locale, vars);
      const ics = buildIcs({
        uid: appt.id,
        startsAt: new Date(appt.starts_at),
        endsAt: new Date(appt.ends_at),
        summary: `${tenant.name} — ${service.name}`,
        description: text,
        tenantTimezone: tz,
      });

      const { data: row } = await admin
        .from('notifications')
        .insert({
          appointment_id: appt.id,
          channel: 'email',
          event: body.event,
          status: 'queued',
          payload: { subject, locale: recipient.locale },
        })
        .select('id')
        .single();
      try {
        const dispatcher = getEmailDispatcher();
        const r = await dispatcher.send({
          to: recipient.email,
          subject,
          html,
          text,
          attachments: [
            {
              filename: 'invite.ics',
              content: base64(ics),
              contentType: 'text/calendar',
            },
          ],
        });
        await admin
          .from('notifications')
          .update({
            status: 'sent',
            provider_id: r.provider_id,
            sent_at: new Date().toISOString(),
          })
          .eq('id', row?.id);
        results.email = { status: 'sent', provider_id: r.provider_id };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await admin
          .from('notifications')
          .update({ status: 'failed', error: msg })
          .eq('id', row?.id);
        results.email = { status: 'failed', error: msg };
      }
    }

    // WhatsApp — only if we have a phone number.
    if (recipient.phone && !sentChannels.has('whatsapp')) {
      const params = whatsappParams(body.event, vars);
      const templateName = Deno.env.get('WHATSAPP_TEMPLATE_NAME') ?? 'event_notification';
      const { data: row } = await admin
        .from('notifications')
        .insert({
          appointment_id: appt.id,
          channel: 'whatsapp',
          event: body.event,
          status: 'queued',
          payload: { template: templateName, params, locale: recipient.locale },
        })
        .select('id')
        .single();
      try {
        const dispatcher = getWhatsappDispatcher();
        const r = await dispatcher.send({
          to: recipient.phone,
          template: templateName,
          params,
          locale: recipient.locale,
        });
        await admin
          .from('notifications')
          .update({
            status: 'sent',
            provider_id: r.provider_id,
            sent_at: new Date().toISOString(),
          })
          .eq('id', row?.id);
        results.whatsapp = { status: 'sent', provider_id: r.provider_id };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await admin
          .from('notifications')
          .update({ status: 'failed', error: msg })
          .eq('id', row?.id);
        results.whatsapp = { status: 'failed', error: msg };
      }
    }

    // Push — mock writes a row, real impl deferred.
    if (!sentChannels.has('push')) {
      const { title, body: pushBody } = pushContent(body.event, recipient.locale, vars);
      const { data: row } = await admin
        .from('notifications')
        .insert({
          appointment_id: appt.id,
          channel: 'push',
          event: body.event,
          status: 'queued',
          payload: { title, body: pushBody, locale: recipient.locale },
        })
        .select('id')
        .single();
      try {
        const dispatcher = getPushDispatcher();
        const r = await dispatcher.send({
          to: appt.user_id ?? '',
          title,
          body: pushBody,
        });
        await admin
          .from('notifications')
          .update({
            status: 'sent',
            provider_id: r.provider_id,
            sent_at: new Date().toISOString(),
          })
          .eq('id', row?.id);
        results.push = { status: 'sent', provider_id: r.provider_id };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await admin
          .from('notifications')
          .update({ status: 'failed', error: msg })
          .eq('id', row?.id);
        results.push = { status: 'failed', error: msg };
      }
    }

    return jsonResponse({ ok: true, request_id: requestId, results });
  }),
);
