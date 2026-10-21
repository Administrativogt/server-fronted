import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  TIPO_LABEL,
  type Cumplimiento,
  type Revision,
  type SupervisionCatalogo,
  type SupervisionTipo,
} from '../../api/supervision';

const CUMPLIMIENTO_LABEL: Record<Cumplimiento, string> = {
  CUMPLE: 'Cumple',
  PARCIAL: 'Cumple parcialmente',
  NO_CUMPLE: 'No cumple',
  NA: 'N/A',
};

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
const SECTION_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };

const styleHeader = (row: ExcelJS.Row) => {
  row.eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
};

const styleSection = (row: ExcelJS.Row) => {
  row.eachCell({ includeEmpty: true }, (c) => {
    c.fill = SECTION_FILL;
    c.font = { bold: true };
  });
};

const fechaLarga = (f: string) => dayjs(f).format('dddd D [de] MMMM YYYY');

async function save(wb: ExcelJS.Workbook, name: string) {
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), name);
}

/** Una revisión con el mismo orden que el formulario en papel. */
export async function exportRevisionExcel(rev: Revision, cat: SupervisionCatalogo) {
  const esMens = rev.tipo === 'MENSAJERIA';
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(TIPO_LABEL[rev.tipo]);
  const personas = rev.evaluados;
  const nCols = personas.length + 2;

  ws.addRow([esMens ? 'FORMULARIO DE SUPERVISIÓN OPERATIVA DE MENSAJERÍA' : 'FORMULARIO DE REVISIÓN Y CONTROL DE LIMPIEZA']).font = {
    bold: true,
    size: 14,
  };
  ws.mergeCells(1, 1, 1, nCols);
  ws.addRow([`Fecha: ${fechaLarga(rev.fecha)}`]);
  ws.addRow([
    `${esMens ? 'Ruta / Zona' : 'Sede / Oficina'}: ${rev.sede || '—'}`,
  ]);
  const sup = rev.creator ? `${rev.creator.first_name} ${rev.creator.last_name}`.trim() : '';
  ws.addRow([`Supervisor: ${sup || '—'}`]);
  ws.addRow([]);

  if (esMens) {
    styleHeader(ws.addRow(['Mensajero', 'Vehículo / Placa', 'Teléfono', 'Hora salida', 'Hora retorno']));
    personas.forEach((p) =>
      ws.addRow([p.nombre, p.vehiculo, p.telefono, p.hora_salida?.slice(0, 5) ?? '', p.hora_retorno?.slice(0, 5) ?? '']),
    );
    ws.addRow([]);
  }

  const secciones = esMens ? cat.mensajeria.secciones : cat.limpieza.secciones;
  styleHeader(ws.addRow(['Criterio de evaluación', ...personas.map((p) => p.nombre), 'Observaciones']));
  secciones.forEach((s, i) => {
    styleSection(ws.addRow([`${i + 1}. ${s.titulo}`, ...personas.map(() => ''), '']));
    s.criterios.forEach((c) => {
      ws.addRow([
        c.label,
        ...personas.map((p) => {
          const v = p.calificaciones[c.key];
          if (v == null) return '';
          return esMens ? CUMPLIMIENTO_LABEL[v as Cumplimiento] : Number(v);
        }),
        rev.observaciones_items[c.key] ?? '',
      ]);
    });
  });

  if (esMens) {
    styleSection(ws.addRow(['% de cumplimiento', ...personas.map((p) => p.resumen.puntaje ?? ''), '']));
    ws.addRow([]);
    styleHeader(ws.addRow(['Incidencias / anomalías en ruta', ...personas.map((p) => p.nombre)]));
    cat.mensajeria.incidencias.forEach((inc) =>
      ws.addRow([inc.label, ...personas.map((p) => (p.incidencias[inc.key] ? 'Sí' : 'No'))]),
    );
    ws.addRow([]);
    ws.addRow(['Descripción de anomalías y medidas tomadas:']).font = { bold: true };
    ws.addRow([rev.descripcion_incidencias || '—']);
  } else {
    styleSection(ws.addRow(['Puntaje total', ...personas.map((p) => p.resumen.total ?? ''), '']));
    styleSection(ws.addRow(['Promedio (1 a 5)', ...personas.map((p) => p.resumen.puntaje ?? ''), '']));
    ws.addRow([]);
    ws.addRow(['Observaciones por persona:']).font = { bold: true };
    personas.forEach((p) => ws.addRow([p.nombre, p.observaciones || '—']));
  }

  ws.addRow([]);
  ws.addRow(['Observaciones generales:']).font = { bold: true };
  ws.addRow([rev.observaciones_generales || '—']);
  ws.addRow([esMens ? 'Compromisos de mejora:' : 'Acuerdos:']).font = { bold: true };
  ws.addRow([rev.compromisos || '—']);

  ws.getColumn(1).width = 62;
  for (let i = 2; i <= nCols; i++) ws.getColumn(i).width = 20;
  ws.getColumn(nCols).width = 40;
  ws.eachRow((row) =>
    row.eachCell((c) => {
      c.alignment = { ...(c.alignment ?? {}), wrapText: true, vertical: 'top' };
    }),
  );

  await save(wb, `supervision-${rev.tipo.toLowerCase()}-${rev.fecha}.xlsx`);
}

export interface ResumenPersona {
  key: string;
  nombre: string;
  revisiones: number;
  promedio: number | null;
  noCumple: number;
  incidencias: number;
  ultima: number | null;
}

/** Resumen por persona del período + detalle de cada revisión. */
export async function exportResumenExcel(
  tipo: SupervisionTipo,
  periodo: string,
  resumen: ResumenPersona[],
  revisiones: Revision[],
) {
  const esMens = tipo === 'MENSAJERIA';
  const wb = new ExcelJS.Workbook();

  const ws = wb.addWorksheet('Resumen');
  ws.addRow([`Supervisión de ${TIPO_LABEL[tipo].toLowerCase()} — ${periodo}`]).font = { bold: true, size: 14 };
  ws.addRow([]);
  styleHeader(
    ws.addRow([
      'Persona',
      'Revisiones',
      esMens ? '% cumplimiento promedio' : 'Promedio (1 a 5)',
      ...(esMens ? ['Criterios "No cumple"', 'Incidencias'] : []),
      'Última',
    ]),
  );
  resumen.forEach((r) =>
    ws.addRow([r.nombre, r.revisiones, r.promedio ?? '', ...(esMens ? [r.noCumple, r.incidencias] : []), r.ultima ?? '']),
  );
  ws.getColumn(1).width = 40;
  for (let i = 2; i <= 6; i++) ws.getColumn(i).width = 22;

  const det = wb.addWorksheet('Detalle');
  styleHeader(
    det.addRow([
      'Fecha',
      esMens ? 'Ruta / Zona' : 'Sede',
      'Persona',
      esMens ? '% cumplimiento' : 'Total',
      ...(esMens ? ['Cumple', 'Parcial', 'No cumple', 'Incidencias', 'Salida', 'Retorno'] : ['Promedio', 'Calificados']),
      'Observaciones',
    ]),
  );
  [...revisiones]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .forEach((rev) =>
      rev.evaluados.forEach((p) =>
        det.addRow([
          rev.fecha,
          rev.sede,
          p.nombre,
          esMens ? (p.resumen.puntaje ?? '') : (p.resumen.total ?? ''),
          ...(esMens
            ? [
                p.resumen.cumple ?? 0,
                p.resumen.parcial ?? 0,
                p.resumen.no_cumple ?? 0,
                p.resumen.incidencias ?? 0,
                p.hora_salida?.slice(0, 5) ?? '',
                p.hora_retorno?.slice(0, 5) ?? '',
              ]
            : [p.resumen.puntaje ?? '', p.resumen.calificados]),
          p.observaciones,
        ]),
      ),
    );
  det.columns.forEach((c, i) => {
    c.width = i === 2 ? 36 : i === det.columnCount - 1 ? 50 : 14;
  });

  await save(wb, `supervision-${tipo.toLowerCase()}-${periodo.replace(/\s+/g, '-')}.xlsx`);
}
