import type { DispatchVars, Locale } from './dispatchers/types.ts';

type Strings = Record<Locale, Record<string, string>>;

const SUBJECTS: Strings = {
  en: {
    booked: 'Your booking is confirmed',
    confirmed: 'Your appointment is confirmed',
    cancelled: 'Your appointment was cancelled',
    rescheduled: 'Your appointment was rescheduled',
    reminder_24h: 'Reminder: appointment in 24 hours',
    reminder_1h: 'Reminder: appointment in 1 hour',
  },
  ar: {
    booked: 'تم تأكيد حجزك',
    confirmed: 'تم تأكيد موعدك',
    cancelled: 'تم إلغاء موعدك',
    rescheduled: 'تم تغيير موعدك',
    reminder_24h: 'تذكير: موعدك خلال ٢٤ ساعة',
    reminder_1h: 'تذكير: موعدك خلال ساعة',
  },
};

function bodyEn(event: string, v: DispatchVars): string {
  switch (event) {
    case 'booked':
      return `Hi ${v.recipient_name},\n\nYour booking with ${v.tenant_name} is confirmed.\n\nService: ${v.service_name}\nWhen: ${v.starts_at_display}\nDuration: ${v.duration_minutes} minutes\n\n${v.manage_link ? `Manage your booking: ${v.manage_link}\n\n` : ''}Thank you for booking with us.`;
    case 'confirmed':
      return `Hi ${v.recipient_name},\n\nYour appointment at ${v.tenant_name} is now confirmed for ${v.starts_at_display}.\n\nSee you soon.`;
    case 'cancelled':
      return `Hi ${v.recipient_name},\n\nYour appointment at ${v.tenant_name} on ${v.starts_at_display} was cancelled.\n\nIf this wasn't you, please contact ${v.tenant_name}.`;
    case 'rescheduled':
      return `Hi ${v.recipient_name},\n\nYour appointment at ${v.tenant_name} has been rescheduled.\n\nNew time: ${v.starts_at_display}\n\n${v.manage_link ? `Manage your booking: ${v.manage_link}` : ''}`;
    case 'reminder_24h':
      return `Hi ${v.recipient_name},\n\nThis is a reminder that you have an appointment with ${v.tenant_name} tomorrow at ${v.starts_at_display}.\n\nSee you then.`;
    case 'reminder_1h':
      return `Hi ${v.recipient_name},\n\nQuick reminder — your appointment with ${v.tenant_name} starts in about an hour (${v.starts_at_display}).`;
    default:
      return `Update for your booking with ${v.tenant_name}.`;
  }
}

function bodyAr(event: string, v: DispatchVars): string {
  switch (event) {
    case 'booked':
      return `أهلاً ${v.recipient_name}،\n\nتم تأكيد حجزك في ${v.tenant_name}.\n\nالخدمة: ${v.service_name}\nالموعد: ${v.starts_at_display}\nالمدة: ${v.duration_minutes} دقيقة\n\n${v.manage_link ? `إدارة الحجز: ${v.manage_link}\n\n` : ''}شكراً لاختيارك خدمتنا.`;
    case 'confirmed':
      return `أهلاً ${v.recipient_name}،\n\nتم تأكيد موعدك في ${v.tenant_name} يوم ${v.starts_at_display}.\n\nبانتظارك.`;
    case 'cancelled':
      return `أهلاً ${v.recipient_name}،\n\nتم إلغاء موعدك في ${v.tenant_name} (${v.starts_at_display}).\n\nإن لم يكن هذا أنت، يرجى التواصل مع ${v.tenant_name}.`;
    case 'rescheduled':
      return `أهلاً ${v.recipient_name}،\n\nتم تغيير موعدك في ${v.tenant_name}.\n\nالموعد الجديد: ${v.starts_at_display}\n\n${v.manage_link ? `إدارة الحجز: ${v.manage_link}` : ''}`;
    case 'reminder_24h':
      return `أهلاً ${v.recipient_name}،\n\nتذكير أن لديك موعداً غداً في ${v.tenant_name} الساعة ${v.starts_at_display}.`;
    case 'reminder_1h':
      return `أهلاً ${v.recipient_name}،\n\nتذكير سريع — موعدك في ${v.tenant_name} يبدأ خلال نحو ساعة (${v.starts_at_display}).`;
    default:
      return `تحديث لحجزك في ${v.tenant_name}.`;
  }
}

function htmlWrap(body: string): string {
  // Minimal, deliverable-friendly HTML. No remote assets, no inline styles
  // that trigger spam filters. Plain text in a div for now.
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  return `<!doctype html><html><body><div style="font-family:system-ui,sans-serif;line-height:1.5">${escaped}</div></body></html>`;
}

export function emailContent(event: string, locale: Locale, vars: DispatchVars) {
  const text = locale === 'ar' ? bodyAr(event, vars) : bodyEn(event, vars);
  const subject = SUBJECTS[locale][event] ?? SUBJECTS[locale].booked;
  return { subject, text, html: htmlWrap(text) };
}

export function whatsappParams(event: string, vars: DispatchVars): string[] {
  // Mapping for the existing `event_notification` template:
  //   {{1}} action, {{2}} tenant_name, {{3}} appointment_date_time
  return [event, vars.tenant_name, vars.starts_at_display];
}

export function pushContent(event: string, locale: Locale, vars: DispatchVars) {
  return {
    title: SUBJECTS[locale][event] ?? SUBJECTS[locale].booked,
    body: locale === 'ar' ? bodyAr(event, vars).split('\n')[0]! : bodyEn(event, vars).split('\n')[0]!,
  };
}
