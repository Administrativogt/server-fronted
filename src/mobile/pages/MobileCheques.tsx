import { useCallback, useEffect, useState } from 'react';
import { App, Button, Segmented } from 'antd';
import { CheckOutlined, CloseOutlined, FileDoneOutlined, FileSearchOutlined, LinkOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getCoordinatorMembers,
  getLiquidatedChecks,
  getLiquidationDocumentUrl,
  getPendingAuthorization,
  getPendingLiquidation,
  manageChecksAuthorization,
  requestChecksAuthorization,
} from '../../api/checks';
import type { UserLite } from '../../api/users';
import useAuthStore from '../../auth/useAuthStore';
import type { CheckRequest } from '../../types/checks.types';
import { EmptyState, ErrorState, Pill, SearchField, Sheet, SkeletonList } from '../ui';
import { fullName, money } from '../format';
import { usePullToRefresh } from '../usePullToRefresh';

type Tab = 'autorizar' | 'liquidar' | 'liquidados';
const PER_PAGE = 20;

const STATE: Record<number, { tone: 'warning' | 'success' | 'danger' | 'neutral'; text: string }> = {
  1: { tone: 'warning', text: 'Por autorizar' },
  4: { tone: 'danger', text: 'Rechazado' },
  6: { tone: 'success', text: 'Autorizado' },
  7: { tone: 'neutral', text: 'No disponible' },
};
const stateId = (c: CheckRequest) => (typeof c.state === 'number' ? c.state : (c.state?.id ?? 1));
const fmtDate = (d?: string | null) => (d ? dayjs(d).format('D MMM YYYY').replace('.', '') : '—');
const amount = (c: CheckRequest) => money(c.total_value, c.currency_code);
const clientLabel = (c: CheckRequest) => c.client_name || c.client || 'Sin cliente';

export default function MobileCheques() {
  const { message } = App.useApp();
  const { userId, tipo_usuario, is_superuser } = useAuthStore();
  // Mismos gates que pages/cheques/*: espejo de isElevatedUser del backend
  const canManageAuth = is_superuser || [1, 2, 10].includes(tipo_usuario ?? 0);
  const canViewAllLiq = is_superuser || [1, 2, 9, 10].includes(tipo_usuario ?? 0);
  const isSecretaria = tipo_usuario === 6;

  const [tab, setTab] = useState<Tab>('autorizar');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<CheckRequest[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [detail, setDetail] = useState<CheckRequest | null>(null);
  const [confirm, setConfirm] = useState<{ ids: number[]; action: 'authorize' | 'deny' } | null>(null);
  const [requestFor, setRequestFor] = useState<number[] | null>(null);
  const [authorizers, setAuthorizers] = useState<UserLite[] | null>(null);
  const [authorizerId, setAuthorizerId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [docLoading, setDocLoading] = useState(false);

  const fetchPage = useCallback(
    async (p: number) => {
      const numeric = /^\d+$/.test(q);
      const search = numeric ? { request_id: Number(q) } : q ? { client: q } : {};
      const base = { page: p, per_page: PER_PAGE, ...search };
      if (tab === 'autorizar')
        return getPendingAuthorization({ ...base, include_authorized: true, responsible_id: canManageAuth ? undefined : (userId ?? undefined) });
      if (tab === 'liquidar')
        return getPendingLiquidation({ ...base, responsible_id: canViewAllLiq || isSecretaria ? undefined : (userId ?? undefined) });
      return getLiquidatedChecks(base);
    },
    [tab, q, canManageAuth, canViewAllLiq, isSecretaria, userId],
  );

  const load = useCallback(async () => {
    try {
      const res = await fetchPage(1);
      setRows(res.data);
      setTotal(res.total);
      setPage(1);
      setError(false);
    } catch {
      setError(true);
    }
  }, [fetchPage]);

  useEffect(() => {
    setRows(null);
    setSelected([]);
    load();
  }, [load]);
  const { indicator } = usePullToRefresh(load);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await fetchPage(page + 1);
      setRows((prev) => [...(prev ?? []), ...res.data]);
      setPage(page + 1);
      setTotal(res.total);
    } catch {
      message.error('No se pudieron cargar más cheques');
    } finally {
      setLoadingMore(false);
    }
  };

  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const selectedRows = (rows ?? []).filter((r) => selected.includes(r.id));
  const selectedTotal = money(selectedRows.reduce((s, r) => s + Number(r.total_value || 0), 0));

  const manage = async ({ ids, action }: { ids: number[]; action: 'authorize' | 'deny' }) => {
    setBusy(true);
    try {
      await manageChecksAuthorization({ action, all_check_ids: ids });
      const n = ids.length;
      message.success(action === 'authorize' ? (n === 1 ? 'Cheque autorizado' : `${n} cheques autorizados`) : n === 1 ? 'Cheque rechazado' : `${n} cheques rechazados`);
      setConfirm(null);
      setDetail(null);
      setSelected([]);
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo completar. Ningún cheque cambió de estado.');
    } finally {
      setBusy(false);
    }
  };

  const openRequest = async (ids: number[]) => {
    setRequestFor(ids);
    setAuthorizerId(null);
    setAuthorizers(null);
    try {
      setAuthorizers(await getCoordinatorMembers(ids));
    } catch {
      setAuthorizers([]);
    }
  };

  const sendRequest = async () => {
    if (!requestFor || !authorizerId) return;
    setBusy(true);
    try {
      await requestChecksAuthorization({ check_ids: requestFor, authorizer_id: authorizerId });
      const who = authorizers?.find((a) => a.id === authorizerId);
      message.success(`Solicitud enviada a ${fullName(who) || 'el autorizador'}`);
      setRequestFor(null);
      setDetail(null);
      setSelected([]);
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo enviar la solicitud');
    } finally {
      setBusy(false);
    }
  };

  const openDocument = async (c: CheckRequest) => {
    if (!c.liquidation_id) return;
    setDocLoading(true);
    try {
      window.open(await getLiquidationDocumentUrl(c.liquidation_id), '_blank');
    } catch {
      message.error('No se pudo abrir el comprobante');
    } finally {
      setDocLoading(false);
    }
  };

  const selectable = (c: CheckRequest) => tab === 'autorizar' && stateId(c) === 1;

  const empty = {
    autorizar: { icon: <CheckOutlined />, title: 'Nada por autorizar', text: 'Los cheques que esperan autorización aparecerán aquí en cuanto se sincronicen desde Sirvo.' },
    liquidar: { icon: <FileSearchOutlined />, title: 'Nada por liquidar', text: 'Cuando un cheque autorizado espere su comprobante, aparecerá aquí.' },
    liquidados: { icon: <FileDoneOutlined />, title: 'Sin cheques liquidados', text: 'Aquí verás los cheques ya liquidados con su comprobante.' },
  }[tab];

  if (error && !rows) return <ErrorState text="Revisa tu conexión e intenta de nuevo." onRetry={load} />;

  return (
    <>
      {indicator}

      <Segmented
        block
        value={tab}
        onChange={(v) => {
          setQ('');
          setTab(v as Tab);
        }}
        options={[
          { label: 'Autorizar', value: 'autorizar' },
          { label: 'Liquidar', value: 'liquidar' },
          { label: 'Liquidados', value: 'liquidados' },
        ]}
      />

      <SearchField key={tab} placeholder="Buscar por cliente o ID de cheque" onSearch={setQ} />

      {!rows ? (
        <div style={{ marginTop: 12 }}>
          <SkeletonList rows={4} />
        </div>
      ) : rows.length === 0 ? (
        q ? (
          <EmptyState icon={<FileSearchOutlined />} title="Sin resultados" text={`Ningún cheque coincide con «${q}». Prueba con el código de cliente o el ID completo.`} />
        ) : (
          <EmptyState {...empty} />
        )
      ) : (
        <>
          <div className="m-heading" style={{ marginTop: 12 }}>
            <span>
              {total} {total === 1 ? 'cheque' : 'cheques'}
            </span>
            {tab === 'autorizar' && canManageAuth && <small>Marca varios para autorizarlos juntos</small>}
          </div>
          <div className="m-list">
            {rows.map((c) => {
              const st = stateId(c);
              const isSel = selected.includes(c.id);
              return (
                <div className={`m-item ${isSel ? 'selected' : ''}`} key={c.id}>
                  {selectable(c) && (
                    <button className="m-check" role="checkbox" aria-checked={isSel} aria-label={`Seleccionar cheque ${c.request_id}`} onClick={() => toggle(c.id)}>
                      <span>{isSel && <CheckOutlined />}</span>
                    </button>
                  )}
                  <button className="m-row-btn" onClick={() => setDetail(c)}>
                    <div className="m-item-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div className="m-item-title">{clientLabel(c)}</div>
                        <div className="m-amount">{tab === 'liquidados' && c.liquidated_amount != null ? money(c.liquidated_amount, c.currency_code) : amount(c)}</div>
                      </div>
                      <div className="m-item-meta m-num">
                        ID {c.request_id}
                        {c.work_note_number ? ` · NT ${c.work_note_number}` : ''} · {fmtDate(c.date)}
                      </div>
                      <div className="m-item-meta">{fullName(c.responsible) || c.coordinator_code}</div>
                      {c.description && <div className="m-item-desc">{c.description}</div>}
                      {tab === 'autorizar' && st !== 1 && (
                        <div style={{ marginTop: 8 }}>
                          <Pill tone={STATE[st]?.tone ?? 'neutral'}>{STATE[st]?.text ?? '—'}</Pill>
                        </div>
                      )}
                      {tab === 'liquidados' && c.is_partial_liquidation && (
                        <div style={{ marginTop: 8 }}>
                          <Pill tone={c.remainder_liquidated ? 'success' : 'warning'}>
                            Parcial · saldo {money(c.remaining_amount ?? 0, c.currency_code)}
                          </Pill>
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
          {rows.length < total && (
            <Button block className="m-more" size="large" loading={loadingMore} onClick={loadMore} style={{ height: 46 }}>
              Cargar más ({total - rows.length} restantes)
            </Button>
          )}
          {selected.length > 0 && <div style={{ height: 80 }} />}
        </>
      )}

      {/* Barra de acciones para la selección */}
      {selected.length > 0 && (
        <div className="m-actionbar" role="region" aria-label="Acciones de la selección">
          <div className="m-actionbar-label">
            {selected.length} {selected.length === 1 ? 'cheque' : 'cheques'}
            <small className="m-num">{selectedTotal}</small>
          </div>
          {canManageAuth ? (
            <>
              <Button icon={<CloseOutlined />} aria-label="Rechazar selección" onClick={() => setConfirm({ ids: selected, action: 'deny' })} />
              <Button type="primary" icon={<CheckOutlined />} onClick={() => setConfirm({ ids: selected, action: 'authorize' })}>
                Autorizar
              </Button>
            </>
          ) : (
            <Button type="primary" icon={<SendOutlined />} onClick={() => openRequest(selected)}>
              Pedir autorización
            </Button>
          )}
        </div>
      )}

      {/* Detalle */}
      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? clientLabel(detail) : ''}
        footer={
          detail &&
          (tab === 'autorizar' && stateId(detail) === 1 ? (
            canManageAuth ? (
              <div className="m-sheet-actions">
                <Button icon={<CloseOutlined />} onClick={() => setConfirm({ ids: [detail.id], action: 'deny' })}>
                  Rechazar
                </Button>
                <Button type="primary" icon={<CheckOutlined />} onClick={() => setConfirm({ ids: [detail.id], action: 'authorize' })}>
                  Autorizar
                </Button>
              </div>
            ) : (
              <Button type="primary" block icon={<SendOutlined />} style={{ height: 48, fontWeight: 600 }} onClick={() => openRequest([detail.id])}>
                Pedir autorización
              </Button>
            )
          ) : tab === 'liquidados' && detail.liquidation_id ? (
            <Button block icon={<LinkOutlined />} loading={docLoading} style={{ height: 48, fontWeight: 600 }} onClick={() => openDocument(detail)}>
              Ver comprobante
            </Button>
          ) : undefined)
        }
      >
        {detail && (
          <>
            <div className="m-amount" style={{ fontSize: 28 }}>
              {amount(detail)}
            </div>
            <div style={{ margin: '6px 0 8px' }}>
              {tab === 'autorizar' && <Pill tone={STATE[stateId(detail)]?.tone ?? 'neutral'}>{STATE[stateId(detail)]?.text}</Pill>}
              {tab === 'liquidar' && <Pill tone="warning">Por liquidar</Pill>}
              {tab === 'liquidados' && <Pill tone="success">{detail.is_partial_liquidation ? 'Liquidado parcial' : 'Liquidado'}</Pill>}
            </div>
            <dl className="m-dl">
              <div>
                <dt>ID Sirvo</dt>
                <dd className="m-num">{detail.request_id}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{fmtDate(detail.date)}</dd>
              </div>
              <div>
                <dt>Cliente</dt>
                <dd>
                  {detail.client}
                  {detail.client_name ? ` · ${detail.client_name}` : ''}
                </dd>
              </div>
              {(detail.case_name || detail.case_code) && (
                <div>
                  <dt>Caso</dt>
                  <dd>{detail.case_name || detail.case_code}</dd>
                </div>
              )}
              {!!detail.work_note_number && (
                <div>
                  <dt>Nota de trabajo</dt>
                  <dd className="m-num">{detail.work_note_number}</dd>
                </div>
              )}
              <div>
                <dt>Solicitante</dt>
                <dd>{fullName(detail.responsible) || '—'}</dd>
              </div>
              <div>
                <dt>Coordinador</dt>
                <dd>{detail.coordinator_code || '—'}</dd>
              </div>
              {detail.type_of_charge && (
                <div>
                  <dt>Tipo de cargo</dt>
                  <dd>{detail.type_of_charge}</dd>
                </div>
              )}
              {detail.authorized_by && (
                <div>
                  <dt>Autorizó</dt>
                  <dd>{fullName(detail.authorized_by)}</dd>
                </div>
              )}
              {tab === 'liquidados' && detail.liquidated_amount != null && (
                <div>
                  <dt>Liquidado</dt>
                  <dd className="m-num">{money(detail.liquidated_amount, detail.currency_code)}</dd>
                </div>
              )}
              {tab === 'liquidados' && detail.is_partial_liquidation && (
                <div>
                  <dt>Saldo</dt>
                  <dd className="m-num">
                    {money(detail.remaining_amount ?? 0, detail.currency_code)}
                    {detail.remainder_request_id ? ` · ID ${detail.remainder_request_id}` : ''}
                  </dd>
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
            {tab === 'liquidar' && (
              <div className="m-note" style={{ marginTop: 16 }}>
                Para liquidar con el comprobante entra desde la web. En una próxima versión podrás hacerlo aquí con la cámara.
              </div>
            )}
          </>
        )}
      </Sheet>

      {/* Confirmar autorizar / rechazar */}
      <Sheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={
          confirm
            ? `¿${confirm.action === 'authorize' ? 'Autorizar' : 'Rechazar'} ${confirm.ids.length === 1 ? 'este cheque' : `${confirm.ids.length} cheques`}?`
            : ''
        }
        footer={
          confirm && (
            <div className="m-sheet-actions">
              <Button onClick={() => setConfirm(null)}>Volver</Button>
              <Button type="primary" danger={confirm.action === 'deny'} loading={busy} onClick={() => manage(confirm)}>
                {confirm.action === 'authorize' ? 'Autorizar' : 'Rechazar'}
              </Button>
            </div>
          )
        }
      >
        {confirm && (
          <div className={`m-note ${confirm.action === 'deny' ? 'danger' : ''}`}>
            <b className="m-num">{money((rows ?? []).filter((r) => confirm.ids.includes(r.id)).reduce((s, r) => s + Number(r.total_value || 0), 0))}</b>
            <div className="m-item-meta">
              Se registra en Sirvo al instante y se avisa por correo al solicitante.
              {confirm.action === 'deny' ? ' No se puede deshacer desde la app.' : ''}
            </div>
          </div>
        )}
      </Sheet>

      {/* Pedir autorización */}
      <Sheet
        open={!!requestFor}
        onClose={() => setRequestFor(null)}
        title="Pedir autorización"
        footer={
          <Button type="primary" block icon={<SendOutlined />} loading={busy} disabled={!authorizerId} onClick={sendRequest} style={{ height: 48, fontWeight: 600 }}>
            Enviar solicitud
          </Button>
        }
      >
        <p className="m-item-meta" style={{ marginTop: 0 }}>
          {requestFor?.length === 1 ? 'El cheque' : `Los ${requestFor?.length} cheques`} se envían por correo a quien elijas.
        </p>
        {!authorizers ? (
          <SkeletonList rows={3} />
        ) : authorizers.length === 0 ? (
          <div className="m-note warning">No hay autorizadores configurados para el coordinador de {requestFor?.length === 1 ? 'este cheque' : 'estos cheques'}. Pide a Contabilidad que lo configure.</div>
        ) : (
          <div role="radiogroup" aria-label="Autorizador">
            {authorizers.map((a) => (
              <button key={a.id} className="m-option" role="radio" aria-checked={authorizerId === a.id} onClick={() => setAuthorizerId(a.id)}>
                <span className="m-radio" />
                <span className="m-item-body">
                  <span className="m-item-title" style={{ display: 'block' }}>
                    {fullName(a)}
                  </span>
                  <span className="m-item-meta" style={{ display: 'block' }}>
                    {a.email}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}
