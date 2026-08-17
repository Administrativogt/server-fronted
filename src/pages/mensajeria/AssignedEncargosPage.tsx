// src/pages/mensajeria/AssignedEncargosPage.tsx
// Réplica de la pantalla "Envios Asignados" del Django viejo
// (solicitudes/mensajeros/envios_asignados.html): la "ruta" del mensajero.
// Solo estados 2 (En proceso) y 5 (Extraordinario), SIN filtro de fechas, y una
// única acción por fila: el botón verde "Entregado" con confirmación y razón de
// tardanza si la fecha de realización ya pasó.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Tag, message, Empty, Grid } from 'antd';
import { CheckCircleOutlined, EditOutlined, LeftOutlined } from '@ant-design/icons';
import { getAllEncargos } from '../../api/encargos';
import type { Encargo } from '../../types/encargo';
import EncargoExpandedRow from './components/EncargoExpandedRow';
import EncargoCardList from './components/EncargoCardList';
import { ESTADOS, PRIORIDADES, formatFecha, hasDetalles } from './constants';
import { confirmarEntrega } from './deliver';
import useAuthStore from '../../auth/useAuthStore';
import { useMensajeriaPermissions } from '../../hooks/usePermissions';
import useAutoRefresh from '../../hooks/useAutoRefresh';

/** "2026-07-20…" → "20/07/2026", como lo mostraba Django */
const ddmmyyyy = (date?: string | null): string => {
  const ymd = formatFecha(date);
  if (ymd === '—') return ymd;
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
};

const AssignedEncargosPage: React.FC = () => {
  const navigate = useNavigate();
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const userId = useAuthStore((state) => state.userId);
  const tipoUsuario = useAuthStore((state) => state.tipo_usuario);
  const isMensajero = tipoUsuario === 8;
  const { isAdminMensajeria } = useMensajeriaPermissions();

  // En viewports < md (mensajeros en ruta) la tabla se reemplaza por tarjetas
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  // IDs ya vistos, para avisar solo por asignaciones que llegan estando la
  // pantalla abierta (null hasta la primera carga: esa no genera aviso).
  const knownIdsRef = useRef<Set<number> | null>(null);

  const loadEncargos = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Igual que Django: estado__in=[2,5] del propio mensajero, sin fechas
      const params: any = { estados: [2, 5] };
      if (isMensajero && userId) {
        params.mensajero = userId;
      }
      const res = await getAllEncargos(params);
      // Admin/coordinación ve la ruta activa de todos los mensajeros
      const asignados = res.data.filter((e) => e.mensajero != null);
      if (silent && knownIdsRef.current) {
        const nuevos = asignados.filter((e) => !knownIdsRef.current!.has(e.id)).length;
        if (nuevos > 0) {
          message.info(nuevos === 1 ? 'Te asignaron 1 envío nuevo' : `Te asignaron ${nuevos} envíos nuevos`);
        }
      }
      knownIdsRef.current = new Set(asignados.map((e) => e.id));
      setEncargos(asignados);
      setLoadError(false);
    } catch {
      // En refresco de fondo no molestamos con toasts de error ni tocamos la tabla
      if (!silent) {
        setLoadError(true);
        message.error('Error al cargar envíos asignados');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadEncargos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isMensajero, isAdminMensajeria]);

  // Los envíos asignados aparecen solos, sin recargar la aplicación
  useAutoRefresh(() => loadEncargos(true));

  // Única acción del flujo viejo: botón verde "Entregado" (estados 2 y 5).
  // Editar se conserva por pedido de los mensajeros (2026-07-22).
  const renderAcciones = (record: Encargo, size: 'small' | 'large' = 'small') => (
    <>
      <Button
        size={size}
        type="primary"
        style={{ background: '#28a745', borderColor: '#28a745' }}
        icon={<CheckCircleOutlined />}
        onClick={() => confirmarEntrega(record, loadEncargos)}
      >
        Entregado
      </Button>
      <Button
        size={size}
        icon={<EditOutlined />}
        onClick={() => navigate(`/dashboard/mensajeria/editar/${record.id}`)}
      >
        Editar
      </Button>
    </>
  );

  // Comparador de texto (numeric-aware) para los sorters de columnas
  const byText = (get: (e: Encargo) => string | null | undefined) =>
    (a: Encargo, b: Encargo) =>
      (get(a) || '').localeCompare(get(b) || '', 'es', { numeric: true });

  // Columnas en el orden exacto del Django viejo
  const columns = [
    { title: '#', key: 'num', width: '4%', render: (_: any, __: Encargo, index: number) => index + 1 },
    {
      title: 'Solicitante',
      width: '9%',
      key: 'solicitante',
      sorter: byText((e) =>
        e.solicitante ? `${e.solicitante.first_name} ${e.solicitante.last_name}` : ''),
      render: (_: any, record: Encargo) =>
        record.solicitante ? `${record.solicitante.first_name} ${record.solicitante.last_name}` : '-'
    },
    { title: 'Destinatario', dataIndex: 'destinatario', key: 'destinatario', width: '9%', sorter: byText((e) => e.destinatario) },
    { title: 'Empresa', dataIndex: 'empresa', key: 'empresa', width: '8%', sorter: byText((e) => e.empresa) },
    { title: 'Dirección', dataIndex: 'direccion', key: 'direccion', width: '17%', sorter: byText((e) => e.direccion) },
    { title: 'Zona', dataIndex: 'zona', key: 'zona', width: '4%', sorter: byText((e) => String(e.zona ?? '')) },
    {
      title: 'Mensajero',
      width: '9%',
      key: 'mensajero',
      sorter: byText((e) =>
        e.mensajero ? `${e.mensajero.first_name} ${e.mensajero.last_name}` : ''),
      render: (_: any, record: Encargo) =>
        record.mensajero ? `${record.mensajero.first_name} ${record.mensajero.last_name}` : '-'
    },
    {
      title: 'Mensajería enviada',
      width: '8%',
      dataIndex: 'mensajeria_enviada',
      key: 'mensajeria_enviada',
      sorter: byText((e) => e.mensajeria_enviada),
      render: (v: string) => v || '—',
    },
    {
      title: 'Prioridad',
      width: '5%',
      dataIndex: 'prioridad',
      key: 'prioridad',
      sorter: (a: Encargo, b: Encargo) => (a.prioridad ?? 0) - (b.prioridad ?? 0),
      render: (p: number) => PRIORIDADES[p] || p,
    },
    {
      title: 'Fecha de realización',
      width: '8%',
      dataIndex: 'fecha_realizacion',
      key: 'fecha',
      sorter: byText((e) => e.fecha_realizacion),
      render: (date: string) => ddmmyyyy(date),
    },
    {
      title: 'Estado',
      width: '7%',
      dataIndex: 'estado',
      key: 'estado',
      sorter: (a: Encargo, b: Encargo) => (a.estado ?? 0) - (b.estado ?? 0),
      render: (estado: number) => {
        const config = ESTADOS[estado];
        return config ? <Tag color={config.color}>{config.label}</Tag> : estado;
      },
    },
    {
      title: 'Opciones',
      width: '10%',
      key: 'opciones',
      render: (_: any, record: Encargo) => <Space size="small">{renderAcciones(record)}</Space>,
    },
  ];

  const emptyContent = loadError ? (
    <Empty description="No se pudieron cargar los envíos asignados">
      <Button type="primary" onClick={() => loadEncargos()}>
        Reintentar
      </Button>
    </Empty>
  ) : (
    <Empty description="No tienes encargos asignados" />
  );

  return (
    <div style={{ padding: '16px 0' }}>
      <style>{`
        .asignados-table .ant-table-thead > tr > th {
          text-align: center;
          font-weight: 700;
          font-size: 13px;
          word-break: keep-all;
          padding-left: 2px;
          padding-right: 2px;
        }
        .asignados-table .ant-table-tbody > tr > td {
          word-break: break-word;
        }
        @media (max-width: 1600px) {
          .asignados-table .ant-table-tbody > tr > td,
          .asignados-table .ant-table-thead > tr > th {
            font-size: 13px;
            padding-left: 4px;
            padding-right: 4px;
          }
        }
      `}</style>
      {/* Título centrado y botón Regresar celeste, como el viejo */}
      <h2 style={{ textAlign: 'center', marginTop: 0 }}>Envios Asignados</h2>
      <div style={{ marginBottom: 16 }}>
        <Button
          style={{ background: '#17a2b8', borderColor: '#17a2b8', color: '#fff' }}
          icon={<LeftOutlined />}
          onClick={() => navigate('/dashboard/mensajeria')}
        >
          Regresar
        </Button>
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
          className="asignados-table"
          tableLayout="fixed"
          dataSource={encargos}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          bordered
          expandable={{
            columnWidth: 32,
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
