import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Dropdown,
  Input,
  Modal,
  Result,
  Row,
  Segmented,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DownOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  HistoryOutlined,
  InboxOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getGastosAccess } from '../../api/migracionGastos';
import {
  getNtCargas,
  getNtResumen,
  getNts,
  subirReporteNt,
  type NtCarga,
  type NtCargaResultado,
  type NtCargaTipo,
  type NtItem,
  type NtListParams,
  type NtResumen,
} from '../../api/migracionNt';

const { Title, Text, Paragraph } = Typography;
const nFmt = new Intl.NumberFormat('es-GT');
const fecha = (v?: string | null, conHora = false) =>
  v ? dayjs(v).format(conHora ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY') : '—';
const fechaCarga = (c: NtCarga | null | undefined, conHora = true) =>
  c ? fecha(c.fecha_reporte ?? c.created_at, conHora && c.tipo !== 'CXC') : '—';

/** Códigos de error del backend que se pueden saltar a propósito (force). */
const AVISOS_FORZABLES = ['POCAS_NT', 'REPORTE_VIEJO'];

const REPORTES: Record<NtCargaTipo, { titulo: string; accept: string; ayuda: React.ReactNode; icon: React.ReactNode }> = {
  TXT: {
    titulo: '1. NT activas (TXT)',
    accept: '.txt,.TXT',
    icon: <FileTextOutlined />,
    ayuda: (
      <>
        En Sirvo descarga el detalle de notas de trabajo abiertas; el archivo se llama{' '}
        <Text code>detalle_nt_AAAAMMDDHHMMSS.TXT</Text>. Las NT que ya no vengan en el archivo se marcan como cerradas.
      </>
    ),
  },
  CXC: {
    titulo: '2. Notas de Migración (Excel)',
    accept: '.xlsx',
    icon: <FileExcelOutlined />,
    ayuda: (
      <>
        En Sirvo descarga <Text strong>«CXC Con Detalle de lo Usado Clientes»</Text> con coordinador <Text code>LAS</Text>{' '}
        (p. ej. <Text code>NOTAS MIGRACIÓN AL 04112026.xlsx</Text>). De aquí sale el nombre del caso; se toma la hoja
        «Datos» y reemplaza al Excel anterior.
      </>
    ),
  },
};

export default function NtActivas() {
  const [forbidden, setForbidden] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [resumen, setResumen] = useState<NtResumen | null>(null);
  const [items, setItems] = useState<NtItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTipo, setUploadTipo] = useState<NtCargaTipo | null>(null);
  const [resultado, setResultado] = useState<NtCargaResultado | null>(null);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [cargas, setCargas] = useState<NtCarga[]>([]);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<NtListParams>({ estado: 'activa', solo_migracion: true, page: 1, page_size: 25 });

  const handleError = useCallback((err: any, fallback: string) => {
    if (err?.response?.status === 403) setForbidden(true);
    else message.error(err?.response?.data?.message || fallback);
  }, []);

  const loadResumen = useCallback(() => {
    getNtResumen()
      .then(({ data }) => setResumen(data))
      .catch((e) => handleError(e, 'No se pudo cargar el resumen'));
  }, [handleError]);

  const loadItems = useCallback(() => {
    setLoading(true);
    getNts(filters)
      .then(({ data }) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((e) => handleError(e, 'No se pudieron cargar las NT'))
      .finally(() => setLoading(false));
  }, [filters, handleError]);

  useEffect(() => {
    getGastosAccess()
      .then(({ data }) => {
        if (!data.canView) setForbidden(true);
        setCanEdit(data.canEdit);
      })
      .catch(() => setForbidden(true));
    loadResumen();
  }, [loadResumen]);

  useEffect(loadItems, [loadItems]);

  const setFilter = (patch: Partial<NtListParams>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const subir = async (tipo: NtCargaTipo, file: File, force = false) => {
    setUploading(true);
    try {
      const { data } = await subirReporteNt(tipo, file, force);
      setUploadTipo(null);
      setResultado({ ...data, tipo });
      loadResumen();
      loadItems();
    } catch (err: any) {
      const body = err?.response?.data;
      if (!force && AVISOS_FORZABLES.includes(body?.code)) {
        Modal.confirm({
          title: 'Revisa el archivo antes de subirlo',
          content: body.message,
          okText: 'Subirlo de todas formas',
          okButtonProps: { danger: true },
          cancelText: 'Cancelar',
          onOk: () => subir(tipo, file, true),
        });
      } else {
        handleError(err, 'No se pudo subir el archivo');
      }
    } finally {
      setUploading(false);
    }
  };

  const abrirHistorial = () => {
    setHistorialOpen(true);
    getNtCargas()
      .then(({ data }) => setCargas(data))
      .catch((e) => handleError(e, 'No se pudo cargar el historial'));
  };

  if (forbidden) {
    return (
      <Result
        status="403"
        title="Sin acceso"
        subTitle="Las NT de Migración solo las ven el equipo de Migración (socios y secretarias), contabilidad y administradores."
      />
    );
  }

  const ultimaTxt = resumen?.ultima_carga;
  const ultimaCxc = resumen?.ultima_cxc;
  const viejo = (c?: NtCarga | null) => !!c && dayjs().startOf('day').diff(dayjs(c.fecha_reporte ?? c.created_at).startOf('day'), 'day') >= 1;
  const pendientes = [
    !ultimaTxt ? 'el TXT de NT activas' : viejo(ultimaTxt) ? `el TXT (el último es del ${fechaCarga(ultimaTxt)})` : null,
    !ultimaCxc ? 'el Excel de notas de Migración' : viejo(ultimaCxc) ? `el Excel (el último es del ${fechaCarga(ultimaCxc)})` : null,
  ].filter(Boolean);

  const columns: ColumnsType<NtItem> = [
    { title: 'NT', dataIndex: 'nt', width: 90, fixed: 'left', render: (v: number) => <Text strong>{v}</Text> },
    {
      title: 'Cliente',
      dataIndex: 'cliente_codigo',
      width: 230,
      render: (cod: string, r) => (
        <Space direction="vertical" size={0}>
          <Text code>{cod}</Text>
          {r.cliente_nombre && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.cliente_nombre}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Caso',
      dataIndex: 'caso',
      render: (v: string | null, r) =>
        v ? (
          <Space direction="vertical" size={0}>
            <span>{v}</span>
            <Space size={6}>
              {r.caso_numero && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Caso {r.caso_numero}
                </Text>
              )}
              {r.caso_fuente === 'TXT' && (
                <Tooltip title="No está en el Excel de notas; el nombre viene del TXT de Sirvo">
                  <Tag style={{ fontSize: 11 }}>del TXT</Tag>
                </Tooltip>
              )}
            </Space>
          </Space>
        ) : (
          <Tooltip title={r.en_cxc ? undefined : 'No viene en el Excel de notas de Migración y el TXT no trae nombre'}>
            <Text type="secondary">Sin nombre</Text>
          </Tooltip>
        ),
    },
    {
      title: 'Estado',
      dataIndex: 'activa',
      width: 140,
      render: (a: boolean, r) =>
        a ? (
          <Tag color="green">Activa</Tag>
        ) : (
          <Tooltip title="Ya no vino en el TXT de Sirvo">
            <Tag>Cerrada {fecha(r.cerrada_at)}</Tag>
          </Tooltip>
        ),
    },
    {
      title: 'Encargado',
      dataIndex: 'encargado',
      width: 100,
      render: (v: string | null, r) =>
        v ? (
          <Tooltip title={r.responsable ? `Responsable: ${r.responsable}` : undefined}>
            <Text code>{v}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ];

  const statCard = (title: string, value: React.ReactNode, extra?: React.ReactNode) => (
    <Card size="small" style={{ height: '100%' }}>
      <Statistic title={title} value={value as any} valueStyle={typeof value === 'string' ? { fontSize: 18 } : undefined} />
      {extra && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {extra}
        </Text>
      )}
    </Card>
  );

  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Notas de Migración
          </Title>
          <Text type="secondary">
            NT activas en Sirvo (TXT diario) cruzadas con el Excel de notas de LAS: solo las que tienen saldo de servicios o gastos
            presupuestados.
          </Text>
        </div>
        <Space wrap>
          <Button icon={<HistoryOutlined />} onClick={abrirHistorial}>
            Historial de cargas
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              loadResumen();
              loadItems();
            }}
          >
            Actualizar
          </Button>
          {canEdit && (
            <Dropdown
              menu={{
                items: (['TXT', 'CXC'] as NtCargaTipo[]).map((t) => ({
                  key: t,
                  icon: REPORTES[t].icon,
                  label: REPORTES[t].titulo,
                })),
                onClick: ({ key }) => setUploadTipo(key as NtCargaTipo),
              }}
            >
              <Button type="primary" icon={<UploadOutlined />}>
                Subir reportes de Sirvo <DownOutlined />
              </Button>
            </Dropdown>
          )}
        </Space>
      </div>

      {resumen && pendientes.length > 0 && (
        <Alert
          type={!ultimaTxt || !ultimaCxc ? 'info' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
          message={`Falta subir ${pendientes.join(' y ')}.`}
          description="Cada día se suben los dos: primero el TXT de NT activas y luego el Excel de notas de Migración."
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          {statCard('Notas de Migración activas', nFmt.format(resumen?.notas_migracion ?? 0) as any, `${nFmt.format(resumen?.clientes_migracion ?? 0)} clientes`)}
        </Col>
        <Col xs={12} md={6}>
          {statCard('NT activas en Sirvo (todas)', nFmt.format(resumen?.activas ?? 0) as any, `${nFmt.format(resumen?.cerradas ?? 0)} cerradas desde que se suben`)}
        </Col>
        <Col xs={12} md={6}>
          {statCard(
            'Último TXT de NT activas',
            fechaCarga(ultimaTxt),
            ultimaTxt && `+${ultimaTxt.nuevas} nuevas · ${ultimaTxt.cerradas} cerradas · ${ultimaTxt.uploaded_by_nombre || ultimaTxt.uploaded_by_username}`,
          )}
        </Col>
        <Col xs={12} md={6}>
          {statCard(
            'Último Excel de notas',
            fechaCarga(ultimaCxc, false),
            ultimaCxc && `${nFmt.format(ultimaCxc.total_nt)} NT · ${ultimaCxc.uploaded_by_nombre || ultimaCxc.uploaded_by_username}`,
          )}
        </Col>
      </Row>

      <Card size="small">
        <Space wrap size={[12, 8]} style={{ marginBottom: 12 }}>
          <Input.Search
            allowClear
            placeholder="NT, cliente o nombre del caso"
            style={{ width: 300 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(v) => setFilter({ q: v.trim() || undefined })}
          />
          <Segmented
            value={filters.estado}
            onChange={(v) => setFilter({ estado: v as NtListParams['estado'] })}
            options={[
              { value: 'activa', label: 'Activas' },
              { value: 'cerrada', label: 'Cerradas' },
              { value: 'todas', label: 'Todas' },
            ]}
          />
          <Space>
            <Switch checked={!!filters.solo_migracion} onChange={(v) => setFilter({ solo_migracion: v })} />
            <Tooltip title="Solo las NT que en el Excel de notas tienen SERV PREST SALDO o GASTOS PRESUP mayor a cero. Apágalo para buscar en todas las NT del bufete.">
              <Text>Solo notas de Migración</Text>
            </Tooltip>
          </Space>
        </Space>
        <Table
          rowKey="nt"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={items}
          scroll={{ x: 900 }}
          pagination={{
            current: filters.page,
            pageSize: filters.page_size,
            total,
            showSizeChanger: true,
            showTotal: (t) => `${nFmt.format(t)} NT`,
            onChange: (page, page_size) => setFilters((f) => ({ ...f, page, page_size })),
          }}
        />
      </Card>

      <Modal
        title={uploadTipo ? `Subir ${REPORTES[uploadTipo].titulo}` : ''}
        open={!!uploadTipo}
        footer={null}
        onCancel={() => !uploading && setUploadTipo(null)}
        destroyOnClose
      >
        {uploadTipo && (
          <>
            <Paragraph type="secondary">{REPORTES[uploadTipo].ayuda}</Paragraph>
            <Upload.Dragger
              accept={REPORTES[uploadTipo].accept}
              multiple={false}
              showUploadList={false}
              disabled={uploading}
              beforeUpload={(file) => {
                subir(uploadTipo, file);
                return false;
              }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                {uploading ? 'Procesando…' : `Arrastra aquí el ${uploadTipo === 'TXT' ? '.TXT' : 'Excel'} o haz clic para elegirlo`}
              </p>
            </Upload.Dragger>
          </>
        )}
      </Modal>

      <Modal
        title={resultado?.tipo === 'CXC' ? 'Excel de notas cargado' : 'TXT de NT activas cargado'}
        open={!!resultado}
        onCancel={() => setResultado(null)}
        onOk={() => setResultado(null)}
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        {resultado && (
          <>
            <Paragraph>
              <Text code>{resultado.archivo}</Text>
              {resultado.fecha_reporte && <> · reporte del {fecha(resultado.fecha_reporte, resultado.tipo !== 'CXC')}</>}
            </Paragraph>
            {resultado.tipo === 'CXC' ? (
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="NT en el Excel" value={nFmt.format(resultado.total_nt)} />
                </Col>
                <Col span={8}>
                  <Statistic title="Con saldo o gastos" value={nFmt.format(resultado.con_valor ?? 0)} />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Notas de Migración activas"
                    value={nFmt.format(resultado.notas_migracion ?? 0)}
                    valueStyle={{ color: '#10B981' }}
                  />
                </Col>
              </Row>
            ) : (
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="NT activas" value={nFmt.format(resultado.total_nt)} />
                </Col>
                <Col span={6}>
                  <Statistic title="Nuevas" value={resultado.nuevas} valueStyle={{ color: '#10B981' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="Reabiertas" value={resultado.reabiertas} />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Cerradas"
                    value={resultado.cerradas}
                    valueStyle={{ color: resultado.cerradas ? '#F59E0B' : undefined }}
                  />
                </Col>
              </Row>
            )}
            {resultado.advertencias.length > 0 && (
              <Alert
                style={{ marginTop: 16 }}
                type="warning"
                showIcon
                message="Avisos al leer el archivo"
                description={
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {resultado.advertencias.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                }
              />
            )}
          </>
        )}
      </Modal>

      <Drawer title="Historial de cargas" width={760} open={historialOpen} onClose={() => setHistorialOpen(false)}>
        <Table
          rowKey="id"
          size="small"
          dataSource={cargas}
          pagination={false}
          columns={[
            {
              title: 'Archivo',
              dataIndex: 'tipo',
              render: (t: NtCargaTipo, r) => (
                <Tooltip title={r.archivo}>
                  <Tag icon={REPORTES[t]?.icon}>{t === 'CXC' ? 'Excel notas' : 'TXT activas'}</Tag>
                </Tooltip>
              ),
            },
            { title: 'Subido', dataIndex: 'created_at', render: (v: string) => fecha(v, true) },
            { title: 'Reporte del', render: (_, r) => fechaCarga(r, r.tipo !== 'CXC') },
            { title: 'Por', render: (_, r) => r.uploaded_by_nombre || r.uploaded_by_username || '—' },
            { title: 'NT', dataIndex: 'total_nt', align: 'right', render: (v: number) => nFmt.format(v) },
            { title: 'Nuevas', dataIndex: 'nuevas', align: 'right' },
            {
              title: 'Cerradas / quitadas',
              dataIndex: 'cerradas',
              align: 'right',
            },
          ]}
        />
      </Drawer>
    </div>
  );
}
