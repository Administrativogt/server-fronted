import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Button } from 'antd';
import { FileAddOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  createMoneyRequirement,
  getMoneyRequirements,
  sendAuthorizationEmail,
  type MoneyRequirement,
} from '../../api/moneyRequirements';
import { getAuthorizers, getTeams, type Authorizer, type Team } from '../../api/teams';
import { fullName } from '../../api/users';
import { EmptyState, ErrorState, Pill, Sheet, SkeletonList } from '../ui';
import { usePullToRefresh } from '../usePullToRefresh';
import { reqMoney as money } from '../format';

// Mismos estados que pages/money_req/List.tsx
const STATE: Record<number, { text: string; tone: 'warning' | 'success' | 'danger' | 'neutral' }> = {
  1: { text: 'Sin enviar', tone: 'neutral' },
  2: { text: 'Por autorizar', tone: 'warning' },
  3: { text: 'Autorizado', tone: 'success' },
  4: { text: 'Denegado', tone: 'danger' },
};
const stateOf = (r: MoneyRequirement) => STATE[Number(r.state)] ?? { text: 'Desconocido', tone: 'neutral' as const };

// La app trae los últimos meses; lo anterior se consulta en la web.
const MONTHS_BACK = 6;
const fmtDate = (d: string) => dayjs(d).format('D MMM YYYY').replace('.', '');

// ------------------------------------------------------------------
// Formulario
// ------------------------------------------------------------------
type Draft = {
  payableTo: string;
  workNoteNumber: string;
  amount: string;
  currency: 'GTQ' | 'USD';
  date: string;
  description: string;
  teamId: number | null;
  areaIds: number[];
  authorizerId: number | null;
};
const emptyDraft = (): Draft => ({
  payableTo: '',
  workNoteNumber: '',
  amount: '',
  currency: 'GTQ',
  date: dayjs().format('YYYY-MM-DD'),
  description: '',
  teamId: null,
  areaIds: [],
  authorizerId: null,
});

/** "1,250.50" → 1250.5; null si no es un monto válido mayor a 0. */
const parseAmount = (v: string): number | null => {
  const n = Number(v.replace(/,/g, '').replace(/\s/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

function CreateSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { message } = App.useApp();
  const [d, setD] = useState<Draft>(emptyDraft);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [authorizers, setAuthorizers] = useState<Authorizer[]>([]);
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState<'save' | 'send' | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  useEffect(() => {
    if (!open) return;
    setD(emptyDraft());
    setTouched(false);
    setServerError(null);
    if (teams) return;
    Promise.all([getTeams(), getAuthorizers()])
      .then(([t, a]) => {
        setTeams(t.sort((x, y) => x.name.localeCompare(y.name)));
        setAuthorizers(a);
      })
      .catch(() => setTeams([]));
  }, [open, teams]);

  const areas = useMemo(() => teams?.find((t) => t.id === d.teamId)?.areas ?? [], [teams, d.teamId]);
  // Igual que la web: el combo solo se parte en dos cuando llegan socios
  const authorizerGroups = useMemo(() => {
    const sorted = [...authorizers].sort((a, b) => fullName(a).localeCompare(fullName(b)));
    const socios = sorted.filter((u) => u.grupo === 'socios');
    if (!socios.length) return [{ label: '', list: sorted }];
    return [
      { label: 'Mi equipo', list: sorted.filter((u) => u.grupo !== 'socios') },
      { label: 'Socios', list: socios },
    ].filter((g) => g.list.length);
  }, [authorizers]);

  const amount = parseAmount(d.amount);
  const formError = !d.payableTo.trim()
    ? 'Escribe a nombre de quién va el cheque.'
    : amount === null
      ? 'Escribe un monto válido.'
      : !d.date
        ? 'Elige la fecha.'
        : !d.description.trim()
          ? 'Escribe una descripción.'
          : !d.teamId
            ? 'Elige el equipo.'
            : areas.length > 0 && d.areaIds.length === 0
              ? 'Elige al menos un área de práctica.'
              : !d.authorizerId
                ? 'Elige quién autoriza.'
                : null;

  const submit = async (andSend: boolean) => {
    setTouched(true);
    if (formError || amount === null) return;
    setSending(andSend ? 'send' : 'save');
    setServerError(null);
    try {
      const created: MoneyRequirement = await createMoneyRequirement({
        payableTo: d.payableTo.trim(),
        workNoteNumber: d.workNoteNumber.trim() || undefined,
        amount,
        currency: d.currency,
        date: d.date,
        description: d.description.trim(),
        teamId: d.teamId ?? undefined,
        areaIds: d.areaIds.length ? d.areaIds : undefined,
        responsibleForAuthorizingId: d.authorizerId ?? undefined,
      });
      if (andSend) {
        const email = authorizers.find((u) => u.id === d.authorizerId)?.email;
        if (created?.id && email) {
          await sendAuthorizationEmail(email, [created.id]);
          message.success('Requerimiento creado y enviado a autorizar');
        } else {
          message.warning('Se creó, pero quien autoriza no tiene correo. Envíalo desde la web.');
        }
      } else {
        message.success('Requerimiento guardado sin enviar');
      }
      onCreated();
      onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      setServerError(Array.isArray(m) ? m.join('. ') : m || 'No se pudo crear el requerimiento. Intenta de nuevo.');
    } finally {
      setSending(null);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nuevo requerimiento"
      footer={
        <div className="m-sheet-actions">
          <Button disabled={!!sending} loading={sending === 'save'} onClick={() => submit(false)}>
            Solo guardar
          </Button>
          <Button type="primary" icon={<SendOutlined />} disabled={!!sending} loading={sending === 'send'} onClick={() => submit(true)}>
            Crear y enviar
          </Button>
        </div>
      }
    >
      <label className="m-field">
        <span>Cheque a nombre de</span>
        <input className="m-input" value={d.payableTo} onChange={(e) => set({ payableTo: e.target.value })} autoCapitalize="words" />
      </label>

      <div className="m-field-row">
        <label className="m-field">
          <span>Monto</span>
          <input
            className="m-input m-num"
            inputMode="decimal"
            placeholder="1,000.00"
            value={d.amount}
            onChange={(e) => set({ amount: e.target.value.replace(/[^\d.,]/g, '') })}
          />
        </label>
        <div className="m-field">
          <span>Moneda</span>
          <div className="m-chips" style={{ gridTemplateColumns: '1fr 1fr' }} role="group" aria-label="Moneda">
            {(['GTQ', 'USD'] as const).map((c) => (
              <button key={c} type="button" className="m-chip" style={{ height: 48 }} aria-pressed={d.currency === c} onClick={() => set({ currency: c })}>
                {c === 'GTQ' ? 'Q' : 'US$'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="m-field-row">
        <label className="m-field">
          <span>Fecha</span>
          <input className="m-input" type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} />
        </label>
        <label className="m-field">
          <span>NT</span>
          <input className="m-input m-num" inputMode="numeric" placeholder="Opcional" value={d.workNoteNumber} onChange={(e) => set({ workNoteNumber: e.target.value })} />
        </label>
      </div>

      <label className="m-field">
        <span>Descripción</span>
        <textarea className="m-input" value={d.description} onChange={(e) => set({ description: e.target.value })} maxLength={1000} />
      </label>

      <label className="m-field">
        <span>Equipo</span>
        <select
          className="m-input"
          value={d.teamId ?? ''}
          disabled={!teams}
          onChange={(e) => set({ teamId: e.target.value ? Number(e.target.value) : null, areaIds: [] })}
        >
          <option value="">{teams ? 'Elige el equipo' : 'Cargando…'}</option>
          {teams?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      {areas.length > 0 && (
        <div className="m-field">
          <span>Área de práctica</span>
          <div className="m-chips wrap" role="group" aria-label="Área de práctica">
            {areas.map((a) => {
              const on = d.areaIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  className="m-chip"
                  aria-pressed={on}
                  onClick={() => set({ areaIds: on ? d.areaIds.filter((x) => x !== a.id) : [...d.areaIds, a.id] })}
                >
                  {a.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <label className="m-field">
        <span>Quién autoriza</span>
        <select className="m-input" value={d.authorizerId ?? ''} onChange={(e) => set({ authorizerId: e.target.value ? Number(e.target.value) : null })}>
          <option value="">{authorizers.length ? 'Elige quién autoriza' : 'Tu equipo no tiene autorizadores'}</option>
          {authorizerGroups.map((g) =>
            g.label ? (
              <optgroup key={g.label} label={g.label}>
                {g.list.map((u) => (
                  <option key={u.id} value={u.id}>
                    {fullName(u)}
                  </option>
                ))}
              </optgroup>
            ) : (
              g.list.map((u) => (
                <option key={u.id} value={u.id}>
                  {fullName(u)}
                </option>
              ))
            ),
          )}
        </select>
      </label>

      {touched && formError && <div className="m-field-error" style={{ marginTop: -8, marginBottom: 12 }}>{formError}</div>}
      {serverError && (
        <div className="m-note danger" role="alert">
          {serverError}
        </div>
      )}
    </Sheet>
  );
}

// ------------------------------------------------------------------
// Lista
// ------------------------------------------------------------------
export default function MobileMisRequerimientos() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<MoneyRequirement[] | null>(null);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState<MoneyRequirement | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const range = {
      scope: 'own',
      startDate: dayjs().subtract(MONTHS_BACK, 'month').startOf('month').format('YYYY-MM-DD'),
      endDate: dayjs().add(1, 'year').format('YYYY-MM-DD'),
    };
    try {
      // Sin `state` el backend trae 1, 2 y 3; los denegados (4) van aparte
      const [base, denied] = await Promise.all([getMoneyRequirements(range), getMoneyRequirements({ ...range, state: 4 })]);
      setRows([...base, ...denied]);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  const { indicator } = usePullToRefresh(load);

  const groups = useMemo(() => {
    const byDate = (a: MoneyRequirement, b: MoneyRequirement) => b.date.localeCompare(a.date) || b.id - a.id;
    const list = rows ?? [];
    return {
      open: list.filter((r) => [1, 2].includes(Number(r.state))).sort(byDate),
      done: list.filter((r) => [3, 4].includes(Number(r.state))).sort(byDate),
    };
  }, [rows]);

  // Reenvía al autorizador que ya tiene asignado (pasa a "Por autorizar")
  const requestAuthorization = async (r: MoneyRequirement) => {
    setSendingId(r.id);
    try {
      const auth = await getAuthorizers(true);
      const email = auth.find((u) => u.id === Number(r.responsibleForAuthorizingId))?.email;
      if (!email) {
        message.warning('No encontramos el correo de quien autoriza. Envíalo desde la web.');
        return;
      }
      await sendAuthorizationEmail(email, [r.id]);
      message.success(`Enviado a ${r.responsibleName ?? 'autorizar'}`);
      setDetail(null);
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo enviar. Intenta de nuevo.');
    } finally {
      setSendingId(null);
    }
  };

  if (error && !rows) return <ErrorState text="Revisa tu conexión e intenta de nuevo." onRetry={load} />;

  const row = (r: MoneyRequirement) => {
    const st = stateOf(r);
    return (
      <div className="m-item" key={r.id}>
        <button className="m-row-btn" style={{ width: '100%', flexDirection: 'column', gap: 0 }} onClick={() => setDetail(r)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, width: '100%' }}>
            <div className="m-item-title">{r.payableTo}</div>
            <div className="m-amount">{money(r)}</div>
          </div>
          <div className="m-item-meta" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, width: '100%' }}>
            <span className="m-num">
              {r.correlative} · {fmtDate(r.date)}
            </span>
            <Pill tone={st.tone}>{st.text}</Pill>
          </div>
          {r.responsibleName && <div className="m-item-meta">Autoriza: {r.responsibleName}</div>}
        </button>
      </div>
    );
  };

  return (
    <>
      {indicator}

      <div className="m-cta">
        <Button type="primary" icon={<PlusOutlined />} block onClick={() => setCreateOpen(true)}>
          Nuevo requerimiento
        </Button>
      </div>

      {!rows ? (
        <>
          <div className="m-heading">Mis requerimientos</div>
          <SkeletonList rows={3} />
        </>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<FileAddOutlined />}
          title="Sin requerimientos recientes"
          text={`Aquí verás los requerimientos de dinero que pidas. Mostramos los últimos ${MONTHS_BACK} meses.`}
        />
      ) : (
        <>
          {groups.open.length > 0 && (
            <>
              <div className="m-heading">
                En proceso <small>{groups.open.length}</small>
              </div>
              <div className="m-list">{groups.open.map(row)}</div>
            </>
          )}
          {groups.done.length > 0 && (
            <>
              <div className="m-heading">Resueltos</div>
              <div className="m-list">{groups.done.map(row)}</div>
            </>
          )}
          <p className="m-item-meta" style={{ textAlign: 'center', margin: '16px 0 0' }}>
            Últimos {MONTHS_BACK} meses. Lo anterior está en la web.
          </p>
        </>
      )}

      <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />

      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.payableTo}
        footer={
          detail &&
          Number(detail.state) === 1 &&
          detail.responsibleForAuthorizingId && (
            <Button
              type="primary"
              block
              icon={<SendOutlined />}
              loading={sendingId === detail.id}
              onClick={() => requestAuthorization(detail)}
              style={{ height: 48, fontWeight: 600 }}
            >
              Pedir autorización
            </Button>
          )
        }
      >
        {detail && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <div className="m-amount" style={{ fontSize: 28 }}>
                {money(detail)}
              </div>
              <Pill tone={stateOf(detail).tone}>{stateOf(detail).text}</Pill>
            </div>
            <dl className="m-dl">
              <div>
                <dt>Correlativo</dt>
                <dd className="m-num">{detail.correlative}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{fmtDate(detail.date)}</dd>
              </div>
              <div>
                <dt>Autoriza</dt>
                <dd>{detail.responsibleName ?? '—'}</dd>
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
            {Number(detail.state) === 1 && (
              <div className="m-note" style={{ marginTop: 16 }}>
                Este requerimiento está guardado pero todavía no se ha enviado a autorizar.
              </div>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
