import type { MoneyRequirement } from '../../api/moneyRequirements';
import { CONSORTIUM_LOGO } from './consortiumLogo';

const STATE_LABEL: Record<number, string> = {
  1: 'Creado',
  2: 'Pendiente de autorización',
  3: 'Autorizado',
  4: 'Rechazado',
  5: 'Anulado',
};

const CURRENCY_NAME: Record<string, string> = {
  Q: 'Quetzales',
  GTQ: 'Quetzales',
  $: 'Dólares',
  USD: 'Dólares',
  '€': 'Euros',
  EUR: 'Euros',
};

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (r: MoneyRequirement): string => {
  const sym = r.currency === 'USD' || r.currency === '$' ? '$' : r.currency === 'EUR' || r.currency === '€' ? '€' : 'Q';
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
  const currencyName = CURRENCY_NAME[r.currency] ?? 'Quetzales';
  const stateLabel = STATE_LABEL[r.state] ?? '—';

  const row = (label: string, value: string, opts?: { mono?: boolean; strong?: boolean }) => `
    <div class="row">
      <div class="label">${esc(label)}</div>
      <div class="value${opts?.mono ? ' mono' : ''}${opts?.strong ? ' strong' : ''}">${value || '—'}</div>
    </div>`;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Requerimiento ${esc(r.correlative)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --ink: #1C2434; --muted: #64748B; --faint: #94A3B8;
    --primary: #3C50E0; --border: #E2E8F0; --subtle: #F8FAFC;
  }
  html, body {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    color: var(--ink); background: #EEF1FB; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet {
    max-width: 720px; margin: 32px auto; background: #fff; border-radius: 16px; overflow: hidden;
    box-shadow: 0 12px 40px rgba(28,36,52,.12);
  }
  .band { height: 6px; background: linear-gradient(90deg, var(--primary), #6B7CF0); }
  .head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 28px 40px 20px; border-bottom: 1px solid var(--border);
  }
  .brand { display: flex; align-items: center; gap: 14px; }
  .brand .logo { height: 46px; width: auto; display: block; }
  .brand .sub { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; margin-top: 4px; }
  .doc { text-align: right; }
  .doc .kicker { font-size: 10px; font-weight: 700; color: var(--faint); text-transform: uppercase; letter-spacing: .1em; }
  .doc .corr { font-size: 20px; font-weight: 800; color: var(--primary); font-variant-numeric: tabular-nums; margin-top: 2px; }
  .title { padding: 24px 40px 4px; }
  .title h1 { font-size: 22px; font-weight: 800; letter-spacing: -.02em; }
  .title .date { font-size: 13px; color: var(--muted); margin-top: 2px; }
  .amount {
    margin: 20px 40px; padding: 20px 24px; background: var(--subtle);
    border: 1px solid var(--border); border-radius: 12px;
    display: flex; align-items: baseline; justify-content: space-between;
  }
  .amount .lbl { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
  .amount .num { font-size: 30px; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  .amount .cur { font-size: 12px; font-weight: 600; color: var(--muted); }
  .grid { padding: 4px 40px 8px; }
  .row { display: grid; grid-template-columns: 200px 1fr; gap: 16px; padding: 11px 0; border-bottom: 1px solid var(--subtle); }
  .row:last-child { border-bottom: none; }
  .label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; padding-top: 2px; }
  .value { font-size: 14px; font-weight: 500; line-height: 1.5; }
  .value.mono { font-variant-numeric: tabular-nums; }
  .value.strong { font-weight: 700; }
  .desc { white-space: pre-wrap; }
  .badge {
    display: inline-block; padding: 3px 12px; border-radius: 999px; font-size: 12px; font-weight: 700;
    background: rgba(60,80,224,.1); color: var(--primary);
  }
  .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding: 40px 40px 24px; }
  .sign { text-align: center; }
  .sign .line { border-top: 1.5px solid var(--ink); margin-bottom: 6px; }
  .sign .who { font-size: 13px; font-weight: 700; }
  .sign .role { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
  .foot { padding: 16px 40px 28px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .foot .org { font-size: 11px; font-weight: 700; color: var(--muted); }
  .foot .meta { font-size: 10px; color: var(--faint); }
  @media print {
    body { background: #fff; }
    .sheet { margin: 0; box-shadow: none; border-radius: 0; max-width: 100%; }
    @page { margin: 14mm; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="band"></div>
    <div class="head">
      <div class="brand">
        <img class="logo" src="${CONSORTIUM_LOGO}" alt="Consortium Legal" />
        <div class="sub">Tesorería</div>
      </div>
      <div class="doc">
        <div class="kicker">Correlativo</div>
        <div class="corr">${esc(r.correlative)}</div>
      </div>
    </div>

    <div class="title">
      <h1>Requerimiento de dinero</h1>
      <div class="date">Emitido el ${fecha(r.created || r.date)}</div>
    </div>

    <div class="amount">
      <div>
        <div class="lbl">Monto solicitado</div>
        <div class="cur">${esc(currencyName)}</div>
      </div>
      <div class="num">${money(r)}</div>
    </div>

    <div class="grid">
      ${row('Cheque a nombre de', esc(r.payableTo), { strong: true })}
      ${r.nit ? row('NIT', esc(r.nit), { mono: true }) : ''}
      ${r.workNoteNumber ? row('Nota de trabajo', esc(r.workNoteNumber), { mono: true }) : ''}
      ${row('Detalle', `<span class="desc">${esc(r.description)}</span>`)}
      ${row('Equipo', esc(r.teamName))}
      ${row('Estado', `<span class="badge">${esc(stateLabel)}</span>`)}
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
      <div class="org">CONSORTIUM LEGAL · Guatemala</div>
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
