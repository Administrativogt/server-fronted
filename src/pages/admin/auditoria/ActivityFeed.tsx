import React, { useMemo } from 'react';
import { Tooltip, Typography } from 'antd';
import type { Tokens } from '../../dashboard/theme';
import { DANGER, INFO, PRIMARY, SUCCESS, WARNING } from '../../dashboard/theme';
import { FEED_SHAPES, dayLabel, hueFor, parsePerson, timeLabel, type FeedItem, type FeedTone } from './feed';

const { Text } = Typography;

const TONE_COLOR: Record<FeedTone, string> = {
  neutral: PRIMARY,
  ok: SUCCESS,
  warn: WARNING,
  bad: DANGER,
  info: INFO,
};

/**
 * Avatar de iniciales con color determinista por persona. Fondo tintado y
 * texto en tinta para cumplir contraste en ambos temas (no texto blanco sobre
 * color saturado).
 */
export const PersonAvatar: React.FC<{ who: string | null; isDark: boolean; size?: number }> = ({ who, isDark, size = 34 }) => {
  const p = parsePerson(who);
  const hue = hueFor(p?.code ?? p?.name ?? '?');
  const bg = isDark ? `hsl(${hue} 35% 26%)` : `hsl(${hue} 70% 90%)`;
  const fg = isDark ? `hsl(${hue} 60% 85%)` : `hsl(${hue} 55% 28%)`;
  return (
    <Tooltip title={p ? `${p.name}${p.code ? ` · ${p.code}` : ''}` : 'Sin usuario registrado'}>
      <span
        aria-hidden
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: bg,
          color: fg,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.round(size * 0.38),
          fontWeight: 700,
          letterSpacing: '0.02em',
          flex: '0 0 auto',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {p ? p.initials : '?'}
      </span>
    </Tooltip>
  );
};

const Pill: React.FC<{ label: string; tone: FeedTone; tk: Tokens; isDark: boolean }> = ({ label, tone, tk, isDark }) => {
  const c = TONE_COLOR[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '1px 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color: tk.t1,
        background: isDark ? `color-mix(in oklab, ${c} 22%, ${tk.surface})` : `color-mix(in oklab, ${c} 14%, ${tk.surface})`,
        border: `1px solid color-mix(in oklab, ${c} 45%, transparent)`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 3, background: c, flex: '0 0 auto' }} />
      {label}
    </span>
  );
};

interface Props {
  rows: Record<string, unknown>[];
  queryKey: string;
  tk: Tokens;
  isDark: boolean;
  /** Menos aire (para la tarjeta de actividad reciente). */
  compact?: boolean;
}

/**
 * Vista de lista narrativa: agrupada por día, con avatar de la persona, título
 * de una línea, metadatos y el motivo como cita. Es la misma información que la
 * tabla, leída como historia en vez de como hoja de cálculo.
 */
const ActivityFeed: React.FC<Props> = ({ rows, queryKey, tk, isDark, compact }) => {
  const shape = FEED_SHAPES[queryKey];
  const groups = useMemo(() => {
    if (!shape) return [];
    const items = rows.map(shape);
    const map = new Map<string, FeedItem[]>();
    for (const it of items) {
      const k = dayLabel(it.when);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return [...map.entries()];
  }, [rows, shape]);

  if (!shape) return null;

  return (
    <div className="audit-feed">
      <style>{`
        .audit-feed .audit-day { position: sticky; top: 0; z-index: 1; padding: ${compact ? '6px 0 4px' : '10px 0 6px'}; background: ${tk.surface}; display:flex; align-items:center; gap:10px; }
        .audit-feed .audit-day::after { content:''; flex:1; height:1px; background:${tk.divider}; }
        .audit-feed .audit-item { display:grid; grid-template-columns: 52px 34px 1fr; gap: 0 12px; padding: ${compact ? '8px 0' : '12px 0'}; border-bottom: 1px solid ${tk.divider}; align-items:start;
          animation: auditIn .32s cubic-bezier(.22,1,.36,1) both; }
        .audit-feed .audit-item:last-child { border-bottom: 0; }
        .audit-feed .audit-item:nth-child(n+2) { animation-delay: calc(var(--i, 0) * 28ms); }
        .audit-feed .audit-time { font-variant-numeric: tabular-nums; color: ${tk.t2}; font-size: 13px; padding-top: 7px; }
        .audit-feed .audit-title { color: ${tk.t1}; font-weight: 600; font-size: 14px; line-height: 1.35; }
        .audit-feed .audit-meta { color: ${tk.t2}; font-size: 13px; line-height: 1.45; margin-top: 2px; }
        .audit-feed .audit-note { margin-top: 6px; padding: 6px 10px; border-radius: 6px; background: ${tk.subtle}; color: ${tk.t1}; font-size: 13px; font-style: italic; border: 1px solid ${tk.divider}; max-width: 72ch; }
        @keyframes auditIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .audit-feed .audit-item { animation: none; } }
        @media (max-width: 640px) { .audit-feed .audit-item { grid-template-columns: 34px 1fr; } .audit-feed .audit-time { grid-column: 2; padding-top: 0; order: 3; } }
      `}</style>
      {groups.map(([day, items]) => (
        <section key={day} aria-label={day}>
          <div className="audit-day">
            <Text strong style={{ fontSize: 13, color: tk.t1 }}>
              {day}
            </Text>
            <Text style={{ fontSize: 12, color: tk.t3 }}>{items.length}</Text>
          </div>
          {items.map((it, i) => {
            const person = parsePerson(it.who);
            return (
              <article key={`${day}-${i}`} className="audit-item" style={{ ['--i' as string]: i }}>
                <div className="audit-time">{timeLabel(it.when) || '—'}</div>
                <PersonAvatar who={it.who} isDark={isDark} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'center' }}>
                    <span className="audit-title">{it.title}</span>
                    {it.badge && <Pill label={it.badge} tone={it.tone} tk={tk} isDark={isDark} />}
                  </div>
                  <div className="audit-meta">
                    {person && (
                      <>
                        <Text strong style={{ color: tk.t1, fontWeight: 600 }}>
                          {person.name}
                        </Text>
                        {person.code && <Text style={{ color: tk.t3 }}> {person.code}</Text>}
                        {it.meta.filter(Boolean).length > 0 && ' · '}
                      </>
                    )}
                    {it.meta.filter(Boolean).join(' · ')}
                  </div>
                  {it.note && <div className="audit-note">“{it.note}”</div>}
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
};

export default ActivityFeed;
