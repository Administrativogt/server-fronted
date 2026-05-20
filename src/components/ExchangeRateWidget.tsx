import React, { useEffect, useState, useCallback } from 'react';
import { DatePicker, Tooltip, Spin, message } from 'antd';
import { ReloadOutlined, SearchOutlined, SwapOutlined } from '@ant-design/icons';
import useThemeStore from '../hooks/useThemeStore';
import dayjs from 'dayjs';
import {
  fetchExchangeRate,
  fetchExchangeHistory,
  fetchRateOnDate,
  type ExchangeRateData,
  type RateEntry,
  type DateLookupResult,
  CURRENCY_INFO,
} from '../api/exchangeRate';

// ── Period options ────────────────────────────────────────────────────────────
const PERIODS = [
  { label: '1S',  days: 7   },
  { label: '1M',  days: 30  },
  { label: '3M',  days: 90  },
  { label: '1A',  days: 365 },
];

const GOLD = '#C9A84C';
const BLUE = '#4D9FE8';

// ── Theme ─────────────────────────────────────────────────────────────────────
interface Theme {
  bg: string;
  wrapBorder: string;
  wrapShadow: string;
  surface: string;
  surfaceHov: string;
  surfaceSel: string;
  border: string;
  borderSel: string;
  text: string;
  textSub: string;
  textMuted: string;
  reloadBg: string;
  reloadBorder: string;
  reloadColor: string;
  divider: string;
  chartOverlay: string;
  gridStroke: string;
  periodActiveBg: string;
  periodActiveBorder: string;
  periodActiveText: string;
  tabInactiveBg: string;
  tabInactiveBorder: string;
  tabInactiveText: string;
  lookupBg: string;
  lookupBorder: string;
  rateNum: string;
  upColor: string;
  upBg: string;
  downColor: string;
  downBg: string;
}

const DARK: Theme = {
  bg:               'linear-gradient(135deg, #0A1628 0%, #0F2044 50%, #0D1E40 100%)',
  wrapBorder:       'none',
  wrapShadow:       '0 8px 32px rgba(0,0,0,0.28)',
  surface:          'rgba(255,255,255,0.04)',
  surfaceHov:       'rgba(255,255,255,0.07)',
  surfaceSel:       'rgba(201,168,76,0.12)',
  border:           'rgba(255,255,255,0.07)',
  borderSel:        GOLD + '40',
  text:             '#ffffff',
  textSub:          'rgba(255,255,255,0.45)',
  textMuted:        'rgba(255,255,255,0.28)',
  reloadBg:         'rgba(255,255,255,0.07)',
  reloadBorder:     'rgba(255,255,255,0.12)',
  reloadColor:      'rgba(255,255,255,0.5)',
  divider:          'rgba(255,255,255,0.07)',
  chartOverlay:     'rgba(10,22,40,0.6)',
  gridStroke:       'rgba(255,255,255,0.06)',
  periodActiveBg:   'rgba(77,159,232,0.22)',
  periodActiveBorder: BLUE + '55',
  periodActiveText: BLUE,
  tabInactiveBg:    'rgba(255,255,255,0.07)',
  tabInactiveBorder:'rgba(255,255,255,0.12)',
  tabInactiveText:  'rgba(255,255,255,0.55)',
  lookupBg:         'rgba(255,255,255,0.06)',
  lookupBorder:     'rgba(255,255,255,0.10)',
  rateNum:          '#ffffff',
  upColor:          '#fca5a5',
  upBg:             'rgba(248,113,113,0.12)',
  downColor:        '#6ee7b7',
  downBg:           'rgba(52,211,153,0.12)',
};

const LIGHT: Theme = {
  bg:               '#FFFFFF',
  wrapBorder:       '1px solid #E2E8F0',
  wrapShadow:       '0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
  surface:          '#F8FAFC',
  surfaceHov:       '#F1F5F9',
  surfaceSel:       '#EFF6FF',
  border:           '#E2E8F0',
  borderSel:        '#3C50E055',
  text:             '#1C2434',
  textSub:          '#64748B',
  textMuted:        '#94A3B8',
  reloadBg:         '#F1F5F9',
  reloadBorder:     '#E2E8F0',
  reloadColor:      '#64748B',
  divider:          '#E2E8F0',
  chartOverlay:     'rgba(255,255,255,0.75)',
  gridStroke:       'rgba(0,0,0,0.06)',
  periodActiveBg:   '#EFF6FF',
  periodActiveBorder: '#3C50E044',
  periodActiveText: '#3C50E0',
  tabInactiveBg:    '#F1F5F9',
  tabInactiveBorder:'#E2E8F0',
  tabInactiveText:  '#64748B',
  lookupBg:         '#F8FAFC',
  lookupBorder:     '#E2E8F0',
  rateNum:          '#1C2434',
  upColor:          '#EF4444',
  upBg:             '#FEF2F2',
  downColor:        '#10B981',
  downBg:           '#ECFDF5',
};

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, color, showGrid, gridColor }: {
  data: RateEntry[]; color: string; showGrid?: boolean; gridColor?: string;
}) {
  if (data.length < 2) return null;
  const W = 340; const H = 80; const PAD = 8;

  const vals = data.map((d) => d.venta);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 0.001;

  const x = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2);

  const line = data.map((d, i) => `${x(i)},${y(d.venta)}`).join(' ');
  const area = [`${x(0)},${H}`, ...data.map((d, i) => `${x(i)},${y(d.venta)}`), `${x(data.length - 1)},${H}`].join(' ');

  const lx = x(data.length - 1);
  const ly = y(data[data.length - 1].venta);

  return (
    <svg width={W} height={H} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {showGrid && [0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1={PAD} y1={H - PAD - t * (H - PAD * 2)} x2={W - PAD} y2={H - PAD - t * (H - PAD * 2)}
          stroke={gridColor ?? 'rgba(255,255,255,0.06)'} strokeDasharray="3,4" />
      ))}
      <polygon points={area} fill={`url(#sg-${color.replace('#', '')})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={4} fill={color} />
      <circle cx={lx} cy={ly} r={8} fill={color} fillOpacity={0.2} />
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const ExchangeRateWidget: React.FC = () => {
  const [data, setData] = useState<ExchangeRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [histLoading, setHistLoading] = useState(false);
  const [history, setHistory] = useState<RateEntry[]>([]);
  const [selectedCcy, setSelectedCcy] = useState('USD');
  const [lookupDate, setLookupDate] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<DateLookupResult[] | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState(false);

  const dark = useThemeStore((s) => s.mode) === 'dark';
  const t = dark ? DARK : LIGHT;

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await fetchExchangeRate(period);
      setData(res);
      setHistory(res.history);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const changePeriod = async (days: number) => {
    if (days === period) return;
    setPeriod(days);
    setHistLoading(true);
    try {
      const moneda = CURRENCY_INFO[selectedCcy]?.moneda ?? 2;
      const rows = await fetchExchangeHistory(moneda, days);
      setHistory(rows);
    } catch { /* keep current */ }
    finally { setHistLoading(false); }
  };

  const changeCurrency = async (code: string) => {
    if (code === selectedCcy) return;
    setSelectedCcy(code);
    setHistLoading(true);
    try {
      const moneda = CURRENCY_INFO[code]?.moneda ?? 2;
      const rows = await fetchExchangeHistory(moneda, period);
      setHistory(rows);
    } catch { /* keep current */ }
    finally { setHistLoading(false); }
  };

  const handleLookup = async (dateStr: string) => {
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const res = await fetchRateOnDate(dateStr);
      setLookupResult(res);
    } catch { message.error('No se encontró el tipo de cambio para esa fecha'); }
    finally { setLookupLoading(false); }
  };

  const isBanguat = data?.source === 'banguat';

  const currentCcy = data?.currencies.find((c) => c.code === selectedCcy);
  const firstVal = history[0]?.venta ?? 0;
  const lastVal = history[history.length - 1]?.venta ?? currentCcy?.venta ?? 0;
  const diff = lastVal - firstVal;
  const diffPct = firstVal ? (diff / firstVal) * 100 : 0;
  const isUp = diff > 0;

  const weekMin = history.length ? Math.min(...history.map((h) => h.venta)) : 0;
  const weekMax = history.length ? Math.max(...history.map((h) => h.venta)) : 0;
  const weekAvg = history.length ? history.reduce((s, h) => s + h.venta, 0) / history.length : 0;

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
    background:   active ? t.periodActiveBg   : 'transparent',
    color:        active ? t.periodActiveText  : t.textMuted,
    border:       active ? `1px solid ${t.periodActiveBorder}` : '1px solid transparent',
    transition: 'all 0.15s',
  });

  return (
    <div style={{
      background:   t.bg,
      border:       t.wrapBorder,
      borderRadius: 20,
      padding:      '24px 28px',
      position:     'relative',
      overflow:     'hidden',
      boxShadow:    t.wrapShadow,
      fontFamily:   "'DM Sans', 'Segoe UI', sans-serif",
      transition:   'background 0.3s, box-shadow 0.3s, border 0.3s',
    }}>
      {/* Background decoration — only in dark mode */}
      {dark && <>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(77,159,232,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      </>}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: GOLD, marginBottom: 2 }}>
            Tipo de Cambio · Banguat
          </div>
          <div style={{ fontSize: 13, color: t.textSub }}>
            Banco de Guatemala — Tasa Oficial
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {data && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              background: isBanguat ? 'rgba(201,168,76,0.15)' : t.surface,
              color:      isBanguat ? GOLD : t.textMuted,
              border:     `1px solid ${isBanguat ? GOLD + '40' : t.border}`,
            }}>
              {isBanguat ? '✓ Banguat Oficial' : '⚠ Mercado'}
            </span>
          )}

          <Tooltip title="Actualizar">
            <button
              onClick={load}
              style={{
                background: t.reloadBg, border: `1px solid ${t.reloadBorder}`,
                borderRadius: 8, color: t.reloadColor, cursor: 'pointer',
                padding: '5px 9px', fontSize: 13,
              }}
            >
              <ReloadOutlined spin={loading} />
            </button>
          </Tooltip>
        </div>
      </div>

      {loading && !data ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180 }}>
          <Spin size="large" />
        </div>
      ) : error && !data ? (
        <div style={{ color: '#f87171', padding: '24px 0', fontSize: 14 }}>No se pudo obtener el tipo de cambio</div>
      ) : data ? (
        <>
          {/* ── Body: chart + currencies ── */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

            {/* Left: main rate + chart */}
            <div style={{ flex: '1 1 0', minWidth: 0 }}>

              {/* Currency selector tabs */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                {data.currencies.map((c) => {
                  const active = selectedCcy === c.code;
                  return (
                    <button key={c.code} onClick={() => changeCurrency(c.code)} style={{
                      padding: '4px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      background: active ? GOLD : t.tabInactiveBg,
                      color:      active ? '#0A1628' : t.tabInactiveText,
                      border:     `1px solid ${active ? GOLD : t.tabInactiveBorder}`,
                      transition: 'all 0.15s',
                    }}>
                      {c.flag} {c.code}
                    </button>
                  );
                })}
              </div>

              {/* Main rate */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 700, color: t.rateNum, lineHeight: 1, letterSpacing: '-2px' }}>
                  Q {(currentCcy?.venta ?? lastVal).toFixed(4)}
                </div>
                <div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 12,
                    color:      isUp ? t.upColor   : t.downColor,
                    background: isUp ? t.upBg      : t.downBg,
                  }}>
                    {isUp ? '▲' : '▼'} {Math.abs(diffPct).toFixed(3)}%
                  </span>
                  <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3 }}>
                    vs. hace {PERIODS.find((p) => p.days === period)?.label ?? `${period}d`}
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
                {[
                  { label: 'Compra', val: currentCcy?.compra ?? 0, color: dark ? '#6ee7b7' : '#10B981' },
                  { label: 'Venta',  val: currentCcy?.venta  ?? 0, color: dark ? '#fca5a5' : '#EF4444' },
                  { label: `Prom. ${PERIODS.find((p) => p.days === period)?.label}`, val: weekAvg, color: BLUE },
                  { label: 'Mín',    val: weekMin,               color: dark ? '#a78bfa' : '#8B5CF6' },
                  { label: 'Máx',    val: weekMax,               color: dark ? '#fb923c' : '#F59E0B' },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: t.textMuted, marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: item.color }}>Q {item.val.toFixed(4)}</div>
                  </div>
                ))}
              </div>

              {/* Period selector */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {PERIODS.map((p) => (
                  <button key={p.label} onClick={() => changePeriod(p.days)} style={btnStyle(period === p.days)}>
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Chart */}
              <div style={{ position: 'relative' }}>
                {histLoading && (
                  <div style={{ position: 'absolute', inset: 0, background: t.chartOverlay, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, zIndex: 2 }}>
                    <Spin size="small" />
                  </div>
                )}
                <Sparkline
                  data={history.length >= 2 ? history : (data.history.length >= 2 ? data.history : [])}
                  color={BLUE} showGrid gridColor={t.gridStroke}
                />
                {history.length >= 2 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t.textMuted, marginTop: 4 }}>
                    <span>{dayjs(history[0].fecha).format('DD/MM/YY')}</span>
                    <span>{dayjs(history[history.length - 1].fecha).format('DD/MM/YY')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: multi-currency table */}
            <div style={{ width: 210, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: t.textMuted, marginBottom: 10 }}>
                <SwapOutlined style={{ marginRight: 4 }} />Monedas vs Q
              </div>
              {data.currencies.map((c) => {
                const isSelected = c.code === selectedCcy;
                return (
                  <div key={c.code} onClick={() => changeCurrency(c.code)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 10px', borderRadius: 10, cursor: 'pointer', marginBottom: 4,
                    background: isSelected ? t.surfaceSel : t.surface,
                    border:     `1px solid ${isSelected ? t.borderSel : t.border}`,
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 16 }}>{c.flag}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? GOLD : t.text }}>{c.code}</div>
                        <div style={{ fontSize: 10, color: t.textMuted, lineHeight: 1.2 }}>{c.name}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? GOLD : t.text }}>
                        Q {c.venta.toFixed(4)}
                      </div>
                      <div style={{ fontSize: 10, color: t.textMuted }}>
                        {dayjs(c.fecha).format('DD/MM')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Date lookup ── */}
          <div style={{ marginTop: 20, paddingTop: 18, borderTop: `1px solid ${t.divider}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: t.textMuted, marginBottom: 10 }}>
              <SearchOutlined style={{ marginRight: 5 }} />Consulta por fecha — historial para contratos
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <DatePicker
                size="small"
                format="DD/MM/YYYY"
                placeholder="Seleccionar fecha"
                onChange={(d) => { if (d) { setLookupDate(d.format('YYYY-MM-DD')); setLookupResult(null); } }}
                style={{
                  borderRadius: 8,
                  background: t.lookupBg,
                  border: `1px solid ${t.lookupBorder}`,
                  color: t.text,
                }}
                disabledDate={(d) => d.isAfter(dayjs())}
              />
              <button
                onClick={() => lookupDate && handleLookup(lookupDate)}
                disabled={!lookupDate || lookupLoading}
                style={{
                  padding: '4px 14px', borderRadius: 8, cursor: lookupDate ? 'pointer' : 'default',
                  background: lookupDate ? GOLD : t.surface,
                  color:      lookupDate ? '#0A1628' : t.textMuted,
                  border: 'none', fontWeight: 700, fontSize: 12, transition: 'all 0.15s',
                }}
              >
                {lookupLoading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            {lookupResult && lookupResult.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {lookupResult.map((r) => (
                  <div key={r.code} style={{
                    padding: '8px 12px', borderRadius: 10,
                    background: t.lookupBg, border: `1px solid ${t.lookupBorder}`,
                  }}>
                    <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 2 }}>
                      {r.flag} {r.code} · {dayjs(r.fecha).format('DD/MM/YYYY')}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Q {r.venta.toFixed(4)}</div>
                    <div style={{ fontSize: 10, color: t.textMuted }}>Compra Q {r.compra.toFixed(4)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default ExchangeRateWidget;
