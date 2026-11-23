import { useCallback, useEffect, useRef, useState } from 'react';
import { App, Button, Segmented } from 'antd';
import { DeleteOutlined, FileTextOutlined, MailOutlined, PlusOutlined, ShareAltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import cashReceiptsApi, { type CashReceipt, type Check, type EmailSuggestion } from '../../api/cashReceipts';
import api from '../../api/axios';
import useAuthStore from '../../auth/useAuthStore';
import { EmptyState, ErrorState, Pill, SearchField, Sheet, SkeletonList } from '../ui';
import { fmtMoney } from '../format';
import { usePullToRefresh } from '../usePullToRefresh';

const PAGE = 20;
const CURRENCY: Record<number, string> = { 1: 'Q', 2: 'US$', 3: '€' };
const serieLetter = (s?: string | number) => {
  const n = Number(s);
  return n >= 1 && n <= 26 ? String.fromCharCode(64 + n) : String(s ?? '-');
};
const rcNumber = (r: CashReceipt) => `RC ${serieLetter(r.serie)}-${r.correlative ?? '—'}`;
const amountText = (r: CashReceipt) => {
  const c = Number(r.currency ?? 1);
  if (c === 1 || c === 2) return fmtMoney(Number(r.amount), c === 2);
  return `${CURRENCY[c] ?? ''} ${Number(r.amount).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;
};
// La fecha llega "YYYY-MM-DD..." y se guarda tal cual (ver bug −1 día): no pasar por Date()
const dateText = (d?: string) => (d ? dayjs(String(d).slice(0, 10)).format('D MMM YYYY').replace('.', '') : '—');
const isCash = (c: Check) => String(c.bank).toLowerCase() === 'efectivo';

// Igual que ListarRecibos: "RC B-25575" / "B25575" → serie + correlativo exactos
const RC_NUMBER_RE = /^\s*(?:RC[\s.:#-]*[A-E]?|[A-E])[\s.:#-]*\d+\s*$/i;
const parseReceiptNumber = (text: string) => {
  const raw = text.toUpperCase().replace(/^\s*RC[\s.:#-]*/, '');
  const digits = raw.replace(/\D/g, '');
  const letter = raw.match(/(?:^|[^A-Z])([A-E])(?=[^A-Z]|$)/)?.[1];
  return { correlative: digits || undefined, serie: letter ? letter.charCodeAt(0) - 64 : undefined };
};

const errMsg = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join('. ') : m || fallback;
};

// ------------------------------------------------------------------
// PDF: compartir (app nativa) o abrir (navegador)
// ------------------------------------------------------------------
const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

async function sharePdf(r: CashReceipt) {
  const { data } = await cashReceiptsApi.getPdf(r.id!);
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });
  const name = `${rcNumber(r).replace(/\s+/g, '_')}.pdf`;
  if (!Capacitor.isNativePlatform()) {
    window.open(URL.createObjectURL(blob), '_blank');
    return;
  }
  const file = await Filesystem.writeFile({ path: name, data: await blobToBase64(blob), directory: Directory.Cache });
  await Share.share({ title: rcNumber(r), url: file.uri, dialogTitle: 'Compartir recibo' });
}

// ------------------------------------------------------------------
// Enviar por correo (con sugerencias del backend)
// ------------------------------------------------------------------
function EmailSheet({ receipt, onClose }: { receipt: CashReceipt | null; onClose: () => void }) {
  const { message } = App.useApp();
  const [email, setEmail] = useState('');
  const [options, setOptions] = useState<EmailSuggestion[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (receipt) setEmail('');
  }, [receipt]);

  useEffect(() => {
    const q = email.trim();
    if (q.length < 2) {
      setOptions([]);
      return;
    }
    const t = window.setTimeout(() => {
      api
        .get<EmailSuggestion[]>('/cash-receipts/email-suggestions', { params: { q } })
        .then(({ data }) => setOptions(data.slice(0, 8)))
        .catch(() => setOptions([]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [email]);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const send = async () => {
    if (!receipt || !valid) return;
    setSending(true);
    try {
      await cashReceiptsApi.sendPdfByEmail(receipt.id!, email.trim());
      message.success(`Enviado a ${email.trim()}`);
      onClose();
    } catch (e) {
      message.error(errMsg(e, 'No se pudo enviar el correo'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet
      open={!!receipt}
      onClose={onClose}
      title="Enviar por correo"
      footer={
        <Button type="primary" block icon={<MailOutlined />} disabled={!valid} loading={sending} onClick={send} style={{ height: 48, fontWeight: 600 }}>
          Enviar PDF
        </Button>
      }
    >
      {receipt && (
        <p className="m-item-meta" style={{ marginTop: 0 }}>
          {rcNumber(receipt)} · {receipt.received_from}
        </p>
      )}
      <label className="m-field">
        <span>Correo</span>
        <input
          className="m-input"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@empresa.com"
        />
      </label>
      {options.length > 0 && (
        <div className="m-list" style={{ marginTop: -4 }}>
          {options.map((o) => (
            <div className="m-item" key={o.email}>
              <button className="m-row-btn" style={{ width: '100%', flexDirection: 'column', gap: 0 }} onClick={() => setEmail(o.email)}>
                <div className="m-item-title">{o.email}</div>
                <div className="m-item-meta">
                  {o.name || '—'} · {o.source}
                </div>
              </button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

// ------------------------------------------------------------------
// Crear recibo
// ------------------------------------------------------------------
type Payment = { kind: 'cheque' | 'efectivo'; number: string; bank: string; value: string };
const parseAmount = (v: string) => {
  const n = Number(v.replace(/,/g, '').trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

function CreateSheet({ open, onClose, onCreated }: { open: boolean; onClose: (created?: CashReceipt) => void; onCreated: () => void }) {
  const isSuperuser = useAuthStore((s) => s.is_superuser);
  const [currency, setCurrency] = useState<1 | 2>(1);
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [serie, setSerie] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ text: string; error?: string } | null>(null);
  const [receivedFrom, setReceivedFrom] = useState('');
  const [concept, setConcept] = useState('');
  const [bill, setBill] = useState('');
  const [nt, setNt] = useState('');
  const [iva, setIva] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [draft, setDraft] = useState<Payment>({ kind: 'cheque', number: '', bank: '', value: '' });
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setCurrency(1);
    setDate(dayjs().format('YYYY-MM-DD'));
    setSerie(null);
    setReceivedFrom('');
    setConcept('');
    setBill('');
    setNt('');
    setIva('');
    setPayments([]);
    setDraft({ kind: 'cheque', number: '', bank: '', value: '' });
    setTouched(false);
    setServerError(null);
  }, [open]);

  // Serie y correlativo que tocarán (la serie la fija el backend según el usuario)
  useEffect(() => {
    if (!open) return;
    if (isSuperuser && !serie) {
      setPreview({ text: 'Elige la serie' });
      return;
    }
    setPreview(null);
    cashReceiptsApi
      .getNextCorrelative(serie ?? undefined)
      .then(({ data }) => setPreview({ text: data.serie_letter ? `RC ${data.serie_letter}-${data.correlative}` : data.message || '—' }))
      .catch((e) => setPreview({ text: '—', error: errMsg(e, 'No tienes una serie de recibos asignada.') }));
  }, [open, serie, isSuperuser]);

  const total = payments.reduce((s, p) => s + (parseAmount(p.value) ?? 0), 0);
  const draftValue = parseAmount(draft.value);
  const draftOk = draftValue !== null && (draft.kind === 'efectivo' || (/^\d+$/.test(draft.number.trim()) && draft.bank.trim()));

  const addPayment = () => {
    if (!draftOk) return;
    setPayments((p) => [...p, { ...draft, number: draft.number.trim(), bank: draft.kind === 'efectivo' ? 'Efectivo' : draft.bank.trim() }]);
    setDraft({ kind: draft.kind, number: '', bank: draft.kind === 'cheque' ? draft.bank : '', value: '' });
  };

  const formError = preview?.error
    ? preview.error
    : isSuperuser && !serie
      ? 'Elige la serie.'
      : !date
        ? 'Elige la fecha.'
        : !receivedFrom.trim()
          ? 'Escribe de quién se recibe.'
          : !concept.trim()
            ? 'Escribe el concepto.'
            : payments.length === 0
              ? 'Agrega al menos un pago (cheque o efectivo).'
              : null;

  const submit = async () => {
    setTouched(true);
    // ref además del estado: dos toques rápidos crearían dos recibos
    if (formError || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setServerError(null);
    try {
      const { data } = await cashReceiptsApi.create({
        date, // string tal cual: nunca toISOString (bug −1 día)
        currency,
        received_from: receivedFrom.trim(),
        concept: concept.trim(),
        amount: Math.round(total * 100) / 100,
        bill_number: bill.trim() || undefined,
        work_note_number: nt.trim() || undefined,
        iva_exemption: iva.trim() || undefined,
        ...(isSuperuser && serie ? { serie } : {}),
        checks: payments.map((p) => ({
          number: p.kind === 'efectivo' ? '-' : p.number,
          bank: p.kind === 'efectivo' ? 'Efectivo' : p.bank,
          value: parseAmount(p.value) ?? 0,
        })),
      } as CashReceipt);
      onCreated();
      onClose(data as CashReceipt);
    } catch (e) {
      setServerError(errMsg(e, 'No se pudo crear el recibo. Intenta de nuevo.'));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const symbol = currency === 2 ? 'US$' : 'Q';

  return (
    <Sheet
      open={open}
      onClose={() => onClose()}
      title="Nuevo recibo"
      footer={
        <Button type="primary" block loading={sending} disabled={!!preview?.error} onClick={submit} style={{ height: 50, fontWeight: 600, fontSize: 16 }}>
          Crear recibo{total > 0 ? ` · ${fmtMoney(total, currency === 2)}` : ''}
        </Button>
      }
    >
      <div className={`m-note ${preview?.error ? 'danger' : ''}`} style={{ marginBottom: 16 }}>
        <b className="m-num">{preview ? preview.text : 'Calculando correlativo…'}</b>
        {preview?.error ? <div>{preview.error}</div> : <div className="m-item-meta">Número que tendrá el recibo</div>}
      </div>

      {isSuperuser && (
        <div className="m-field">
          <span>Serie</span>
          <div className="m-chips" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }} role="group" aria-label="Serie">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" className="m-chip" aria-pressed={serie === s} onClick={() => setSerie(s)}>
                {serieLetter(s)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="m-field-row">
        <div className="m-field">
          <span>Moneda</span>
          <div className="m-chips" style={{ gridTemplateColumns: '1fr 1fr' }} role="group" aria-label="Moneda">
            {([1, 2] as const).map((c) => (
              <button key={c} type="button" className="m-chip" style={{ height: 48 }} aria-pressed={currency === c} onClick={() => setCurrency(c)}>
                {c === 1 ? 'Q' : 'US$'}
              </button>
            ))}
          </div>
        </div>
        <label className="m-field">
          <span>Fecha</span>
          <input className="m-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      <label className="m-field">
        <span>Recibimos de</span>
        <input className="m-input" value={receivedFrom} onChange={(e) => setReceivedFrom(e.target.value)} autoCapitalize="words" />
      </label>
      <label className="m-field">
        <span>Por concepto de</span>
        <textarea className="m-input" value={concept} onChange={(e) => setConcept(e.target.value)} />
      </label>

      <div className="m-field">
        <span>Pagos</span>
        {payments.length > 0 && (
          <div className="m-list" style={{ marginBottom: 10 }}>
            {payments.map((p, i) => (
              <div className="m-item" key={i} style={{ alignItems: 'center' }}>
                <div className="m-item-body">
                  <div className="m-item-title">{p.kind === 'efectivo' ? 'Efectivo' : `Cheque ${p.number}`}</div>
                  {p.kind === 'cheque' && <div className="m-item-meta">{p.bank}</div>}
                </div>
                <div className="m-amount">
                  {symbol} {(parseAmount(p.value) ?? 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </div>
                <button type="button" className="m-sheet-close" aria-label="Quitar pago" onClick={() => setPayments((ps) => ps.filter((_, j) => j !== i))}>
                  <DeleteOutlined />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="m-note" style={{ padding: 12 }}>
          <Segmented
            block
            value={draft.kind}
            onChange={(v) => setDraft({ kind: v as Payment['kind'], number: '', bank: '', value: draft.value })}
            options={[
              { label: 'Cheque', value: 'cheque' },
              { label: 'Efectivo', value: 'efectivo' },
            ]}
            style={{ marginBottom: 10 }}
          />
          {draft.kind === 'cheque' && (
            <div className="m-field-row">
              <label className="m-field" style={{ marginBottom: 10 }}>
                <span>Cheque No.</span>
                <input className="m-input m-num" inputMode="numeric" value={draft.number} onChange={(e) => setDraft({ ...draft, number: e.target.value.replace(/\D/g, '') })} />
              </label>
              <label className="m-field" style={{ marginBottom: 10 }}>
                <span>Banco</span>
                <input className="m-input" value={draft.bank} onChange={(e) => setDraft({ ...draft, bank: e.target.value })} />
              </label>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <label className="m-field" style={{ flex: 1, marginBottom: 0 }}>
              <span>Valor ({symbol})</span>
              <input
                className="m-input m-num"
                inputMode="decimal"
                placeholder="0.00"
                value={draft.value}
                onChange={(e) => setDraft({ ...draft, value: e.target.value.replace(/[^\d.,]/g, '') })}
              />
            </label>
            <Button icon={<PlusOutlined />} disabled={!draftOk} onClick={addPayment} style={{ height: 48 }}>
              Agregar
            </Button>
          </div>
        </div>
      </div>

      <div className="m-field-row">
        <label className="m-field">
          <span>Factura No.</span>
          <input className="m-input" placeholder="Opcional" value={bill} onChange={(e) => setBill(e.target.value)} />
        </label>
        <label className="m-field">
          <span>NT No.</span>
          <input className="m-input m-num" inputMode="numeric" placeholder="Opcional" value={nt} onChange={(e) => setNt(e.target.value)} />
        </label>
      </div>
      <label className="m-field">
        <span>Exención de IVA</span>
        <input className="m-input" placeholder="Opcional" value={iva} onChange={(e) => setIva(e.target.value)} />
      </label>

      {touched && formError && !preview?.error && <div className="m-field-error" style={{ marginTop: -8, marginBottom: 12 }}>{formError}</div>}
      {serverError && (
        <div className="m-note danger" role="alert">
          {serverError}
        </div>
      )}
    </Sheet>
  );
}

// ------------------------------------------------------------------
// Pantalla
// ------------------------------------------------------------------
export default function MobileRecibos() {
  const { message } = App.useApp();
  const [items, setItems] = useState<CashReceipt[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [annulled, setAnnulled] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState<CashReceipt | null>(null);
  const [emailFor, setEmailFor] = useState<CashReceipt | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [sharing, setSharing] = useState<number | null>(null);
  const reqId = useRef(0);

  const fetchPage = useCallback(
    async (p: number) => {
      const q = query.trim();
      const asRc = q && RC_NUMBER_RE.test(q) ? parseReceiptNumber(q) : null;
      const { data } = await cashReceiptsApi.search({
        is_active: annulled ? '0' : '1',
        page: p,
        page_size: PAGE,
        sort: 'id',
        sort_dir: 'desc',
        ...(q && !asRc ? { q } : {}),
        ...(asRc?.serie ? { serie: asRc.serie } : {}),
        ...(asRc?.correlative ? { correlative: asRc.correlative } : {}),
      });
      return data;
    },
    [query, annulled],
  );

  const load = useCallback(async () => {
    const id = ++reqId.current;
    try {
      const data = await fetchPage(1);
      if (id !== reqId.current) return; // llegó una búsqueda más nueva
      setItems(data.items);
      setTotal(data.total);
      setPage(1);
      setError(false);
    } catch {
      if (id === reqId.current) setError(true);
    }
  }, [fetchPage]);

  useEffect(() => {
    setItems(null);
    load();
  }, [load]);
  const { indicator } = usePullToRefresh(load);

  const more = async () => {
    setLoadingMore(true);
    try {
      const data = await fetchPage(page + 1);
      setItems((prev) => [...(prev ?? []), ...data.items]);
      setPage(page + 1);
      setTotal(data.total);
    } catch {
      message.error('No se pudieron cargar más recibos');
    } finally {
      setLoadingMore(false);
    }
  };

  const doShare = async (r: CashReceipt) => {
    setSharing(r.id!);
    try {
      await sharePdf(r);
    } catch (e: any) {
      // Cerrar el menú de compartir sin elegir nada no es un error
      if (!/cancel/i.test(String(e?.message ?? ''))) message.error('No se pudo generar el PDF. Intenta de nuevo.');
    } finally {
      setSharing(null);
    }
  };

  if (error && !items) return <ErrorState text="Revisa tu conexión e intenta de nuevo." onRetry={load} />;

  return (
    <>
      {indicator}

      <div className="m-cta">
        <Button type="primary" icon={<PlusOutlined />} block onClick={() => setCreateOpen(true)}>
          Nuevo recibo
        </Button>
      </div>

      <div style={{ marginTop: 16 }}>
        <SearchField placeholder="RC B-25575, nombre, concepto, NT…" onSearch={setQuery} />
      </div>
      <Segmented
        block
        style={{ marginTop: 10 }}
        value={annulled ? 'anulados' : 'vigentes'}
        onChange={(v) => setAnnulled(v === 'anulados')}
        options={[
          { label: 'Vigentes', value: 'vigentes' },
          { label: 'Anulados', value: 'anulados' },
        ]}
      />

      {!items ? (
        <>
          <div className="m-heading">Recibos</div>
          <SkeletonList rows={4} />
        </>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FileTextOutlined />}
          title={query ? 'Sin resultados' : annulled ? 'Sin recibos anulados' : 'Sin recibos'}
          text={query ? 'Prueba con el número (RC B-25575), el nombre o el concepto.' : 'Los recibos de caja que crees aparecerán aquí.'}
        />
      ) : (
        <>
          <div className="m-heading">
            Recibos <small className="m-num">{total.toLocaleString('es-GT')}</small>
          </div>
          <div className="m-list">
            {items.map((r) => (
              <div className="m-item" key={r.id}>
                <button className="m-row-btn" style={{ width: '100%', flexDirection: 'column', gap: 0 }} onClick={() => setDetail(r)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, width: '100%' }}>
                    <div className="m-item-title">{r.received_from}</div>
                    <div className="m-amount">{amountText(r)}</div>
                  </div>
                  <div className="m-item-meta m-num">
                    {rcNumber(r)} · {dateText(r.date)}
                  </div>
                  {r.concept && <div className="m-item-desc">{r.concept}</div>}
                </button>
              </div>
            ))}
          </div>
          {items.length < total && (
            <Button block loading={loadingMore} onClick={more} style={{ height: 48, marginTop: 12, fontWeight: 600 }}>
              Cargar más
            </Button>
          )}
        </>
      )}

      <CreateSheet
        open={createOpen}
        onCreated={load}
        onClose={(created) => {
          setCreateOpen(false);
          if (created?.id) {
            message.success(`Recibo ${rcNumber(created)} creado`);
            setDetail(created);
          }
        }}
      />
      <EmailSheet receipt={emailFor} onClose={() => setEmailFor(null)} />

      <Sheet
        open={!!detail && !emailFor}
        onClose={() => setDetail(null)}
        title={detail ? rcNumber(detail) : ''}
        footer={
          detail && (
            <div className="m-sheet-actions">
              <Button icon={<MailOutlined />} onClick={() => setEmailFor(detail)}>
                Correo
              </Button>
              <Button type="primary" icon={<ShareAltOutlined />} loading={sharing === detail.id} onClick={() => doShare(detail)}>
                Compartir PDF
              </Button>
            </div>
          )
        }
      >
        {detail && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div className="m-amount" style={{ fontSize: 28 }}>
                {amountText(detail)}
              </div>
              {detail.active === false && <Pill tone="danger">Anulado</Pill>}
            </div>
            <dl className="m-dl">
              <div>
                <dt>Recibimos de</dt>
                <dd>{detail.received_from}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{dateText(detail.date)}</dd>
              </div>
              {detail.bill_number && (
                <div>
                  <dt>Factura</dt>
                  <dd className="m-num">{detail.bill_number}</dd>
                </div>
              )}
              {detail.work_note_number && (
                <div>
                  <dt>Nota de trabajo</dt>
                  <dd className="m-num">{detail.work_note_number}</dd>
                </div>
              )}
              {detail.iva_exemption && (
                <div>
                  <dt>Exención de IVA</dt>
                  <dd>{detail.iva_exemption}</dd>
                </div>
              )}
              {detail.creator?.username && (
                <div>
                  <dt>Creado por</dt>
                  <dd>{detail.creator.username}</dd>
                </div>
              )}
            </dl>
            {detail.concept && (
              <>
                <div className="m-heading" style={{ margin: '16px 0 6px' }}>
                  Concepto
                </div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', userSelect: 'text' }}>{detail.concept}</p>
              </>
            )}
            {!!detail.checks?.length && (
              <>
                <div className="m-heading" style={{ margin: '16px 0 6px' }}>
                  Pagos
                </div>
                <dl className="m-dl">
                  {detail.checks.map((c, i) => (
                    <div key={c.id ?? i}>
                      <dt>{isCash(c) ? 'Efectivo' : `Cheque ${c.number} · ${c.bank}`}</dt>
                      <dd className="m-num">{Number(c.value).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            {detail.active === false && detail.delete_reason && (
              <div className="m-note danger" style={{ marginTop: 16 }}>
                <b>Motivo de anulación</b>
                <div>{detail.delete_reason}</div>
              </div>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
