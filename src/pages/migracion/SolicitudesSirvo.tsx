import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Empty,
  InputNumber,
  Popconfirm,
  Result,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, ReloadOutlined, UndoOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  asignarSirvoId,
  estatusInfo,
  getBandeja,
  getDineroAccess,
  type BandejaVista,
  type DineroItem,
} from '../../api/migracionDinero';
import { notifyBandejaChanged } from '../../utils/migracion';

const { Title, Text } = Typography;

const fecha = (v?: string | null) => (v ? dayjs(v).format('DD/MM/YY') : '—');
const quetzales = (v?: number | null) =>
  v != null ? `Q${v.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

/**
 * Bandeja de cobros de Migración: lo que el equipo registra en Control de dinero
 * cae aquí; cobros lo pide en Sirvo y pone el ID de la solicitud. Con el ID, el
 * estatus del cheque (módulo de cheques) aparece solo en Control de dinero.
 */
export default function SolicitudesSirvo() {
  const [forbidden, setForbidden] = useState(false);
  const [vista, setVista] = useState<BandejaVista>('pendientes');
  const [items, setItems] = useState<DineroItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [ids, setIds] = useState<Record<number, number | null>>({});
  const [guardando, setGuardando] = useState<number | null>(null);

  useEffect(() => {
    getDineroAccess()
      .then(({ data }) => !data.bandeja && setForbidden(true))
      .catch(() => setForbidden(true));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    getBandeja(vista)
      .then(({ data }) => setItems(data))
      .catch((e) => {
        if (e?.response?.status === 403) setForbidden(true);
        else message.error('No se pudo cargar la bandeja');
      })
      .finally(() => setLoading(false));
  }, [vista]);

  useEffect(load, [load]);

  const guardar = async (r: DineroItem, requestId: number | null) => {
    setGuardando(r.id);
    try {
      const { data } = await asignarSirvoId(r.id, requestId);
      if (requestId == null) message.success('Se quitó el ID; la solicitud regresó a pendientes');
      else if (data.estatus === 'en_sirvo')
        message.success(`ID ${requestId} guardado. El estatus del cheque aparece cuando llegue de Sirvo (unos minutos).`);
      else message.success(`ID ${requestId} guardado: ${estatusInfo(data.estatus).label}`);
      setIds((p) => ({ ...p, [r.id]: null }));
      notifyBandejaChanged();
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo guardar el ID');
    } finally {
      setGuardando(null);
    }
  };

  if (forbidden) {
    return <Result status="403" title="Sin acceso" subTitle="Esta bandeja es de cobros de Migración." />;
  }

  const base: ColumnsType<DineroItem> = [
    { title: 'Solicitud', dataIndex: 'fecha_solicitud', width: 90, render: fecha },
    {
      title: 'Solicitado por',
      key: 'sol',
      width: 150,
      render: (_, r) => r.solicitado_por_nombre || r.solicitado_por_iniciales || '—',
    },
    { title: 'NT', dataIndex: 'nt', width: 80, render: (v) => (v ? <Text strong>{v}</Text> : '—') },
    {
      title: 'Cliente y caso',
      key: 'cliente',
      width: 220,
      render: (_, r) => (
        <div style={{ lineHeight: 1.3 }}>
          {r.cliente_nombre || r.cliente_codigo || '—'}
          {r.caso_nombre && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {r.caso_nombre}
              </Text>
            </>
          )}
        </div>
      ),
    },
    { title: 'Concepto', dataIndex: 'concepto', width: 220 },
    { title: 'Cant.', dataIndex: 'cantidad', width: 60, align: 'right' },
    { title: 'Monto', dataIndex: 'monto', width: 110, align: 'right', render: quetzales },
    { title: 'Nombre de cheque', dataIndex: 'beneficiario', width: 160, render: (v) => v || '—' },
    { title: 'Uso', dataIndex: 'fecha_uso', width: 90, render: fecha },
  ];

  const pendientesCols: ColumnsType<DineroItem> = [
    ...base,
    {
      title: 'ID de Sirvo',
      key: 'id',
      fixed: 'right',
      width: 200,
      render: (_, r) => (
        <Space.Compact style={{ width: '100%' }}>
          <InputNumber
            style={{ width: '100%' }}
            controls={false}
            min={1}
            precision={0}
            placeholder="ID solicitud"
            value={ids[r.id] ?? null}
            onChange={(v) => setIds((p) => ({ ...p, [r.id]: v ?? null }))}
            onPressEnter={() => ids[r.id] && guardar(r, ids[r.id]!)}
          />
          <Tooltip title="Guardar ID">
            <Button
              type="primary"
              icon={<CheckOutlined />}
              disabled={!ids[r.id]}
              loading={guardando === r.id}
              onClick={() => guardar(r, ids[r.id]!)}
            />
          </Tooltip>
        </Space.Compact>
      ),
    },
  ];

  const enviadasCols: ColumnsType<DineroItem> = [
    ...base,
    { title: 'ID de Sirvo', dataIndex: 'request_id', width: 100, render: (v) => <Text strong>{v}</Text> },
    {
      title: 'Estatus del cheque',
      key: 'estatus',
      width: 160,
      render: (_, r) => {
        const e = estatusInfo(r.estatus);
        return (
          <Tooltip title={e.hint}>
            <Tag color={e.color}>{e.label}</Tag>
          </Tooltip>
        );
      },
    },
    { title: 'No. cheque', dataIndex: 'numero_cheque', width: 100, render: (v) => v || '—' },
    {
      key: 'acc',
      fixed: 'right',
      width: 60,
      render: (_, r) => (
        <Popconfirm
          title="¿Quitar el ID de Sirvo?"
          description="La solicitud regresa a pendientes."
          okText="Quitar"
          okButtonProps={{ danger: true }}
          onConfirm={() => guardar(r, null)}
        >
          <Tooltip title="Quitar ID (si se puso mal)">
            <Button size="small" icon={<UndoOutlined />} loading={guardando === r.id} />
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Solicitudes a Sirvo
          </Title>
          <Text type="secondary">
            Lo que el equipo registra en Control de dinero. Pídelo en Sirvo y pon aquí el ID de la solicitud: el estatus del
            cheque se ve solo en Control de dinero.
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load}>
          Actualizar
        </Button>
      </div>

      <Tabs
        activeKey={vista}
        onChange={(k) => setVista(k as BandejaVista)}
        items={[
          { key: 'pendientes', label: 'Por pedir en Sirvo' },
          { key: 'enviadas', label: 'Enviadas (últimos 60 días)' },
        ]}
      />

      {vista === 'enviadas' && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="“Enviado a Sirvo” = el ID todavía no llega del módulo de cheques (se sincroniza cada 2 minutos)."
        />
      )}

      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={items}
        columns={vista === 'pendientes' ? pendientesCols : enviadasCols}
        scroll={{ x: 1400 }}
        pagination={{ pageSize: 50, hideOnSinglePage: true }}
        locale={{
          emptyText: (
            <Empty
              description={vista === 'pendientes' ? 'No hay solicitudes por pedir en Sirvo' : 'Sin solicitudes enviadas'}
            />
          ),
        }}
      />
    </div>
  );
}
