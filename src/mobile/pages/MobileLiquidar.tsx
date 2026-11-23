// Liquidar un cheque desde el teléfono: mismo flujo y mismas reglas que
// pages/cheques/LiquidacionCheque.tsx (POST /checks/:id/liquidate, que
// escribe en Sirvo). Diferencia: el comprobante se puede tomar con la cámara,
// y las fotos se reducen antes de subirlas.
import { useEffect, useRef, useState } from 'react';
import { App, Button } from 'antd';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CameraOutlined, CheckOutlined, DeleteOutlined, PaperClipOutlined } from '@ant-design/icons';
import { getCheckEntities, getInmobiliarioExpenses, getLitigioExpenses, liquidateCheck } from '../../api/checks';
import type { CheckEntity, CheckRequest } from '../../types/checks.types';
import { MAX_UPLOAD_MB, MENSAJE_413, validarPesoArchivo } from '../../utils/upload';
import { Sheet } from '../ui';
import { money } from '../format';

type Expense = { id: number; receipt_number?: string | number; receipt_value?: string | number; client?: string };

/** Foto → JPEG de máximo 2000 px por lado (una foto de teléfono pesa 4–10 MB). */
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

/** Mismo mapeo de errores que la web: Sirvo y las validaciones devuelven textos variados. */
function liquidationError(error: any): string {
  if (!error?.response) return 'No se pudo conectar al servidor. Verifica tu conexión e intenta de nuevo.';
  if (error.response.status === 413) return MENSAJE_413;
  const err = error.response.data;
  const raw: string =
    typeof err === 'string' ? err : Array.isArray(err?.message) ? err.message.join(', ') : err?.message || err?.error || '';
  const msg = raw.toLowerCase();
  if (msg.includes('gladys'))
    return `No se puede liquidar: ${raw}. Verifica que el número de recibo, serie y monto coincidan con el gasto registrado en Gastos Litigio.`;
  if (msg.includes('marina'))
    return `No se puede liquidar: ${raw}. Verifica que el número de recibo, serie y monto coincidan con el gasto registrado en Gastos Inmobiliarios.`;
  if (['duplicate', 'unique', 'ya existe', 'ya fue utilizado', 'numero_factura', 'numero de comprobante'].some((k) => msg.includes(k)))
    return 'El número de comprobante ya fue utilizado en otra liquidación. Verifica e ingresa un número diferente.';
  if (msg.includes('pagina') || msg.includes('pdf')) return raw;
  if (msg.includes('monto') || msg.includes('valor')) return `Error en el monto: ${raw}`;
  if (msg.includes('entidad') || msg.includes('entity')) return `Error con la entidad: ${raw}`;
  if (msg.includes('permisos')) return 'No tienes permisos para liquidar esta solicitud.';
  if (msg.includes('pendiente de liquidacion') || msg.includes('estado')) return 'La solicitud no está pendiente de liquidación.';
  if (msg.includes('sirvo') || msg.includes('conexion') || msg.includes('timeout')) return `Error de comunicación con Sirvo: ${raw}`;
  return raw || 'No se pudo liquidar. Intenta de nuevo.';
}

type Draft = {
  numero: string;
  serie: string;
  entityId: number | null;
  valor: string;
  nit: string;
  nombre: string;
  direccion: string;
};

export type LiquidateResult = { remaining: CheckRequest | null; partial: boolean; entityId: number | null };

export default function LiquidateSheet({
  check,
  keepEntityId,
  onClose,
  onDone,
}: {
  check: CheckRequest | null;
  keepEntityId?: number | null;
  onClose: () => void;
  onDone: (r: LiquidateResult) => void;
}) {
  const { message } = App.useApp();
  const [entities, setEntities] = useState<CheckEntity[] | null>(null);
  const [d, setD] = useState<Draft | null>(null);
  const [changeInvoice, setChangeInvoice] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [inmo, setInmo] = useState<Expense[]>([]);
  const [lit, setLit] = useState<Expense[]>([]);
  const [inmoIds, setInmoIds] = useState<number[]>([]);
  const [litIds, setLitIds] = useState<number[]>([]);
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const set = (p: Partial<Draft>) => setD((x) => (x ? { ...x, ...p } : x));

  useEffect(() => {
    if (entities) return;
    getCheckEntities()
      .then(setEntities)
      .catch(() => setEntities([]));
  }, [entities]);

  // Valores iniciales: los mismos que pone la web al abrir el modal
  useEffect(() => {
    if (!check) return;
    setD({
      numero: check.document_number ? String(check.document_number) : '',
      serie: check.document_serie || '',
      entityId: keepEntityId ?? null,
      valor: String(Number(check.total_value) || ''),
      nit: check.invoice_nit || 'CF',
      nombre: check.invoice_name || check.client_name || check.client || '',
      direccion: check.invoice_adress || 'CIUDAD',
    });
    setChangeInvoice(false);
    setFile(null);
    setInmo([]);
    setLit([]);
    setInmoIds([]);
    setLitIds([]);
    setTouched(false);
    setServerError(null);
    // Gastos aceptados (state 1) del cheque; si fallan no bloquean la liquidación
    Promise.all([
      getInmobiliarioExpenses({ request_id: check.request_id, state: 1, per_page: 100 }),
      getLitigioExpenses({ request_id: check.request_id, state: 1, per_page: 100 }),
    ])
      .then(([a, b]) => {
        setInmo((a?.data ?? []) as Expense[]);
        setLit((b?.data ?? []) as Expense[]);
      })
      .catch(() => undefined);
  }, [check, keepEntityId]);

  // La web arranca con la primera entidad del catálogo (o 12)
  useEffect(() => {
    if (d && d.entityId === null && entities) set({ entityId: entities[0]?.id ?? 12 });
  }, [d, entities]);

  // En la app nativa la cámara se abre con el plugin oficial (el <input capture>
  // dentro del WebView no es confiable: en Android 11+ y en iOS no abría nada).
  const takePhoto = async () => {
    const hide = message.loading('Abriendo cámara…', 0);
    try {
      // Pedir el permiso explícito: si el sistema lo niega no hay ventana de cámara
      let perm = await Camera.checkPermissions();
      if (perm.camera === 'prompt' || perm.camera === 'prompt-with-rationale') perm = await Camera.requestPermissions({ permissions: ['camera'] });
      if (perm.camera === 'denied') {
        hide();
        message.error('La app no tiene permiso de cámara. Actívalo en Ajustes → Administrativo → Cámara.', 8);
        return;
      }
      const photoPromise = Camera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.Uri,
        quality: 80,
        width: 2000,
        correctOrientation: true,
        saveToGallery: false,
      });
      const photo = await photoPromise;
      hide();
      if (!photo.webPath) return;
      const blob = await (await fetch(photo.webPath)).blob();
      const ext = photo.format === 'png' ? 'png' : 'jpg';
      await pickFile(new File([blob], `comprobante_${check?.request_id ?? ''}.${ext}`, { type: ext === 'png' ? 'image/png' : 'image/jpeg' }));
    } catch (e: any) {
      hide();
      const msg = String(e?.message ?? e ?? '');
      if (/cancel/i.test(msg)) return; // cerró la cámara sin tomar foto
      if (/denied|permission/i.test(msg)) {
        message.error('La app no tiene permiso de cámara. Actívalo en los ajustes del teléfono.', 8);
        return;
      }
      message.error(`No se pudo abrir la cámara: ${msg}`, 8);
    }
  };

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    const okType = ['application/pdf', 'image/png', 'image/jpeg'].includes(f.type) || /\.(pdf|png|jpe?g)$/i.test(f.name);
    if (!okType) {
      message.error(`"${f.name}" no es un formato permitido. Usa PDF, PNG o JPG.`);
      return;
    }
    setPreparing(true);
    const ready = await shrinkImage(f);
    setPreparing(false);
    const pesoError = validarPesoArchivo(ready);
    if (pesoError) {
      message.error(pesoError, 8);
      return;
    }
    setFile(ready);
  };

  const valor = d ? Number(d.valor.replace(/,/g, '')) : NaN;
  const totalCheck = check ? Number(check.total_value) : 0;
  const partial = Number.isFinite(valor) && valor > 0 && valor < totalCheck;
  const formError = !d
    ? null
    : !/^\d+$/.test(d.numero.trim())
      ? 'Escribe el número de comprobante (solo números).'
      : !d.entityId
        ? 'Elige la entidad.'
        : !Number.isFinite(valor) || valor <= 0
          ? 'Escribe un monto válido (ej. 1500.00).'
          : valor > totalCheck + 0.001
            ? `El monto no puede ser mayor al del cheque (${money(totalCheck, check?.currency_code)}).`
            : null;

  const submit = async () => {
    setTouched(true);
    if (!check || !d || formError || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setServerError(null);
    const values: Record<string, string | number> = {
      entity_id: d.entityId!,
      codigo_tipo_documento: 'COMP',
      serie_factura: d.serie.trim(),
      numero_factura: d.numero.trim(),
      nit_factura: d.nit.trim(),
      nombre_factura: d.nombre.trim(),
      direccion_factura: d.direccion.trim(),
      valor_total: Math.round(valor * 100) / 100,
      descripcion: check.description,
    };
    try {
      let result;
      if (file) {
        const fd = new FormData();
        Object.entries(values).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') fd.append(k, String(v));
        });
        inmoIds.forEach((id) => fd.append('expense_ids[]', String(id)));
        litIds.forEach((id) => fd.append('litigio_expense_ids[]', String(id)));
        fd.append('document', file);
        result = await liquidateCheck(check.request_id, fd);
      } else {
        result = await liquidateCheck(check.request_id, {
          ...(values as any),
          expense_ids: inmoIds.length ? inmoIds : undefined,
          litigio_expense_ids: litIds.length ? litIds : undefined,
        });
      }
      onDone({ remaining: result?.remaining_check ?? null, partial, entityId: d.entityId });
    } catch (e) {
      setServerError(liquidationError(e));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const expenseList = (title: string, list: Expense[], ids: number[], setIds: (f: (x: number[]) => number[]) => void) =>
    list.length > 0 && (
      <div className="m-field">
        <span>{title}</span>
        <div className="m-list">
          {list.map((x) => {
            const on = ids.includes(x.id);
            return (
              <div className="m-item" key={x.id}>
                <label className="m-row-btn m-check-row" style={{ width: '100%' }}>
                  <input type="checkbox" checked={on} onChange={() => setIds((p) => (on ? p.filter((i) => i !== x.id) : [...p, x.id]))} />
                  <span>
                    Recibo {x.receipt_number} · Q{Number(x.receipt_value).toFixed(2)}
                    {x.client ? <div className="m-item-meta">{x.client}</div> : null}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </div>
    );

  return (
    <Sheet
      open={!!check}
      onClose={onClose}
      title="Liquidar cheque"
      tall
      footer={
        <Button type="primary" block icon={<CheckOutlined />} loading={sending} disabled={preparing} onClick={submit} style={{ height: 50, fontWeight: 600, fontSize: 16 }}>
          {partial ? 'Liquidar parcial' : 'Liquidar'}
          {Number.isFinite(valor) && valor > 0 ? ` · ${money(valor, check?.currency_code)}` : ''}
        </Button>
      }
    >
      {check && d && (
        <>
          <div className="m-note warning" style={{ marginBottom: 16 }}>
            <b>Se registra en Sirvo al instante.</b>
            <div>No se puede liquidar con recibo simple, salvo que tenga sello de la entidad que lo emite.</div>
          </div>

          <dl className="m-dl" style={{ marginBottom: 16 }}>
            <div>
              <dt>ID Sirvo</dt>
              <dd className="m-num">{check.request_id}</dd>
            </div>
            <div>
              <dt>Valor del cheque</dt>
              <dd className="m-num">{money(check.total_value, check.currency_code)}</dd>
            </div>
          </dl>

          {/* Comprobante */}
          <div className="m-field">
            <span>Comprobante</span>
            {file ? (
              <div className="m-item" style={{ alignItems: 'center', border: '1px solid var(--m-border)', borderRadius: 10 }}>
                <PaperClipOutlined />
                <div className="m-item-body">
                  <div className="m-item-title" style={{ wordBreak: 'break-all' }}>{file.name}</div>
                  <div className="m-item-meta">{(file.size / 1024 / 1024).toFixed(1)} MB{file.type.startsWith('image/') ? ' · se convierte a PDF' : ''}</div>
                </div>
                <button type="button" className="m-sheet-close" aria-label="Quitar comprobante" onClick={() => setFile(null)}>
                  <DeleteOutlined />
                </button>
              </div>
            ) : (
              // El input va DENTRO de la etiqueta y solo oculto visualmente: el toque
              // abre la cámara de forma nativa. Con display:none + .click() desde
              // código, el WebView (sobre todo iOS) no abre la cámara.
              <div className="m-sheet-actions">
                {Capacitor.isNativePlatform() ? (
                  <Button type="primary" icon={<CameraOutlined />} loading={preparing} onClick={takePhoto} style={{ flex: 1, height: 48, fontWeight: 600 }}>
                    Tomar foto
                  </Button>
                ) : (
                  <label className={`m-file-btn primary ${preparing ? 'busy' : ''}`}>
                    <CameraOutlined />
                    {preparing ? 'Preparando…' : 'Tomar foto'}
                    <input
                      className="m-visually-hidden"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={preparing}
                      onChange={(e) => {
                        pickFile(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
                <label className={`m-file-btn ${preparing ? 'busy' : ''}`}>
                  <PaperClipOutlined />
                  Elegir archivo
                  <input
                    className="m-visually-hidden"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    disabled={preparing}
                    onChange={(e) => {
                      pickFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            )}
            <div className="m-item-meta" style={{ marginTop: 6 }}>PDF, PNG o JPG · máximo {MAX_UPLOAD_MB} MB</div>
          </div>

          <div className="m-field-row">
            <label className="m-field">
              <span>No. de comprobante</span>
              <input
                className="m-input m-num"
                inputMode="numeric"
                maxLength={20}
                value={d.numero}
                onChange={(e) => set({ numero: e.target.value.replace(/\D/g, '') })}
              />
            </label>
            <label className="m-field">
              <span>Serie</span>
              <input className="m-input" maxLength={40} placeholder="Opcional" value={d.serie} onChange={(e) => set({ serie: e.target.value })} />
            </label>
          </div>

          <label className="m-field">
            <span>Entidad</span>
            <select className="m-input" value={d.entityId ?? ''} disabled={!entities} onChange={(e) => set({ entityId: e.target.value ? Number(e.target.value) : null })}>
              {!entities && <option value="">Cargando…</option>}
              {entities?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>

          <label className="m-field">
            <span>Monto a liquidar</span>
            <input
              className="m-input m-num"
              inputMode="decimal"
              value={d.valor}
              onChange={(e) => set({ valor: e.target.value.replace(/[^\d.]/g, '') })}
            />
          </label>
          {partial && (
            <div className="m-note" style={{ marginTop: -6, marginBottom: 16 }}>
              <b>Liquidación parcial</b>
              <div className="m-item-meta">
                Sirvo crea un ID nuevo con el saldo de {money(totalCheck - valor, check.currency_code)} para el siguiente comprobante.
              </div>
            </div>
          )}

          <label className="m-check-row" style={{ marginBottom: 16 }}>
            <input type="checkbox" checked={changeInvoice} onChange={(e) => setChangeInvoice(e.target.checked)} />
            <span>Cambiar datos de factura</span>
          </label>
          {changeInvoice ? (
            <>
              <label className="m-field">
                <span>NIT</span>
                <input className="m-input" maxLength={30} value={d.nit} onChange={(e) => set({ nit: e.target.value })} />
              </label>
              <label className="m-field">
                <span>Factura a nombre de</span>
                <input className="m-input" maxLength={200} value={d.nombre} onChange={(e) => set({ nombre: e.target.value })} />
              </label>
              <label className="m-field">
                <span>Dirección</span>
                <input className="m-input" maxLength={300} value={d.direccion} onChange={(e) => set({ direccion: e.target.value })} />
              </label>
            </>
          ) : (
            <p className="m-item-meta" style={{ marginTop: -8 }}>
              Factura: {d.nit} · {d.nombre} · {d.direccion}
            </p>
          )}

          {expenseList('Gastos inmobiliarios aceptados', inmo, inmoIds, setInmoIds)}
          {expenseList('Gastos litigio aceptados', lit, litIds, setLitIds)}

          {touched && formError && <div className="m-field-error" style={{ marginBottom: 12 }}>{formError}</div>}
          {serverError && (
            <div className="m-note danger" role="alert">
              {serverError}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
