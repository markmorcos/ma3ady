// Minimal RFC 5545 .ics generator for booking confirmation calendar attachments.
// The receiving calendar app handles the timezone conversion; we always emit
// UTC values with a TZID hint matching the tenant's IANA timezone for display.

type IcsEvent = {
  uid: string;
  startsAt: Date;
  endsAt: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  tenantTimezone: string;
};

function toUtcStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function buildIcs(event: IcsEvent): string {
  const now = toUtcStamp(new Date());
  const dtStart = toUtcStamp(event.startsAt);
  const dtEnd = toUtcStamp(event.endsAt);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ma3ady//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    `X-WR-TIMEZONE:${event.tenantTimezone}`,
    'BEGIN:VEVENT',
    `UID:${event.uid}@ma3ady`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escape(event.summary)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escape(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escape(event.location)}`);
  if (event.url) lines.push(`URL:${escape(event.url)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
