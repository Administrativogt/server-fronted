import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Dropdown,
  Input,
  Modal,
  Popconfirm,
  Result,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  LinkOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SyncOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import useAuthStore from '../../auth/useAuthStore';
import { getGastosAccess } from '../../api/migracionGastos';
import {
  DINERO_ESTATUS,
  MESES,
  buscarEnSirvo,
  deleteDinero,
  estatusInfo,
  getCandidatosSirvo,
  getDinero,
  getDineroOpciones,
  importarDineroExcel,
  ligarSirvo,
  type DineroFilters,
  type DineroItem,
  type DineroList,
  type DineroOpciones,
  type SirvoCandidato,
} from '../../api/migracionDinero';
import DineroModal from './DineroModal';

const { Title, Text } = Typography;
const qFmt = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' });
const nFmt = new Intl.NumberFormat('es-GT');
const f = (v?: string | null) => (v ? dayjs(v).format('DD/MM/YY') : '');

export default function ControlDinero() {
  const isSuperuser = useAuthStore((s) => s.is_superuser) === true;
  const [forbidden, setForbidden] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [opciones, setOpciones] = useState<DineroOpciones | null>(null);
  const [data, setData] = useState<DineroList | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<DineroFilters>({ anio: dayjs().year() });
  const [modal, setModal] = useState<{ item: DineroItem | null } | null>(null);
  const [ligando, setLigando] = useState<{ item: DineroItem; candidatos: SirvoCandidato[] | null } | null>(null);

  const handleError = useCallback((err: any, fallback: string) => {
    if (err?.response?.status === 403) setForbidden(true);
    else message.error(err?.response?.data?.message || fallback);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    getDinero(filters, page, pageSize)
      .then(({ data }) => setData(data))
      .catch((e) => handleError(e, 'No se pudieron cargar las solicitudes'))
      .finally(() => setLoading(false));
  }, [filters, page, pageSize, handleError]);

  const loadOpciones = useCallback(() => {
    getDineroOpciones()
      .then(({ data }) => setOpciones(data))
      .catch(() => setOpciones(null));
  }, []);

  useEffect(() => {
    getGastosAccess()
      .then(({ data }) => {
        if (!data.canView) setForbidden(true);
        setCanEdit(data.canEdit);
      })
      .catch(() => setForbidden(true));
    loadOpciones();
  }, [loadOpciones]);

  useEffect(load, [load]);

  const setFilter = (patch: Partial<DineroFilters>) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const porEstatus = useMemo(() => new Map((data?.por_estatus ?? []).map((e) => [e.estatus, e])), [data]);

  const sincronizar = async () => {
    try {
      const { data: r } = await buscarEnSirvo();
      message.success(r.ligadas ? `${r.ligadas} solicitudes se ligaron a su cheque de Sirvo` : 'No hubo cheques nuevos para ligar');
      load();
    } catch (e) {
      handleError(e, 'No se pudo buscar en Sirvo');
    }
  };

  const abrirLigar = async (item: DineroItem) => {
    setLigando({ item, candidatos: null });
    try {
      const { data: c } = await getCandidatosSirvo(item.id);
      setLigando({ item, candidatos: c });
    } catch (e) {
      handleError(e, 'No se pudieron cargar los cheques de Sirvo');
      setLigando(null);
    }
  };

  const ligar = async (requestId: number | null) => {
    if (!ligando) return;
    try {
      await ligarSirvo(ligando.item.id, requestId);
      message.success(requestId ? 'Ligado al cheque de Sirvo' : 'Liga quitada');
      setLigando(null);
      load();
    } catch (e) {
      handleError(e, 'No se pudo ligar');
    }
  };

  const borrar = async (item: DineroItem) => {
    try {
      await deleteDinero(item.id);
      message.success('Solicitud eliminada');
      load();
    } catch (e) {
      handleError(e, 'No se pudo eliminar');
    }
  };

  const importar = (file: File, force = false) => {
    const anio = filters.anio ?? dayjs().year();
    const hide = message.loading('Importando el Excel…', 0);
    importarDineroExcel(file, anio, force)
      .then(({ data: r }) => {
        Modal.success({
          title: `Hoja ${r.hoja} importada`,
          content: (
            <div>
              {nFmt.format(r.filas)} filas · {nFmt.format(r.ligadas)} ligadas a Sirvo
              {r.reemplazadas ? ` · reemplazó ${nFmt.format(r.reemplazadas)}` : ''}
              {r.advertencias.length > 0 && (
                <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                  {r.advertencias.slice(0, 10).map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}
            </div>
          ),
        });
        loadOpciones();
        load();
      })
      .catch((err) => {
        if (!force && err?.response?.data?.code === 'YA_IMPORTADO') {
          Modal.confirm({
            title: 'Ya se importó ese año',
            content: err.response.data.message,
            okText: 'Reemplazar',
            okButtonProps: { danger: true },
            onOk: () => importar(file, true),
          });
        } else handleError(err, 'No se pudo importar');
      })
      .finally(hide);
  };

  const exportar = async () => {
    setExporting(true);
    try {
      const { data: all } = await getDinero(filters, 1, 5000);
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(`DINERO ${filters.anio ?? ''}`.trim());
      ws.columns = [
        { header: 'MES', key: 'mes', width: 12 },
        { header: 'FECHA DE SOLICITUD', key: 'fsol', width: 14 },
        { header: 'FECHA DE USO', key: 'fuso', width: 14 },
        { header: 'SOLICITADO POR', key: 'sol', width: 22 },
        { header: 'NT', key: 'nt', width: 10 },
        { header: 'CLIENTE', key: 'cliente', width: 34 },
        { header: 'CASO', key: 'caso', width: 36 },
        { header: 'CONCEPTO', key: 'concepto', width: 48 },
        { header: 'CANTIDAD', key: 'cantidad', width: 10 },
        { header: 'MONTO', key: 'monto', width: 14, style: { numFmt: '"Q"#,##0.00' } },
        { header: 'NOMBRE DE CHEQUE', key: 'benef', width: 22 },
        { header: 'ESTATUS DE DINERO', key: 'estatus', width: 18 },
        { header: 'No. DE CHEQUE', key: 'cheque', width: 12 },
        { header: 'FECHA DE ENTREGA A PROCURADOR', key: 'fent', width: 16 },
        { header: 'ESTATUS DE LIQUIDACIÓN', key: 'liq', width: 24 },
        { header: 'NOTAS', key: 'notas', width: 30 },
        { header: 'CREADO POR', key: 'creado', width: 22 },
      ];
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2A6B' } };
      all.items.forEach((r) =>
        ws.addRow({
          mes: MESES[r.mes - 1],
          fsol: r.fecha_solicitud ?? '',
          fuso: r.fecha_uso ?? '',
          sol: r.solicitado_por_nombre || r.solicitado_por_iniciales,
          nt: r.nt ?? '',
          cliente: r.cliente_nombre ?? '',
          caso: r.caso_nombre ?? '',
          concepto: r.concepto,
          cantidad: r.cantidad ?? '',
          monto: r.monto ?? '',
          benef: r.beneficiario ?? '',
          estatus: estatusInfo(r.estatus).label.toUpperCase(),
          cheque: r.numero_cheque ?? '',
          fent: r.fecha_entrega ?? '',
          liq: r.estatus_liquidacion ?? '',
          notas: r.notas ?? '',
          creado: r.origen === 'EXCEL' ? 'Excel (importado)' : (r.creado_por ?? ''),
        }),
      );
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      ws.autoFilter = { from: 'A1', to: 'Q1' };
      const buffer = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `control-dinero-migracion-${dayjs().format('YYYY-MM-DD')}.xlsx`,
      );
    } catch (e) {
      handleError(e, 'No se pudo exportar');
    } finally {
      setExporting(false);
    }
  };

  if (forbidden) {
    return (
      <Result
        status="403"
        title="Sin acceso"
        subTitle="El control de dinero de Migración solo lo ven el equipo de Migración (socios y secretarias), contabilidad y administradores."
      />
    );
  }

  const columns: ColumnsType<DineroItem> = [
    {
      title: 'Mes',
      dataIndex: 'mes',
      width: 90,
      render: (m: number) => MESES[m - 1],
    },
    {
      title: 'Solicitud',
      dataIndex: 'fecha_solicitud',
      width: 90,
      render: f,
    },
    {
      title: 'Uso',
      dataIndex: 'fecha_uso',
      width: 80,
      render: f,
    },
    {
      title: 'Solicitado por',
      dataIndex: 'solicitado_por_iniciales',
      width: 90,
      render: (ini: string, r) =>
        ini ? (
          <Tooltip title={r.solicitado_por_nombre}>
            <Tag>{ini}</Tag>
          </Tooltip>
        ) : null,
    },
    {
      title: 'NT',
      dataIndex: 'nt',
      width: 85,
      render: (nt: number | null, r) =>
        nt ? (
          <Tooltip title={r.nt_activa === false ? 'NT cerrada en Sirvo' : undefined}>
            <Text strong delete={r.nt_activa === false}>
              {nt}
            </Text>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Cliente',
      dataIndex: 'cliente_nombre',
      width: 180,
      ellipsis: { showTitle: false },
      render: (c: string | null, r) => (
        <Tooltip title={r.caso_nombre ? `Caso: ${r.caso_nombre}` : undefined}>
          <span>{c || r.cliente_codigo || '—'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      render: (c: string, r) => (
        <div>
          <div>{c}</div>
          {r.notas && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.notas}
            </Text>
          )}
        </div>
      ),
    },
    { title: 'Cant.', dataIndex: 'cantidad', width: 60, align: 'right' },
    {
      title: 'Monto',
      dataIndex: 'monto',
      width: 110,
      align: 'right',
      render: (m: number | null, r) => {
        const difiere = r.sirvo_monto != null && m != null && Math.abs(r.sirvo_monto - m) >= 0.01;
        return m == null ? (
          <Text type="secondary">—</Text>
        ) : (
          <Tooltip title={difiere ? `En Sirvo: ${qFmt.format(r.sirvo_monto!)}` : undefined}>
            <Text type={difiere ? 'warning' : undefined}>{qFmt.format(m)}</Text>
          </Tooltip>
        );
      },
    },
    { title: 'Nombre de cheque', dataIndex: 'beneficiario', width: 150, ellipsis: true },
    {
      title: 'Estatus de dinero',
      dataIndex: 'estatus',
      width: 150,
      render: (e: DineroItem['estatus'], r) => (
        <Tooltip title={r.request_id ? `Sirvo: ${r.sirvo_descripcion ?? ''}` : estatusInfo(e).hint}>
          <Tag color={estatusInfo(e).color}>{estatusInfo(e).label}</Tag>
        </Tooltip>
      ),
    },
    {
      title: 'No. cheque',
      dataIndex: 'numero_cheque',
      width: 90,
      render: (c: string | null, r) =>
        c ? (
          <Tooltip title={r.request_id ? 'Tomado de Sirvo' : 'Escrito a mano (aún sin liga a Sirvo)'}>
            <Text type={r.request_id ? undefined : 'secondary'}>{c}</Text>
          </Tooltip>
        ) : null,
    },
    {
      title: 'Entrega procurador',
      dataIndex: 'fecha_entrega',
      width: 100,
      render: f,
    },
    {
      title: 'Liquidación',
      dataIndex: 'estatus_liquidacion',
      width: 130,
      ellipsis: true,
      render: (v: string | null, r) =>
        v || (r.estatus === 'liquidado' ? <Tag color="green">Liquidado</Tag> : null),
    },
    {
      title: 'Creado por',
      dataIndex: 'creado_por',
      width: 120,
      ellipsis: true,
      render: (c: string | null, r) =>
        r.origen === 'EXCEL' ? (
          <Tooltip title="Importado del Excel NT Honorarios y Gastos">
            <Text type="secondary">Excel</Text>
          </Tooltip>
        ) : (
          c
        ),
    },
    {
      key: 'acciones',
      width: 50,
      fixed: 'right',
      render: (_, r) => (
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'edit', icon: <EditOutlined />, label: canEdit ? 'Editar' : 'Ver detalle' },
              ...(canEdit ? [{ key: 'link', icon: <LinkOutlined />, label: 'Ligar cheque de Sirvo' }] : []),
              ...(canEdit ? [{ key: 'del', icon: <DeleteOutlined />, label: 'Eliminar', danger: true }] : []),
            ],
            onClick: ({ key }) => {
              if (key === 'edit') setModal({ item: r });
              if (key === 'link') abrirLigar(r);
              if (key === 'del')
                Modal.confirm({
                  title: '¿Eliminar esta solicitud?',
                  content: r.concepto,
                  okText: 'Eliminar',
                  okButtonProps: { danger: true },
                  onOk: () => borrar(r),
                });
            },
          }}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const anios = opciones?.anios.length ? opciones.anios : [dayjs().year()];

  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Control de dinero
          </Title>
          <Text type="secondary">
            Solicitudes de dinero del equipo de Migración. Cuando Sirvo emite el cheque se liga solo y trae el No. de cheque y
            el estatus.
          </Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={load}>
            Actualizar
          </Button>
          {canEdit && (
            <Tooltip title="Busca en Sirvo los cheques de las solicitudes que aún no están ligadas">
              <Button icon={<SyncOutlined />} onClick={sincronizar}>
                Buscar cheques en Sirvo
              </Button>
            </Tooltip>
          )}
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={exportar}>
            Exportar a Excel
          </Button>
          {isSuperuser && (
            <Upload
              accept=".xlsx"
              showUploadList={false}
              beforeUpload={(file) => {
                importar(file);
                return false;
              }}
            >
              <Tooltip title={`Importar la hoja DINERO ${filters.anio ?? ''} del Excel NT Honorarios y Gastos`}>
                <Button icon={<UploadOutlined />}>Importar Excel</Button>
              </Tooltip>
            </Upload>
          )}
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ item: null })}>
              Nueva solicitud
            </Button>
          )}
        </Space>
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size={[8, 8]}>
          <Select
            style={{ width: 100 }}
            value={filters.anio}
            onChange={(v) => setFilter({ anio: v })}
            options={anios.map((a) => ({ value: a, label: a }))}
          />
          <Select
            allowClear
            placeholder="Mes"
            style={{ width: 130 }}
            value={filters.mes}
            onChange={(v) => setFilter({ mes: v })}
            options={MESES.map((m, i) => ({ value: i + 1, label: m }))}
          />
          <Select
            allowClear
            placeholder="Estatus de dinero"
            style={{ width: 180 }}
            value={filters.estatus}
            onChange={(v) => setFilter({ estatus: v })}
            options={DINERO_ESTATUS.map((e) => ({ value: e.value, label: e.label }))}
          />
          <Select
            allowClear
            showSearch
            placeholder="Solicitado por"
            style={{ width: 170 }}
            value={filters.solicitado_por}
            onChange={(v) => setFilter({ solicitado_por: v })}
            options={(opciones?.iniciales ?? []).map((i) => ({ value: i, label: i }))}
          />
          <Select
            allowClear
            showSearch
            placeholder="Nombre de cheque"
            style={{ width: 190 }}
            value={filters.beneficiario}
            onChange={(v) => setFilter({ beneficiario: v })}
            options={(opciones?.beneficiarios ?? []).map((b) => ({ value: b.nombre, label: b.nombre }))}
          />
          <Select
            allowClear
            placeholder="Entrega a procurador"
            style={{ width: 180 }}
            value={filters.entrega}
            onChange={(v) => setFilter({ entrega: v })}
            options={[
              { value: 'entregado', label: 'Entregado' },
              { value: 'sin_entregar', label: 'Sin entregar' },
            ]}
          />
          <Input.Search
            allowClear
            placeholder="Concepto, cliente, NT o cheque"
            style={{ width: 260 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(v) => setFilter({ q: v.trim() || undefined })}
          />
        </Space>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Text strong>
            {nFmt.format(data?.total ?? 0)} solicitudes · {qFmt.format(data?.monto_total ?? 0)}
          </Text>
          {DINERO_ESTATUS.filter((e) => porEstatus.has(e.value)).map((e) => {
            const d = porEstatus.get(e.value)!;
            const activo = filters.estatus === e.value;
            return (
              <Tooltip key={e.value} title={`${e.hint} · ${qFmt.format(d.monto)}`}>
                <Tag
                  color={activo ? e.color : undefined}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setFilter({ estatus: activo ? undefined : e.value })}
                >
                  {e.label}: {nFmt.format(d.n)}
                </Tag>
              </Tooltip>
            );
          })}
        </div>
      </Card>

      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={data?.items ?? []}
        scroll={{ x: 1700 }}
        onRow={(r) => ({ onDoubleClick: () => setModal({ item: r }) })}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [25, 50, 100, 200],
          showTotal: (t) => `${nFmt.format(t)} solicitudes`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <DineroModal
        open={!!modal}
        item={modal?.item ?? null}
        opciones={opciones}
        onClose={() => setModal(null)}
        onSaved={() => {
          setModal(null);
          load();
          loadOpciones();
        }}
      />

      <Modal
        title={ligando ? `Ligar cheque de Sirvo — NT ${ligando.item.nt ?? ''}` : ''}
        open={!!ligando}
        onCancel={() => setLigando(null)}
        footer={
          ligando?.item.request_id ? (
            <Popconfirm title="¿Quitar la liga con Sirvo? Ya no se volverá a ligar sola." onConfirm={() => ligar(null)}>
              <Button danger>Quitar liga</Button>
            </Popconfirm>
          ) : null
        }
        width={820}
      >
        {ligando && (
          <>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={ligando.item.concepto}
              description={`Monto: ${ligando.item.monto != null ? qFmt.format(ligando.item.monto) : '—'} · Solicitado el ${f(ligando.item.fecha_solicitud) || '—'}`}
            />
            <Table
              rowKey="request_id"
              size="small"
              loading={!ligando.candidatos}
              dataSource={ligando.candidatos ?? []}
              pagination={false}
              locale={{ emptyText: 'Sirvo no tiene cheques de LAS para esta NT' }}
              columns={[
                { title: 'Fecha', dataIndex: 'fecha', width: 90, render: f },
                { title: 'Descripción en Sirvo', dataIndex: 'description' },
                { title: 'Monto', dataIndex: 'monto', width: 110, align: 'right', render: (m: number) => qFmt.format(m) },
                { title: 'Cheque', dataIndex: 'numero_cheque', width: 80 },
                {
                  key: 'acc',
                  width: 120,
                  render: (_, c) =>
                    c.request_id === ligando.item.request_id ? (
                      <Tag color="green">Ligado</Tag>
                    ) : c.ligado_a ? (
                      <Text type="secondary">En #{c.ligado_a}</Text>
                    ) : (
                      <Button size="small" type="primary" ghost onClick={() => ligar(c.request_id)}>
                        Ligar
                      </Button>
                    ),
                },
              ]}
            />
          </>
        )}
      </Modal>
    </div>
  );
}
