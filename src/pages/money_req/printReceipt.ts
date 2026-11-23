import type { MoneyRequirement } from '../../api/moneyRequirements';
import { CONSORTIUM_LOGO } from './consortiumLogo';

const STATE_LABEL: Record<number, string> = {
  1: 'Creado',
  2: 'Pendiente de autorización',
  3: 'Autorizado',
  4: 'Rechazado',
  5: 'Anulado',
  6: 'Finalizado',
};

const CURRENCY_NAME: Record<string, string> = {
  Q: 'Quetzales',
  GTQ: 'Quetzales',
  $: 'Dólares',
  USD: 'Dólares',
  '€': 'Euros',
  EUR: 'Euros',
};

// El backend guarda la moneda como número (1=Q, 2=$, 3=€); el texto es legado
const esUSD = (c: unknown) => c === 'USD' || c === '$' || Number(c) === 2;
const esEUR = (c: unknown) => c === 'EUR' || c === '€' || Number(c) === 3;

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (r: MoneyRequirement): string => {
  const sym = esUSD(r.currency) ? '$' : esEUR(r.currency) ? '€' : 'Q';
  return `${sym} ${Number(r.amount).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fecha = (v?: string): string => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return esc(v);
  return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' });
};

/**
 * Abre una ventana con el comprobante del requerimiento de dinero, con la
 * identidad de Consortium Legal, y lanza el diálogo de impresión. No depende
 * del backend: se arma con los datos que ya tiene la lista.
 */
export function printMoneyRequirement(r: MoneyRequirement): void {
  const currencyName = esUSD(r.currency)
    ? 'Dólares'
    : esEUR(r.currency)
      ? 'Euros'
      : (CURRENCY_NAME[r.currency] ?? 'Quetzales');
  const stateLabel = STATE_LABEL[r.state] ?? '—';

  // El backend manda las áreas como arreglo (areaNames) y como texto ya unido
  // (areaName). Un requerimiento puede tener varias, por eso el rótulo cambia.
  const areas = r.areaNames?.length
    ? r.areaNames
    : r.areaName
      ? r.areaName.split(',').map((a) => a.trim()).filter(Boolean)
      : [];
  const areaLabel = areas.length > 1 ? 'Áreas' : 'Área';
  const areaText = areas.join(' · ');

  const field = (label: string, value: string, opts?: { wide?: boolean; strong?: boolean }) => `
      <div class="row${opts?.wide ? ' wide' : ''}">
        <span class="label">${esc(label)}</span>
        <span class="value${opts?.strong ? ' strong' : ''}">${value || '—'}</span>
      </div>`;

  // Línea de tiempo según el estado: 1-2 pendiente, 3 autorizado, 4 rechazado,
  // 5 anulado, 6 finalizado.
  const st = Number(r.state);
  const authorizedDone = st === 3 || st === 6;
  const secondStep =
    st === 4
      ? { name: 'Rechazado', cls: 'no', meta: esc(r.responsibleName) || '—' }
      : st === 5
        ? { name: 'Anulado', cls: 'no', meta: '—' }
        : {
            name: 'Autorizado',
            cls: authorizedDone ? '' : 'off',
            meta: authorizedDone ? esc(r.responsibleName) || '—' : 'Pendiente',
          };
  const badgeCls = st === 6 ? 'fin' : st === 4 || st === 5 ? 'no' : st === 3 ? '' : 'pend';

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Requerimiento ${esc(r.correlative)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@500;600;700&family=Source+Sans+3:wght@400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root { --navy:#14294b; --ink:#0f1b33; --muted:#5b6b82; --border:#e3e8f0; --line:#eef2f7; --green:#15803d; --red:#b91c1c; }
  html, body {
    font-family: 'Source Sans 3', system-ui, -apple-system, sans-serif;
    color: var(--ink); background: #eef2f7; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet { max-width: 720px; margin: 32px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 40px rgba(20,41,75,.10); }
  .head { display: flex; align-items: center; justify-content: space-between; padding: 28px 40px 22px; border-bottom: 1px solid var(--border); }
  .head img { height: 38px; width: auto; display: block; }
  .doc { text-align: right; }
  .kicker { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .1em; }
  .corr { font-family: 'Lexend', sans-serif; font-size: 20px; font-weight: 600; color: var(--navy); font-variant-numeric: tabular-nums; margin-top: 2px; }
  .title { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; padding: 24px 40px 0; }
  .title h1 { font-family: 'Lexend', sans-serif; font-size: 22px; font-weight: 600; }
  .title .date { font-size: 14px; color: var(--muted); margin-top: 2px; }
  .badge { display: inline-block; padding: 5px 12px; border-radius: 999px; font-size: 13px; font-weight: 700; background: #dcfce7; color: #166534; white-space: nowrap; }
  .badge.fin { background: #e2e8f0; color: var(--navy); }
  .badge.no { background: #fee2e2; color: #991b1b; }
  .badge.pend { background: #fef3c7; color: #92400e; }
  .amount { margin: 20px 40px; padding: 20px 24px; background: var(--navy); border-radius: 14px; display: flex; justify-content: space-between; align-items: center; }
  .amount .lbl { font-size: 12px; font-weight: 700; color: #b8c4d9; text-transform: uppercase; letter-spacing: .1em; }
  .amount .cur { font-size: 13px; color: #b8c4d9; }
  .amount .num { font-family: 'Lexend', sans-serif; font-size: 32px; font-weight: 600; color: #fff; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  .grid { padding: 0 40px; display: grid; grid-template-columns: 1fr 1fr; column-gap: 32px; }
  .row { padding: 12px 0; border-bottom: 1px solid var(--line); display: flex; flex-direction: column; gap: 2px; }
  .row.wide { grid-column: span 2; }
  .grid .row:last-child { border-bottom: none; }
  .label { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
  .value { font-size: 15px; line-height: 1.5; white-space: pre-wrap; }
  .value.strong { font-size: 16px; font-weight: 700; }
  .steps { margin: 16px 40px 0; border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .step .n { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; }
  .step .n::before { content: ''; width: 10px; height: 10px; border-radius: 50%; background: var(--green); }
  .step.off .n { color: var(--muted); }
  .step.off .n::before { background: #cbd5e1; }
  .step.no .n::before { background: var(--red); }
  .step .m { font-size: 13px; color: var(--muted); margin-top: 4px; }
  .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; padding: 48px 40px 24px; }
  .sign { text-align: center; }
  .sign .line { border-top: 1.5px solid var(--ink); margin-bottom: 6px; }
  .sign .who { font-size: 14px; font-weight: 700; }
  .sign .role { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
  .foot { padding: 16px 40px 24px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .foot .org { font-family: 'Lexend', sans-serif; font-size: 11px; font-weight: 600; color: var(--muted); letter-spacing: .08em; }
  .foot .meta { font-size: 12px; color: var(--muted); }
  @media print {
    body { background: #fff; }
    .sheet { margin: 0; box-shadow: none; border-radius: 0; max-width: 100%; }
    @page { margin: 14mm; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <img src="${CONSORTIUM_LOGO}" alt="Consortium Legal" />
      <div class="doc">
        <div class="kicker">Correlativo</div>
        <div class="corr">${esc(r.correlative)}</div>
      </div>
    </div>

    <div class="title">
      <div>
        <h1>Requerimiento de dinero</h1>
        <div class="date">Emitido el ${fecha(r.created || r.date)}</div>
      </div>
      <span class="badge${badgeCls ? ` ${badgeCls}` : ''}">${esc(stateLabel)}</span>
    </div>

    <div class="amount">
      <div>
        <div class="lbl">Monto solicitado</div>
        <div class="cur">${esc(currencyName)}</div>
      </div>
      <div class="num">${money(r)}</div>
    </div>

    <div class="grid">
      ${field('Cheque a nombre de', esc(r.payableTo), { wide: true, strong: true })}
      ${field('NIT', esc(r.nit))}
      ${field('Nota de trabajo', esc(r.workNoteNumber))}
      ${field('Equipo', esc(r.teamName))}
      ${field(areaLabel, esc(areaText))}
      ${field('Detalle', esc(r.description), { wide: true })}
    </div>

    <div class="steps">
      <div class="step"><div class="n">Solicitado</div><div class="m">${fecha(r.created || r.date)}${r.applicantName ? ` · ${esc(r.applicantName)}` : ''}</div></div>
      <div class="step ${secondStep.cls}"><div class="n">${secondStep.name}</div><div class="m">${secondStep.meta}</div></div>
      <div class="step${st === 6 ? '' : ' off'}"><div class="n">Finalizado</div><div class="m">${st === 6 ? 'Completado' : st === 4 || st === 5 ? '—' : 'Pendiente'}</div></div>
    </div>

    <div class="signs">
      <div class="sign">
        <div class="line"></div>
        <div class="who">${esc(r.applicantName) || '&nbsp;'}</div>
        <div class="role">Solicitante</div>
      </div>
      <div class="sign">
        <div class="line"></div>
        <div class="who">${esc(r.responsibleName) || '&nbsp;'}</div>
        <div class="role">Responsable de autorizar</div>
      </div>
    </div>

    <div class="foot">
      <div class="org">CONSORTIUM LEGAL · GUATEMALA</div>
      <div class="meta">Documento generado desde el sistema administrativo</div>
    </div>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 250);
    });
  </script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=820,height=1000');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
