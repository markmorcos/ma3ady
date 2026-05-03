// Structured logging helper for Edge Functions. JSON-stringifies a single
// line per log call so Supabase Logs can filter by event/request_id/level.

type Level = 'info' | 'warn' | 'error';

type LogPayload = {
  event: string;
  level?: Level;
  request_id?: string;
  [key: string]: unknown;
};

const MAX_FIELD = 2048;

function truncate(value: unknown): unknown {
  if (typeof value === 'string' && value.length > MAX_FIELD) {
    return value.slice(0, MAX_FIELD) + '… [truncated]';
  }
  return value;
}

export function log(payload: LogPayload): void {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    out[k] = truncate(v);
  }
  if (!('level' in out)) out.level = 'info';
  // single-line JSON so Supabase log explorer parses each as a structured row.
  // deno-lint-ignore no-console
  console.log(JSON.stringify(out));
}
