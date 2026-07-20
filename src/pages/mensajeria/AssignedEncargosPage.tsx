// src/pages/mensajeria/AssignedEncargosPage.tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, message, Modal, DatePicker, Empty, Grid } from 'antd';
import { RocketOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { updateEncargo, getAllEncargos } from '../../api/encargos';
import type { Encargo } from '../../types/encargo';
import EncargoExpandedRow from './components/EncargoExpandedRow';
import EncargoCardList from './components/EncargoCardList';
import { ESTADOS, formatFecha, formatHorario, hasDetalles } from './constants';
import useAuthStore from '../../auth/useAuthStore';
import { useMensajeriaPermissions } from '../../hooks/usePermissions';

const { confirm } = Modal;
const { RangePicker } = DatePicker;

// Rango por defecto: últimos 30 días. Sin esto la pantalla pedía los ~29 mil
// encargos históricos completos y tardaba varios segundos en cargar.
const DEFAULT_START = () => dayjs().subtract(30, 'day').format('YYYY-MM-DD');
const DEFAULT_END = () => dayjs().format('YYYY-MM-DD');

const AssignedEncargosPage: React.FC = () => {
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState({
    startDate: DEFAULT_START() as string | null,
    endDate: DEFAULT_END() as string | null,
  });
  const userId = useAuthStore((state) => state.userId);
  const tipoUsuario = useAuthStore((state) => state.tipo_usuario);
  const isMensajero = tipoUsuario === 8;
  const { isAdminMensajeria } = useMensajeriaPermissions();

  // En viewports < md (mensajeros en ruta) la tabla se reemplaza por tarjetas
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const loadEncargos = async () => {
    setLoading(true);
    try {
      const params: any = {
        start: filters.startDate || undefined,
        end: filters.endDate || undefined,
      };

      // ✅ Si es mensajero, filtrar por sus encargos desde el backend
      if (isMensajero && userId) {
        params.mensajero = userId;
      }

      const res = await getAllEncargos(params);
      // Solo envíos con mensajero asignado (el mensajero ya viene filtrado del backend)
      setEncargos(res.data.filter((e) => e.mensajero != null));
      setLoadError(false);
    } catch {
      setLoadError(true);
      message.error('Error al cargar envíos asignados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEncargos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isMensajero, isAdminMensajeria, filters]);

  const handleDateChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setFilters({
        startDate: dates[0]?.format('YYYY-MM-DD') || null,
        endDate: dates[1]?.format('YYYY-MM-DD') || null,
      });
    } else {
      setFilters({ startDate: DEFAULT_START(), endDate: DEFAULT_END() });
    }
  };

  const handleStartDelivery = (id: number) => {
    confirm({
      title: '¿Iniciar entrega?',
      content: '¿Desea marcar este envío como "En proceso"?',
      okText: 'Sí, iniciar',
      okType: 'primary',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await updateEncargo(id, { estado: 2 } as any); // Estado 2 = En proceso
          message.success('Envío marcado como "En proceso"');
          loadEncargos();
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Error al iniciar');
        }
      },
    });
  };

  const handleDeliver = (id: number) => {
    confirm({
      title: '¿Confirmar entrega?',
      content: '¿Está seguro que desea marcar este envío como entregado?',
      okText: 'Sí, entregar',
      okType: 'primary',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await updateEncargo(id, { estado: 3 } as any);
          message.success('Envío marcado como entregado');
          loadEncargos();
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Error al entregar');
        }
      },
    });
  };

  // Acciones compartidas entre la tabla (desktop) y las tarjetas (móvil);
  // en móvil los botones crecen para ser objetivo táctil cómodo.
  const renderAcciones = (record: Encargo, size: 'small' | 'large' = 'small') => (
    <>
      {record.estado === 1 && (
        <Button
          size={size}
          type="default"
          icon={<RocketOutlined />}
          onClick={() => handleStartDelivery(record.id)}
        >
          Iniciar
        </Button>
      )}
      {record.estado === 2 && (
        <Button
          size={size}
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={() => handleDeliver(record.id)}
        >
          Entregar
        </Button>
      )}
      {record.estado === 3 && <Tag color="green">Completado</Tag>}
    </>
  );

  const columns = [
    { title: '#', dataIndex: 'id', key: 'id', width: 60 },
    ...(isAdminMensajeria ? [{
      title: 'Mensajero',
      key: 'mensajero',
      render: (_: any, record: Encargo) =>
        record.mensajero ? `${record.mensajero.first_name} ${record.mensajero.last_name}` : '-'
    }] : []),
    {
      title: 'Solicitante',
      key: 'solicitante',
      render: (_: any, record: Encargo) =>
        record.solicitante ? `${record.solicitante.first_name} ${record.solicitante.last_name}` : '-'
    },
    { title: 'Destinatario', dataIndex: 'destinatario', key: 'destinatario' },
    { title: 'Empresa', dataIndex: 'empresa', key: 'empresa' },
    { title: 'Dirección', dataIndex: 'direccion', key: 'direccion' },
    { title: 'Zona', dataIndex: 'zona', key: 'zona', width: 80 },
    {
      title: 'Fecha',
      dataIndex: 'fecha_realizacion',
      key: 'fecha',
      render: (date: string) => formatFecha(date),
    },
    {
      title: 'Horario',
      key: 'horario',
      width: 140,
      render: (_: any, record: Encargo) => formatHorario(record) || '—',
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado: number) => {
        const config = ESTADOS[estado];
        return config ? <Tag color={config.color}>{config.label}</Tag> : estado;
      },
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_: any, record: Encargo) => <Space size="small">{renderAcciones(record)}</Space>,
    },
  ];

  const emptyContent = loadError ? (
    <Empty description="No se pudieron cargar los envíos asignados">
      <Button type="primary" onClick={loadEncargos}>
        Reintentar
      </Button>
    </Empty>
  ) : (
    <Empty
      description={
        isMensajero
          ? 'No tienes envíos asignados en este rango de fechas.'
          : 'No hay envíos con mensajero asignado en este rango de fechas. Amplíe el rango para ver más.'
      }
    />
  );

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Envíos Asignados</h2>
        <RangePicker
          value={[
            filters.startDate ? dayjs(filters.startDate) : null,
            filters.endDate ? dayjs(filters.endDate) : null,
          ]}
          onChange={handleDateChange}
          allowClear={false}
          style={isMobile ? { width: '100%' } : undefined}
        />
      </div>

      {isMobile ? (
        <EncargoCardList
          encargos={encargos}
          loading={loading}
          emptyText={emptyContent}
          showMensajero={isAdminMensajeria}
          renderActions={(record) => renderAcciones(record, 'large')}
        />
      ) : (
        <Table
          dataSource={encargos}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1140 }}
          bordered
          expandable={{
            expandedRowRender: (record: Encargo) => <EncargoExpandedRow encargo={record} />,
            rowExpandable: hasDetalles,
          }}
          locale={{ emptyText: emptyContent }}
        />
      )}

    </div>
  );
};

export default AssignedEncargosPage;
