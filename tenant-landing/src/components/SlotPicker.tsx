'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Slot = { starts_at: string; ends_at: string };

type Props = {
  tenantSlug: string;
  serviceId: string;
  durationMinutes: number;
  tenantTimezone: string;
  locale: 'en' | 'ar';
  supabaseUrl: string;
  supabaseAnonKey: string;
  labels: {
    morning: string;
    afternoon: string;
    evening: string;
    noSlots: string;
    tryNextWeek: string;
    chooseSlot: string;
    tenantTimezone: string;
    yourTimezone: string;
    /** Optional UI tip rendered under the slot grid. */
    scanHint?: string;
  };
  /** Optional override; defaults to navigating to ?starts_at=<iso>. */
  onPick?: (slot: Slot) => void;
};

const WINDOW_DAYS = 14;

function isoDay(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function formatHour(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function bucketOf(iso: string, tz: string): 'morning' | 'afternoon' | 'evening' {
  const h = parseInt(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      hour12: false,
    }).format(new Date(iso)),
    10,
  );
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const BUCKET_GLYPH = {
  morning: '☀︎',
  afternoon: '☼',
  evening: '☾',
} as const;

export function SlotPicker({
  tenantSlug,
  serviceId,
  tenantTimezone,
  locale,
  supabaseUrl,
  supabaseAnonKey,
  labels,
  onPick,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handlePick = useCallback(
    (slot: Slot) => {
      if (onPick) {
        onPick(slot);
        return;
      }
      const next = new URLSearchParams(searchParams?.toString() ?? '');
      next.set('starts_at', slot.starts_at);
      router.push(`?${next.toString()}`);
    },
    [onPick, router, searchParams],
  );
  const [windowStart, setWindowStart] = useState(() => new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showLocalTime, setShowLocalTime] = useState(false);

  const visitorTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const displayTz = showLocalTime ? visitorTz : tenantTimezone;

  const rangeEnd = useMemo(() => {
    const e = new Date(windowStart);
    e.setDate(e.getDate() + WINDOW_DAYS);
    return e;
  }, [windowStart]);

  useEffect(() => {
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await sb.rpc('compute_available_slots', {
          p_tenant_slug: tenantSlug,
          p_service_id: serviceId,
          p_range_start: windowStart.toISOString(),
          p_range_end: rangeEnd.toISOString(),
        });
        if (cancelled) return;
        setSlots(error ? [] : ((data ?? []) as Slot[]));
      } catch {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug, serviceId, supabaseUrl, supabaseAnonKey, windowStart, rangeEnd]);

  const grouped = useMemo(() => {
    const m: Record<string, Slot[]> = {};
    for (const s of slots) {
      const day = isoDay(new Date(s.starts_at), tenantTimezone);
      (m[day] ??= []).push(s);
    }
    return m;
  }, [slots, tenantTimezone]);

  const days: string[] = useMemo(() => {
    const out: string[] = [];
    const d = new Date(windowStart);
    for (let i = 0; i < WINDOW_DAYS; i++) {
      out.push(isoDay(d, tenantTimezone));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [windowStart, tenantTimezone]);

  const day = selectedDay ?? days.find((d) => grouped[d]?.length) ?? days[0]!;
  const slotsForDay = grouped[day] ?? [];

  const buckets: Record<'morning' | 'afternoon' | 'evening', Slot[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };
  for (const s of slotsForDay) buckets[bucketOf(s.starts_at, tenantTimezone)].push(s);

  if (loading && slots.length === 0) {
    return <p className="muted">…</p>;
  }
  if (!loading && slots.length === 0) {
    return (
      <div className="empty-state">
        <p>{labels.noSlots}</p>
        <button
          className="btn btn-tonal"
          type="button"
          onClick={() => {
            const next = new Date(windowStart);
            next.setDate(next.getDate() + WINDOW_DAYS);
            setWindowStart(next);
            setSelectedDay(null);
          }}
        >
          {labels.tryNextWeek}
        </button>
      </div>
    );
  }

  const dayFormatter = new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en-GB', {
    weekday: 'short',
  });

  return (
    <div>
      <div className="row between" style={{ marginBlockEnd: 12 }}>
        <p className="muted" style={{ margin: 0 }}>
          {labels.chooseSlot}
        </p>
        <button
          type="button"
          className={`tz-toggle${showLocalTime ? ' active' : ''}`}
          onClick={() => setShowLocalTime((v) => !v)}
        >
          {showLocalTime
            ? labels.yourTimezone
            : labels.tenantTimezone.replace('{{tz}}', tenantTimezone)}
        </button>
      </div>

      <div className="day-strip" role="tablist">
        {days.map((d) => {
          const date = new Date(`${d}T00:00:00`);
          const free = grouped[d]?.length ?? 0;
          const isClosed = free === 0;
          const active = day === d;
          // Pressure indicator: 1-3 free → warning pill, 4+ → neutral dot,
          // 0 → no glyph (and the cell is disabled).
          let indicator: React.ReactNode = null;
          if (free > 0) {
            indicator = free <= 3 ? <span className="pill" /> : <span className="dot" />;
          }
          return (
            <button
              key={d}
              type="button"
              className="day-button"
              onClick={() => setSelectedDay(d)}
              role="tab"
              aria-selected={active}
              disabled={isClosed && !active}
            >
              <span className="dow">{dayFormatter.format(date)}</span>
              <span className="num">{date.getDate()}</span>
              <span className="indicator">{indicator}</span>
            </button>
          );
        })}
      </div>

      {(['morning', 'afternoon', 'evening'] as const).map((bucket) => {
        const items = buckets[bucket];
        if (items.length === 0) return null;
        return (
          <div className="bucket" key={bucket}>
            <div className="bucket-header">
              <span className={`bucket-icon ${bucket}`} aria-hidden>
                {BUCKET_GLYPH[bucket]}
              </span>
              <h3 className="bucket-title">{labels[bucket]}</h3>
              <span className="bucket-counter">
                {items.length} / {items.length}
              </span>
            </div>
            <div className="slot-grid">
              {items.map((s) => (
                <button
                  key={s.starts_at}
                  type="button"
                  className={`slot-button ${bucket}`}
                  onClick={() => handlePick(s)}
                >
                  {formatHour(s.starts_at, displayTz)}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <div className="row between" style={{ marginBlockStart: 24 }}>
        <button
          type="button"
          className="btn btn-text"
          onClick={() => {
            const prev = new Date(windowStart);
            prev.setDate(prev.getDate() - WINDOW_DAYS);
            if (prev > new Date()) setWindowStart(prev);
          }}
        >
          ‹
        </button>
        <button
          type="button"
          className="btn btn-text"
          onClick={() => {
            const next = new Date(windowStart);
            next.setDate(next.getDate() + WINDOW_DAYS);
            setWindowStart(next);
            setSelectedDay(null);
          }}
        >
          ›
        </button>
      </div>

      {labels.scanHint ? (
        <div className="tip-card">
          <span aria-hidden>☞</span>
          <span>{labels.scanHint}</span>
        </div>
      ) : null}
    </div>
  );
}
