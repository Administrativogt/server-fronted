import React, { useEffect, useRef, useState } from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Tokens } from '../../dashboard/theme';
import { DANGER, SUCCESS, WARNING } from '../../dashboard/theme';
import adminAuditApi from '../../../api/adminAudit';
import type { AuditOverview } from '../../../api/adminAudit';

const { Text } = Typography;
const NUM = new Intl.NumberFormat('es-GT');

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Número que cuenta hasta su valor una sola vez (600 ms, ease-out); instantáneo con reduced-motion. */
const CountUp: React.FC<{ value: number; style?: React.CSSProperties }> = ({ value, style }) => {
  const [shown, setShown] = useState(prefersReducedMotion() ? value : 0);
  const done = useRef(false);
  useEffect(() => {
    if (done.current || prefersReducedMotion()) {
      setShown(value);
      return;
    }
    done.current = true;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 600);
      const eased = 1 - Math.pow(1 - p, 4);
      setShown(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span style={style}>{NUM.format(shown)}</span>;
};

/** Barras diminutas de los últimos 14 días (sin librería). Una por día, tooltip con el detalle. */
const Sparkline: React.FC<{ data: Record<string, unknown>[]; tk: Tokens; color: string }> = ({ data, tk, color }) => {
  const vals = data.map((d) => Number(d.Salas ?? 0) + Number(d.Cheques ?? 0) + Number(d.Notificaciones ?? 0));
  const max = Math.max(1, ...vals);
  return (
    <div role="img" aria-label={`Cancelaciones por día, últimos ${data.length} días`} style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 44 }}>
      {data.map((d, i) => {
        const v = vals[i];
        const h = v === 0 ? 3 : Math.max(6, Math.round((v / max) * 44));
        return (
          <Tooltip key={String(d.fecha ?? i)} title={`${d.dia}: ${v} · Salas ${d.Salas} · Cheques ${d.Cheques} · Notif. ${d.Notificaciones}`}>
            <div style={{ width: 10, height: h, borderRadius: 3, background: v === 0 ? tk.divider : color }} />
          </Tooltip>
        );
      })}
    </div>
  );
};

interface Props {
  overview: AuditOverview;
  tk: Tokens;
  onOpenCancelaciones: () => void;
}

/**
 * Cabecera de estado: UNA cifra protagonista (cancelaciones y eliminaciones
 * de la semana) con su tendencia de 14 días y una frase; debajo, el pulso de
 * cada área en texto denso. Sustituye la grilla de "número grande + label".
 */
const StatusHero: React.FC<Props> = ({ overview, tk, onOpenCancelaciones }) => {
  const [spark, setSpark] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    let alive = true;
    adminAuditApi
      .getCharts('general', 14)
      .then(({ data }) => alive && setSpark(data.porDia ?? []))
      .catch(() => alive && setSpark([]));
    return () => {
      alive = false;
    };
  }, []);

  const c = overview.cancelaciones7d;
  const rep = overview.notificaciones.ultimoReporte5pm;
  const repOk = rep?.status === 'sent';
  const parts = [
    c.salas ? `${c.salas} en salas` : null,
    c.cheques ? `${c.cheques} en cheques` : null,
    c.notificaciones ? `${c.notificaciones} en notificaciones` : null,
  ].filter(Boolean);

  const Stat: React.FC<{ label: string; value: number; alert?: boolean; alertColor?: string }> = ({ label, value, alert, alertColor = WARNING }) => (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' }}>
      <Text strong style={{ fontSize: 16, color: tk.t1, fontVariantNumeric: 'tabular-nums' }}>
        {NUM.format(value)}
      </Text>
      <Text style={{ fontSize: 13, color: tk.t2 }}>{label}</Text>
      {alert && value > 0 && <span aria-hidden style={{ width: 7, height: 7, borderRadius: 4, background: alertColor, alignSelf: 'center' }} />}
    </span>
  );

  const Sep = () => <span aria-hidden style={{ color: tk.t3, padding: '0 10px' }}>·</span>;

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: 24,
          alignItems: 'center',
          padding: '20px 24px',
          borderRadius: 10,
          background: tk.subtle,
          border: tk.borderCss,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0, flexWrap: 'wrap' }}>
          <CountUp
            value={c.total}
            style={{
              fontSize: 56,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: c.total ? DANGER : SUCCESS,
              fontVariantNumeric: 'tabular-nums',
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: tk.t1, lineHeight: 1.3 }}>
              {c.total === 0 ? 'Nada se canceló ni se eliminó esta semana' : `cancelaciones y eliminaciones en los últimos 7 días`}
            </div>
            <div style={{ fontSize: 13, color: tk.t2, marginTop: 2 }}>
              {c.total === 0 ? 'Salas, cheques y notificaciones sin bajas desde hace 7 días.' : parts.join(' · ')}
            </div>
            <Button type="link" size="small" style={{ paddingInline: 0, marginTop: 4 }} onClick={onOpenCancelaciones}>
              Ver quién, cuándo y por qué <RightOutlined />
            </Button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <Sparkline data={spark} tk={tk} color={DANGER} />
          <Text style={{ fontSize: 11, color: tk.t3 }}>últimos 14 días</Text>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px 0',
          alignItems: 'center',
          padding: '12px 4px 0',
          fontSize: 13,
        }}
      >
        <Text strong style={{ color: tk.t2, fontSize: 12, marginRight: 10 }}>
          SALAS
        </Text>
        <Stat label="reuniones hoy" value={overview.salas.hoy} />
        <Sep />
        <Stat label="esperando aprobación" value={overview.salas.pendientesAprobacion} alert />
        <span style={{ flexBasis: '100%', height: 0 }} className="audit-break" />
        <Text strong style={{ color: tk.t2, fontSize: 12, marginRight: 10 }}>
          CHEQUES
        </Text>
        <Stat label="por autorizar" value={overview.cheques.pendientesAutorizar} />
        <Sep />
        <Stat label="por liquidar" value={overview.cheques.pendientesLiquidar} />
        <Sep />
        <Stat label="con error en Sirvo" value={overview.cheques.conErrorSirvo} alert alertColor={DANGER} />
        <Sep />
        <Stat label="movimientos en 24 h" value={overview.cheques.cambios24h} />
        <span style={{ flexBasis: '100%', height: 0 }} />
        <Text strong style={{ color: tk.t2, fontSize: 12, marginRight: 10 }}>
          NOTIFICACIONES
        </Text>
        <Stat label="sin entregar" value={overview.notificaciones.pendientes} alert />
        <Sep />
        <Stat label="recibidas hoy" value={overview.notificaciones.hoy} />
        <Sep />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: 4, background: rep ? (repOk ? SUCCESS : DANGER) : tk.t3 }} />
          <Text style={{ fontSize: 13, color: tk.t2 }}>
            {rep
              ? `reporte 5 PM del ${dayjs(rep.report_date).format('DD/MM')}: ${repOk ? 'enviado' : rep.status}${rep.sent_at ? ` a las ${rep.sent_at.slice(11, 16)}` : ''}`
              : 'reporte 5 PM: sin registros'}
          </Text>
        </span>
      </div>
    </div>
  );
};

export default StatusHero;
