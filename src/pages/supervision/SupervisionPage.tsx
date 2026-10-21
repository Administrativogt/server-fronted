import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Empty,
  message,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { DownloadOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
  formatPuntaje,
  listRevisiones,
  nivelPuntaje,
  TIPO_LABEL,
  type Revision,
  type SupervisionTipo,
} from '../../api/supervision';
import { exportResumenExcel, type ResumenPersona } from './exportSupervision';
import { useSupervisionVars } from './useSupervisionVars';
import './supervision.css';

const { Title, Text } = Typography;

const DIAS_TIRA = 10;

const apiError = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** Últimos N días hábiles (lunes a viernes) terminando hoy. */
function diasHabiles(n: number): Dayjs[] {
  const out: Dayjs[] = [];
  let d = dayjs().startOf('day');
  while (out.length < n) {
    if (d.day() !== 0 && d.day() !== 6) out.unshift(d);
    d = d.subtract(1, 'day');
  }
  return out;
}

const userName = (u: Revision['creator']) => (u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.username : '—');

function resumenPorPersona(tipo: SupervisionTipo, revisiones: Revision[]): ResumenPersona[] {
  const map = new Map<string, ResumenPersona & { suma: number; conPuntaje: number; ultimaFecha: string }>();
  for (const rev of revisiones) {
    for (const e of rev.evaluados) {
      const key = e.usuario ? `u${e.usuario.id}` : `n${e.nombre.toUpperCase()}`;
      const acc =
        map.get(key) ??
        { key, nombre: e.nombre, revisiones: 0, promedio: null, noCumple: 0, incidencias: 0, ultima: null, suma: 0, conPuntaje: 0, ultimaFecha: '' };
      acc.revisiones += 1;
      acc.noCumple += e.resumen.no_cumple ?? 0;
      acc.incidencias += e.resumen.incidencias ?? 0;
      if (e.resumen.puntaje != null) {
        acc.suma += e.resumen.puntaje;
        acc.conPuntaje += 1;
        if (rev.fecha > acc.ultimaFecha) {
          acc.ultimaFecha = rev.fecha;
          acc.ultima = e.resumen.puntaje;
        }
      }
      map.set(key, acc);
    }
  }
  const dec = tipo === 'MENSAJERIA' ? 10 : 100;
  return [...map.values()]
    .map(({ suma, conPuntaje, ...r }) => ({
      key: r.key,
      nombre: r.nombre,
      revisiones: r.revisiones,
      noCumple: r.noCumple,
      incidencias: r.incidencias,
      ultima: r.ultima,
      promedio: conPuntaje ? Math.round((suma / conPuntaje) * dec) / dec : null,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// Control diario de Mara Ortiz: revisión de mensajeros y personal de limpieza.
// Reemplaza el Excel de supervisión de mensajería y el Word de limpieza.
export default function SupervisionPage() {
  const navigate = useNavigate();
  const cssVars = useSupervisionVars();
  const [params, setParams] = useSearchParams();
  const tipo: SupervisionTipo = params.get('tipo') === 'limpieza' ? 'LIMPIEZA' : 'MENSAJERIA';
  const [mes, setMes] = useState<Dayjs>(dayjs().startOf('month'));
  const [revisiones, setRevisiones] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(false);

  const dias = useMemo(() => diasHabiles(DIAS_TIRA), []);
  const hoy = dayjs().format('YYYY-MM-DD');

  // Un solo GET cubre el mes elegido y la tira de los últimos días hábiles.
  const rango = useMemo(() => {
    const inicioMes = mes.startOf('month');
    const finMes = mes.endOf('month');
    const from = inicioMes.isBefore(dias[0]) ? inicioMes : dias[0];
    const to = finMes.isAfter(dayjs()) ? finMes : dayjs();
    return { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') };
  }, [mes, dias]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRevisiones(await listRevisiones(rango));
    } catch (err) {
      message.error(apiError(err, 'No se pudieron cargar las revisiones'));
    } finally {
      setLoading(false);
    }
  }, [rango]);

  useEffect(() => {
    load();
  }, [load]);

  const porFecha = useMemo(() => {
    const m: Record<SupervisionTipo, Map<string, Revision>> = { MENSAJERIA: new Map(), LIMPIEZA: new Map() };
    revisiones.forEach((r) => m[r.tipo].set(r.fecha, r));
    return m;
  }, [revisiones]);

  const delMes = useMemo(
    () =>
      revisiones.filter(
        (r) => r.tipo === tipo && dayjs(r.fecha).isSame(mes, 'month'),
      ),
    [revisiones, tipo, mes],
  );
  const resumen = useMemo(() => resumenPorPersona(tipo, delMes), [tipo, delMes]);

  const abrir = (t: SupervisionTipo, fecha: string) => {
    const r = porFecha[t].get(fecha);
    navigate(
      r ? `/dashboard/supervision/revision/${r.id}` : `/dashboard/supervision/nueva/${t.toLowerCase()}?fecha=${fecha}`,
    );
  };

  const faltaHoy = (t: SupervisionTipo) => dayjs().day() !== 0 && dayjs().day() !== 6 && !porFecha[t].has(hoy);
  const periodo = mes.format('MMMM YYYY');
  const esMens = tipo === 'MENSAJERIA';

  return (
    <div className="sv-page" style={{ padding: 24, ...cssVars }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Control de supervisión
          </Title>
          <Text type="secondary">Revisión diaria de mensajería y limpieza.</Text>
        </div>
        <Space wrap>
          <Tooltip title="Volver a cargar">
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading} aria-label="Volver a cargar" />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => abrir(tipo, hoy)}>
            {porFecha[tipo].has(hoy) ? 'Abrir revisión de hoy' : 'Revisión de hoy'}
          </Button>
        </Space>
      </Space>

      <Tabs
        activeKey={tipo}
        onChange={(k) => setParams({ tipo: k.toLowerCase() }, { replace: true })}
        items={(['MENSAJERIA', 'LIMPIEZA'] as SupervisionTipo[]).map((t) => ({
          key: t,
          label: (
            <Badge dot={!loading && faltaHoy(t)} offset={[6, 0]} title="Falta la revisión de hoy">
              {TIPO_LABEL[t]}
            </Badge>
          ),
        }))}
      />

      <Card size="small" title="Últimos días hábiles" style={{ marginBottom: 16 }}>
        <div className="sv-days">
          {dias.map((d) => {
            const f = d.format('YYYY-MM-DD');
            const r = porFecha[tipo].get(f);
            const esHoy = f === hoy;
            const prom = r
              ? (() => {
                  const ps = r.evaluados.map((e) => e.resumen.puntaje).filter((p): p is number => p != null);
                  return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null;
                })()
              : null;
            return (
              <button
                key={f}
                type="button"
                className={`sv-day ${r ? 'is-done' : 'is-missing'} ${esHoy ? 'is-today' : ''}`}
                onClick={() => abrir(tipo, f)}
                aria-label={`${d.format('dddd D [de] MMMM')}: ${r ? 'revisada' : 'sin revisión'}`}
              >
                <div className="sv-day-dow">{esHoy ? 'Hoy' : d.format('ddd')}</div>
                <div className="sv-day-num">{d.format('D MMM')}</div>
                <div className="sv-day-state">
                  {r ? formatPuntaje(tipo, prom != null ? Math.round(prom * (esMens ? 10 : 100)) / (esMens ? 10 : 100) : null) : esHoy ? 'Pendiente' : 'Sin revisión'}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card
        size="small"
        title={
          <Space>
            <span>Resumen por persona</span>
            <DatePicker
              picker="month"
              size="small"
              allowClear={false}
              format="MMMM YYYY"
              value={mes}
              disabledDate={(d) => d.isAfter(dayjs(), 'month')}
              onChange={(d) => d && setMes(d.startOf('month'))}
            />
          </Space>
        }
        extra={
          <Button
            size="small"
            icon={<DownloadOutlined />}
            disabled={!delMes.length}
            onClick={() => exportResumenExcel(tipo, periodo, resumen, delMes)}
          >
            Descargar Excel
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Table<ResumenPersona>
          size="small"
          rowKey="key"
          loading={loading}
          dataSource={resumen}
          pagination={false}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`Sin revisiones en ${periodo}.`} /> }}
          columns={[
            {
              title: 'Persona',
              dataIndex: 'nombre',
              render: (n: string) => <span style={{ textTransform: 'capitalize' }}>{n.toLowerCase()}</span>,
            },
            { title: 'Revisiones', dataIndex: 'revisiones', align: 'right', width: 110 },
            {
              title: esMens ? '% cumplimiento' : 'Promedio (1 a 5)',
              dataIndex: 'promedio',
              align: 'right',
              width: 150,
              sorter: (a, b) => (a.promedio ?? -1) - (b.promedio ?? -1),
              render: (p: number | null) => <Tag color={nivelPuntaje(tipo, p)}>{formatPuntaje(tipo, p)}</Tag>,
            },
            ...(esMens
              ? [
                  {
                    title: 'Criterios "No"',
                    dataIndex: 'noCumple',
                    align: 'right' as const,
                    width: 130,
                    render: (n: number) => (n ? <Text type="danger">{n}</Text> : <Text type="secondary">0</Text>),
                  },
                  {
                    title: 'Incidencias',
                    dataIndex: 'incidencias',
                    align: 'right' as const,
                    width: 110,
                  },
                ]
              : []),
            {
              title: 'Última',
              dataIndex: 'ultima',
              align: 'right',
              width: 120,
              render: (p: number | null) => formatPuntaje(tipo, p),
            },
          ]}
        />
      </Card>

      <Card size="small" title={`Revisiones de ${periodo}`}>
        <Table<Revision>
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={delMes}
          pagination={{ pageSize: 15, hideOnSinglePage: true }}
          onRow={(r) => ({ onClick: () => navigate(`/dashboard/supervision/revision/${r.id}`), style: { cursor: 'pointer' } })}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`Todavía no hay revisiones de ${TIPO_LABEL[tipo].toLowerCase()} en ${periodo}.`}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => abrir(tipo, hoy)}>
                  Hacer la de hoy
                </Button>
              </Empty>
            ),
          }}
          columns={[
            {
              title: 'Fecha',
              dataIndex: 'fecha',
              width: 170,
              render: (f: string) => <span style={{ textTransform: 'capitalize' }}>{dayjs(f).format('ddd DD/MM/YYYY')}</span>,
            },
            { title: esMens ? 'Ruta / Zona' : 'Sede', dataIndex: 'sede', render: (s: string) => s || '—' },
            {
              title: 'Personas',
              key: 'personas',
              render: (_: unknown, r) => (
                <Space size={[4, 4]} wrap>
                  {r.evaluados.map((e) => (
                    <Tag key={e.id} color={nivelPuntaje(tipo, e.resumen.puntaje)} style={{ textTransform: 'capitalize' }}>
                      {e.nombre.toLowerCase().split(' ')[0]} · {formatPuntaje(tipo, e.resumen.puntaje)}
                    </Tag>
                  ))}
                </Space>
              ),
            },
            { title: 'Creado por', key: 'creator', width: 180, render: (_: unknown, r) => userName(r.creator) },
          ]}
        />
      </Card>
    </div>
  );
}
