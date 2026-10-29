import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { App, Button } from 'antd';
import { CheckOutlined, CloseOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  authorizeMoneyRequirements,
  denyMoneyRequirements,
  getMoneyRequirements,
  type MoneyRequirement,
} from '../../api/moneyRequirements';
import { EmptyState, ErrorState, Sheet, SkeletonList } from '../ui';
import { usePullToRefresh } from '../usePullToRefresh';
import type { ShellContext } from '../MobileApp';

const isUsd = (r: MoneyRequirement) => Number(r.currency) === 2 || r.currency === 'USD';
const fmtMoney = (amount: number, usd: boolean) =>
  `${usd ? 'US$' : 'Q'} ${amount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const money = (r: MoneyRequirement) => fmtMoney(Number(r.amount), isUsd(r));

function totals(rows: MoneyRequirement[]) {
  const q = rows.filter((r) => !isUsd(r)).reduce((s, r) => s + Number(r.amount), 0);
  const usd = rows.filter(isUsd).reduce((s, r) => s + Number(r.amount), 0);
  return [q ? fmtMoney(q, false) : null, usd ? fmtMoney(usd, true) : null].filter(Boolean).join(' · ');
}

type Pending = { ids: number[]; kind: 'authorize' | 'deny' };

// Requerimientos de dinero que esperan MI autorización (misma fuente que la
// pestaña "Por autorizar" de pages/money_req/List.tsx).
export default function MobilePorAutorizar() {
  const { message } = App.useApp();
  const { refreshBadge } = useOutletContext<ShellContext>();
  const [rows, setRows] = useState<MoneyRequirement[] | null>(null);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState<MoneyRequirement | null>(null);
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const [busy, setBusy] = useState<Pending | null>(null);
  const [leaving, setLeaving] = useState<number[]>([]);

  const load = useCallback(async () => {
    try {
      setRows(await getMoneyRequirements({ scope: 'to_authorize' }));
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  const { indicator } = usePullToRefresh(load);

  const summary = useMemo(() => (rows?.length ? totals(rows) : ''), [rows]);

  const act = async ({ ids, kind }: Pending) => {
    setBusy({ ids, kind });
    try {
      if (kind === 'authorize') await authorizeMoneyRequirements(ids);
      else await denyMoneyRequirements(ids);
      const n = ids.length;
      message.success(
        kind === 'authorize'
          ? n === 1
            ? 'Requerimiento autorizado'
            : `${n} requerimientos autorizados`
          : 'Requerimiento denegado',
      );
      setConfirm(null);
      setDetail(null);
      // Las filas salen con transición; después se sincroniza con el servidor
      setLeaving(ids);
      window.setTimeout(() => {
        setRows((prev) => prev?.filter((r) => !ids.includes(r.id)) ?? prev);
        setLeaving([]);
        load();
        refreshBadge();
      }, 220);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo completar. Intenta de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  const isBusy = (id: number, kind?: Pending['kind']) => !!busy && busy.ids.includes(id) && (!kind || busy.kind === kind);

  if (error && !rows) return <ErrorState text="Revisa tu conexión e intenta de nuevo." onRetry={load} />;
  if (!rows)
    return (
      <>
        <div className="m-skel" style={{ width: 180, height: 14, margin: '8px 4px 14px' }} />
        <SkeletonList rows={3} />
      </>
    );

  return (
    <>
      {indicator}

      {rows.length === 0 ? (
        <EmptyState
          icon={<SafetyCertificateOutlined />}
          title="Nada pendiente de tu firma"
          text="Cuando alguien te envíe un requerimiento de dinero para autorizar, aparecerá aquí."
        />
      ) : (
        <>
          <div className="m-heading" style={{ marginTop: 4 }}>
            <span>
              {rows.length} {rows.length === 1 ? 'pendiente' : 'pendientes'}
            </span>
            <small className="m-num">{summary}</small>
          </div>

          <div className="m-list">
            {rows.map((r) => (
              <div className={`m-item ${leaving.includes(r.id) ? 'leaving' : ''}`} key={r.id} style={{ flexDirection: 'column', gap: 0 }}>
                <button className="m-row-btn" style={{ width: '100%', flexDirection: 'column', gap: 0 }} onClick={() => setDetail(r)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, width: '100%' }}>
                    <div className="m-item-title">{r.payableTo}</div>
                    <div className="m-amount">{money(r)}</div>
                  </div>
                  <div className="m-item-meta">
                    {r.applicantName ?? 'Sin solicitante'}
                    {r.teamName ? ` · ${r.teamName}` : ''}
                  </div>
                  <div className="m-item-meta m-num">
                    {r.correlative} · {dayjs(r.date).format('D MMM YYYY').replace('.', '')}
                    {r.workNoteNumber ? ` · NT ${r.workNoteNumber}` : ''}
                  </div>
                  {r.description && <div className="m-item-desc">{r.description}</div>}
                </button>
                <div className="m-item-actions" style={{ width: '100%' }}>
                  <Button icon={<CloseOutlined />} disabled={!!busy} onClick={() => setConfirm({ ids: [r.id], kind: 'deny' })}>
                    Denegar
                  </Button>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={isBusy(r.id, 'authorize') && busy?.ids.length === 1}
                    disabled={!!busy && !isBusy(r.id)}
                    onClick={() => act({ ids: [r.id], kind: 'authorize' })}
                  >
                    Autorizar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {rows.length > 1 && (
            <Button
              block
              size="large"
              disabled={!!busy}
              onClick={() => setConfirm({ ids: rows.map((r) => r.id), kind: 'authorize' })}
              style={{ height: 48, marginTop: 12, fontWeight: 600 }}
            >
              Autorizar los {rows.length}
            </Button>
          )}
        </>
      )}

      {/* Detalle */}
      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.payableTo}
        footer={
          detail && (
            <div className="m-sheet-actions">
              <Button icon={<CloseOutlined />} disabled={!!busy} onClick={() => setConfirm({ ids: [detail.id], kind: 'deny' })}>
                Denegar
              </Button>
              <Button type="primary" icon={<CheckOutlined />} loading={isBusy(detail.id, 'authorize')} onClick={() => act({ ids: [detail.id], kind: 'authorize' })}>
                Autorizar
              </Button>
            </div>
          )
        }
      >
        {detail && (
          <>
            <div className="m-amount" style={{ fontSize: 28, marginBottom: 8 }}>
              {money(detail)}
            </div>
            <dl className="m-dl">
              <div>
                <dt>Correlativo</dt>
                <dd className="m-num">{detail.correlative}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{dayjs(detail.date).format('D MMM YYYY').replace('.', '')}</dd>
              </div>
              <div>
                <dt>Solicita</dt>
                <dd>{detail.applicantName ?? '—'}</dd>
              </div>
              {detail.teamName && (
                <div>
                  <dt>Equipo</dt>
                  <dd>{detail.teamName}</dd>
                </div>
              )}
              {(detail.areaNames?.length || detail.areaName) && (
                <div>
                  <dt>Área</dt>
                  <dd>{detail.areaNames?.join(', ') || detail.areaName}</dd>
                </div>
              )}
              {detail.nit && (
                <div>
                  <dt>NIT</dt>
                  <dd className="m-num">{detail.nit}</dd>
                </div>
              )}
              {detail.workNoteNumber && (
                <div>
                  <dt>Nota de trabajo</dt>
                  <dd className="m-num">{detail.workNoteNumber}</dd>
                </div>
              )}
            </dl>
            {detail.description && (
              <>
                <div className="m-heading" style={{ margin: '16px 0 6px' }}>
                  Descripción
                </div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', userSelect: 'text' }}>{detail.description}</p>
              </>
            )}
          </>
        )}
      </Sheet>

      {/* Confirmación (denegar uno / autorizar todos) */}
      <Sheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === 'deny' ? '¿Denegar este requerimiento?' : `¿Autorizar los ${confirm?.ids.length}?`}
        footer={
          confirm && (
            <div className="m-sheet-actions">
              <Button onClick={() => setConfirm(null)}>Volver</Button>
              <Button type="primary" danger={confirm.kind === 'deny'} loading={!!busy} onClick={() => act(confirm)}>
                {confirm.kind === 'deny' ? 'Denegar' : 'Autorizar todos'}
              </Button>
            </div>
          )
        }
      >
        {confirm && rows && (
          <>
            {confirm.kind === 'deny' ? (
              (() => {
                const r = rows.find((x) => x.id === confirm.ids[0]);
                return r ? (
                  <p style={{ marginTop: 0 }}>
                    <b>{r.payableTo}</b> · <span className="m-num">{money(r)}</span>
                    <br />
                    <span className="m-item-meta">Solicitado por {r.applicantName ?? '—'}. No se puede deshacer desde la app.</span>
                  </p>
                ) : null;
              })()
            ) : (
              <div className="m-note">
                <b className="m-num">{totals(rows.filter((r) => confirm.ids.includes(r.id)))}</b>
                <div className="m-item-meta">Suma de los {confirm.ids.length} requerimientos pendientes.</div>
              </div>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
