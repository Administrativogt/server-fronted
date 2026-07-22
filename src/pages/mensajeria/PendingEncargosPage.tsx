// src/pages/mensajeria/PendingEncargosPage.tsx
// Clon visual de "Envios Pendientes" del Django viejo
// (solicitudes/usuarios/envios.html + static/js/solicitudes/envios.js):
// título centrado, botonera de colores (Crear Envio verde, Crear Reporte
// amarillo con dropdown, Ver entregados gris, Envios asignados celeste para
// mensajeros, Filtrar encargos azul + reset rojo), tabla con las columnas y el
// orden del viejo (Pr, Realización, Hora, Opciones con iconos, Observaciones,
// Estado, comentarios) y filas azules cuando el envío tiene observaciones.
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, message, Modal, Input, Select, Tooltip, Empty, Grid, DatePicker, ConfigProvider, Dropdown } from 'antd';
import dayjs from 'dayjs';
import {
  InfoCircleOutlined,
  FlagFilled,
  EditOutlined,
  DeleteOutlined,
  CloseOutlined,
  CheckOutlined,
  CheckSquareOutlined,
  BookOutlined,
  WarningOutlined,
  CommentOutlined,
  ReloadOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  getPendingEncargos,
  deleteEncargo,
  rejectEncargo,
  reportIncidence,
  updateEncargo,
  getMensajeros,
  downloadEncargosExcel,
} from '../../api/encargos';
import type { Encargo, Usuario } from '../../types/encargo';
import CommentModal from './components/CommentModal';
import EncargoCardList from './components/EncargoCardList';
import { PRIORIDADES_TEXTO, formatFecha, formatHorario, saveExcelResponse } from './constants';
import { confirmarEntrega } from './deliver';
import useAuthStore from '../../auth/useAuthStore';
import { useMensajeriaPermissions } from '../../hooks/usePermissions';

const { confirm } = Modal;
const { TextArea } = Input;
const { Option } = Select;

// Paleta Bootstrap del sistema viejo
const BTN = {
  success: { background: '#28a745', borderColor: '#28a745', color: '#fff' },
  warning: { background: '#ffc107', borderColor: '#ffc107', color: '#212529' },
  secondary: { background: '#6c757d', borderColor: '#6c757d', color: '#fff' },
  info: { background: '#17a2b8', borderColor: '#17a2b8', color: '#fff' },
  primary: { background: '#0d6efd', borderColor: '#0d6efd', color: '#fff' },
  danger: { background: '#dc3545', borderColor: '#dc3545', color: '#fff' },
};

/** "2026-07-20…" → "20/07/2026", como lo mostraba Django */
const ddmmyyyy = (date?: string | null): string => {
  const ymd = formatFecha(date);
  if (ymd === '—') return ymd;
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
};

const PendingEncargosPage: React.FC = () => {
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exporting, setExporting] = useState(false);

  // En viewports < md (mensajeros en ruta) la tabla se reemplaza por tarjetas
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [commentModalOpen, setCommentModalOpen] = useState<{ open: boolean; encargoId: number | null }>({
    open: false,
    encargoId: null,
  });
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: 'reject' | 'incidence' | null;
    encargoId: number | null;
    reason: string;
  }>({
    open: false,
    type: null,
    encargoId: null,
    reason: '',
  });
  // Crear Reporte (dropdown viejo): 1 = En proceso, 2 = General
  const [exportModal, setExportModal] = useState(false);
  const [exportType, setExportType] = useState<1 | 2>(2);
  const [selectedMensajero, setSelectedMensajero] = useState<number | null>(null);
  const [mensajeros, setMensajeros] = useState<Usuario[]>([]);
  // Selección de mensajero por fila (select + botón Asignar, como el viejo)
  const [pendingAssign, setPendingAssign] = useState<Record<number, number>>({});
  // Modal "Filtrar encargos" del viejo
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filterMensajero, setFilterMensajero] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([null, null]);
  const navigate = useNavigate();

  const userId = useAuthStore((state) => state.userId);
  const tipoUsuario = useAuthStore((state) => state.tipo_usuario);
  const isMensajero = tipoUsuario === 8;
  const { isAdminMensajeria } = useMensajeriaPermissions();
  // Grupo mensajería/admin: opera los envíos (asignar, aceptar, entregar…)
  const canOperate = isMensajero || isAdminMensajeria;

  useEffect(() => {
    loadEncargos();
    getMensajeros()
      .then((res) => {
        const sorted = res.data.sort((a: Usuario, b: Usuario) =>
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'es'),
        );
        setMensajeros(sorted);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isMensajero]);

  const loadEncargos = async () => {
    setLoading(true);
    try {
      const res = await getPendingEncargos();
      // Estados activos: Pendiente (1), En proceso (2), Extraordinario (5).
      // Los mensajeros ven TODOS los pendientes (como en el sistema viejo).
      setEncargos(res.data.filter((e: Encargo) => [1, 2, 5].includes(e.estado)));
      setLoadError(false);
    } catch (error) {
      console.error('Error al cargar encargos pendientes:', error);
      setLoadError(true);
      message.error('No se pudieron cargar los envíos pendientes');
    } finally {
      setLoading(false);
    }
  };

  const filteredEncargos = encargos.filter((e) => {
    if (filterMensajero && e.mensajero?.id !== filterMensajero) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      const hay = [
        `${e.solicitante?.first_name ?? ''} ${e.solicitante?.last_name ?? ''}`,
        e.destinatario,
        e.empresa,
        e.direccion,
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    const [start, end] = dateRange;
    if (start && (e.fecha_realizacion || '') < start) return false;
    if (end && (e.fecha_realizacion || '') > end) return false;
    return true;
  });

  const hasActiveFilters = Boolean(searchText || dateRange[0] || dateRange[1] || filterMensajero);

  const resetFilters = () => {
    setSearchText('');
    setDateRange([null, null]);
    setFilterMensajero(null);
  };

  // Asignar mensajero: select + botón "Asignar" (igual que el viejo)
  const handleAssignMensajero = async (encargoId: number) => {
    const mensajeroId = pendingAssign[encargoId];
    if (!mensajeroId) {
      message.warning('Seleccione un mensajero');
      return;
    }
    try {
      await updateEncargo(encargoId, { mensajero_id: mensajeroId });
      message.success('Mensajero asignado');
      loadEncargos();
    } catch {
      message.error('No se pudo asignar el mensajero');
    }
  };

  const downloadExcel = async (mensajeroId: number, type: 1 | 2) => {
    setExporting(true);
    try {
      const response = await downloadEncargosExcel({ mensajeroId, type });
      saveExcelResponse(response, type === 1 ? 'Ruta-En-Proceso.xlsx' : 'Reporte-General.xlsx');
      message.success('Reporte descargado exitosamente');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Error al descargar reporte');
    } finally {
      setExporting(false);
    }
  };

  const handleCrearReporte = (type: 1 | 2) => {
    setExportType(type);
    if (isMensajero && userId) {
      downloadExcel(userId, type);
    } else {
      setExportModal(true);
    }
  };

  const handleConfirmExport = async () => {
    if (!selectedMensajero) {
      message.warning('Por favor seleccione un mensajero');
      return;
    }
    await downloadExcel(selectedMensajero, exportType);
    setExportModal(false);
    setSelectedMensajero(null);
  };

  // "Aceptar" del viejo (check negro): Pendiente → En proceso
  const handleAceptar = (id: number) => {
    confirm({
      title: '¿Aceptar envío?',
      content: '¿Desea aceptar este envío y marcarlo "En proceso"?',
      okText: 'Aceptar',
      okType: 'primary',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await updateEncargo(id, { estado: 2 } as any);
          message.success('Envío aceptado ("En proceso")');
          loadEncargos();
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Error al aceptar');
        }
      },
    });
  };

  // Flujo de entrega viejo compartido: fecha_entrega + 5→8 + razón de tardanza
  const handleDeliver = (record: Encargo) => confirmarEntrega(record, loadEncargos);

  // "Extraordinario" del viejo (alerta naranja): estado 5 y va a editar
  const handleExtraordinario = (id: number) => {
    confirm({
      title: '¿Marcar como Extraordinario?',
      content: 'El envío pasará a estado Extraordinario y podrá editar el detalle.',
      okText: 'Sí, marcar',
      okType: 'primary',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await updateEncargo(id, { estado: 5 } as any);
          navigate(`/dashboard/mensajeria/editar/${id}`);
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Error al marcar extraordinario');
        }
      },
    });
  };

  const handleDelete = (id: number) => {
    confirm({
      title: '¿Eliminar envío?',
      content: 'Esta acción no se puede deshacer.',
      okText: 'Sí, eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteEncargo(id);
          message.success('Envío eliminado correctamente');
          loadEncargos();
        } catch (err: any) {
          const msg = err.response?.data?.message || 'Error al eliminar el envío';
          message.error(msg);
        }
      },
    });
  };

  const handleReject = (id: number) => {
    setActionModal({ open: true, type: 'reject', encargoId: id, reason: '' });
  };

  const handleIncidence = (id: number) => {
    setActionModal({ open: true, type: 'incidence', encargoId: id, reason: '' });
  };

  const handleActionOk = async () => {
    if (!actionModal.encargoId || !actionModal.reason.trim()) {
      message.warning('Debe ingresar una razón');
      return;
    }

    try {
      if (actionModal.type === 'reject') {
        await rejectEncargo(actionModal.encargoId, actionModal.reason);
        message.success('Envío rechazado');
      } else if (actionModal.type === 'incidence') {
        await reportIncidence(actionModal.encargoId, actionModal.reason);
        message.success('Incidencia reportada');
      }
      loadEncargos();
      setActionModal({ open: false, type: null, encargoId: null, reason: '' });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error al procesar la acción');
    }
  };

  // Iconos de "Opciones" del viejo (lápiz, basurero, X, check, check verde,
  // agenda, alerta) — mismos colores de referencia
  const iconBtn = (
    title: string,
    icon: React.ReactNode,
    color: string,
    onClick: () => void,
  ) => (
    <Tooltip title={title} key={title}>
      <span
        role="button"
        aria-label={title}
        onClick={onClick}
        style={{ color, fontSize: 18, cursor: 'pointer', padding: '0 2px' }}
      >
        {icon}
      </span>
    </Tooltip>
  );

  const renderOpciones = (record: Encargo) => {
    const opciones: React.ReactNode[] = [];
    // Editar: todos (los mensajeros lo pidieron explícitamente)
    opciones.push(iconBtn('Editar', <EditOutlined />, '#8d6e63', () => navigate(`/dashboard/mensajeria/editar/${record.id}`)));
    if (!isMensajero) {
      opciones.push(iconBtn('Eliminar', <DeleteOutlined />, '#1976d2', () => handleDelete(record.id)));
    }
    if (canOperate) {
      if (record.estado === 1) {
        opciones.push(iconBtn('Rechazar', <CloseOutlined />, '#dc3545', () => handleReject(record.id)));
        opciones.push(iconBtn('Aceptar', <CheckOutlined />, '#212529', () => handleAceptar(record.id)));
      }
      if ([2, 5].includes(record.estado)) {
        opciones.push(iconBtn('Entregado', <CheckSquareOutlined />, '#28a745', () => handleDeliver(record)));
      }
      opciones.push(iconBtn('Agregar incidencia', <BookOutlined />, '#6f42c1', () => handleIncidence(record.id)));
      if ([1, 2].includes(record.estado)) {
        opciones.push(iconBtn('Extraordinario', <WarningOutlined />, '#fd7e14', () => handleExtraordinario(record.id)));
      }
    }
    return <Space size={2} wrap>{opciones}</Space>;
  };

  const ESTADO_TEXTO: Record<number, { label: string; color?: string }> = {
    1: { label: 'Pendiente' },
    2: { label: 'En proceso' },
    5: { label: 'Extraordinario', color: '#dc3545' },
  };

  const columns = [
    {
      title: '#',
      width: '4%',
      key: 'num',
      render: (_: any, record: Encargo, index: number) => (
        <Space size={4}>
          <span>{index + 1}</span>
          <Tooltip title={`Creado: ${new Date(record.fecha_creacion).toLocaleString('es-GT')}`}>
            {/* Rojo como el icono info del viejo */}
            <InfoCircleOutlined style={{ color: '#dc3545', fontSize: 13, cursor: 'pointer' }} />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Solicitante',
      width: '8%',
      key: 'solicitante',
      render: (_: any, record: Encargo) =>
        record.solicitante ? `${record.solicitante.first_name} ${record.solicitante.last_name}` : '-'
    },
    { title: 'Destinatario', dataIndex: 'destinatario', key: 'destinatario', width: '8%' },
    { title: 'Empresa', dataIndex: 'empresa', key: 'empresa', width: '7%' },
    { title: 'Dirección', dataIndex: 'direccion', key: 'direccion', width: '14%' },
    { title: 'Zona', dataIndex: 'zona', key: 'zona', width: '4%', align: 'center' as const },
    {
      title: 'Mensajero',
      width: '9%',
      key: 'mensajero',
      render: (_: any, record: Encargo) => {
        if (record.mensajero) {
          return `${record.mensajero.first_name} ${record.mensajero.last_name}`;
        }
        if (!canOperate) return 'Sin asignar';
        // Select + botón azul "Asignar", como el viejo
        return (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Select
              placeholder="Selec…"
              size="small"
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="children"
              value={pendingAssign[record.id]}
              onChange={(value: number) =>
                setPendingAssign((prev) => ({ ...prev, [record.id]: value }))
              }
            >
              {mensajeros.map((m) => (
                <Select.Option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name}
                </Select.Option>
              ))}
            </Select>
            <Button size="small" style={BTN.primary} onClick={() => handleAssignMensajero(record.id)}>
              Asignar
            </Button>
          </Space>
        );
      }
    },
    {
      title: 'Mensajeria enviada',
      width: '7%',
      dataIndex: 'mensajeria_enviada',
      key: 'mensajeria_enviada',
      render: (v: string) => v || '—',
    },
    {
      title: 'Pr',
      width: '4%',
      dataIndex: 'prioridad',
      key: 'prioridad',
      render: (p: number) => PRIORIDADES_TEXTO[p] || p,
    },
    {
      title: 'Realización',
      width: '7%',
      dataIndex: 'fecha_realizacion',
      key: 'fecha',
      render: (date: string) => ddmmyyyy(date),
    },
    {
      title: 'Hora',
      width: '6%',
      key: 'horario',
      render: (_: any, record: Encargo) => formatHorario(record) || '',
    },
    {
      title: 'Opciones',
      width: '5%',
      key: 'opciones',
      render: (_: any, record: Encargo) => renderOpciones(record),
    },
    {
      title: 'Observaciones',
      width: '8%',
      dataIndex: 'observaciones',
      key: 'observaciones',
      render: (v: string) => v || '',
    },
    {
      title: 'Estado',
      width: '5%',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado: number) => {
        const cfg = ESTADO_TEXTO[estado];
        if (!cfg) return estado;
        return <span style={cfg.color ? { color: cfg.color, fontWeight: 600 } : undefined}>{cfg.label}</span>;
      },
    },
    {
      title: '',
      key: 'comentarios',
      width: '3%',
      render: (_: any, record: Encargo) => (
        <Space size={4}>
          {iconBtn('Comentarios', <CommentOutlined />, '#0d6efd', () =>
            setCommentModalOpen({ open: true, encargoId: record.id }),
          )}
          {record.razon_extra && (
            <Tooltip title={`Comentario: ${record.razon_extra}`}>
              <FlagFilled style={{ color: '#dc3545', fontSize: 14 }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const emptyContent = loadError ? (
    <Empty description="No se pudieron cargar los envíos pendientes">
      <Button type="primary" onClick={loadEncargos}>
        Reintentar
      </Button>
    </Empty>
  ) : (
    <Empty
      description={
        filterMensajero
          ? 'Este mensajero no tiene envíos activos. Quite el filtro para ver todos.'
          : 'No hay envíos pendientes. Los nuevos encargos aparecerán aquí al crearse.'
      }
    />
  );

  // Acciones en tarjeta (móvil): botones con texto y tamaño táctil
  const renderCardActions = (record: Encargo) => (
    <>
      {canOperate && !record.mensajero && (
        <Select
          placeholder="Asignar mensajero…"
          size="large"
          style={{ width: '100%' }}
          showSearch
          optionFilterProp="children"
          onChange={(value: number) => {
            setPendingAssign((prev) => ({ ...prev, [record.id]: value }));
            updateEncargo(record.id, { mensajero_id: value })
              .then(() => {
                message.success('Mensajero asignado');
                loadEncargos();
              })
              .catch(() => message.error('No se pudo asignar el mensajero'));
          }}
        >
          {mensajeros.map((m) => (
            <Select.Option key={m.id} value={m.id}>
              {m.first_name} {m.last_name}
            </Select.Option>
          ))}
        </Select>
      )}
      {record.estado === 1 && record.mensajero && canOperate && (
        <Button size="large" type="primary" icon={<RocketOutlined />} onClick={() => handleAceptar(record.id)}>
          Aceptar
        </Button>
      )}
      {[2, 5].includes(record.estado) && record.mensajero && canOperate && (
        <Button
          size="large"
          type="primary"
          style={BTN.success}
          icon={<CheckCircleOutlined />}
          onClick={() => handleDeliver(record)}
        >
          Entregado
        </Button>
      )}
      <Button size="large" icon={<EditOutlined />} onClick={() => navigate(`/dashboard/mensajeria/editar/${record.id}`)}>
        Editar
      </Button>
      {!isMensajero && (
        <Button size="large" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
          Eliminar
        </Button>
      )}
      {canOperate && record.estado === 1 && (
        <Button size="large" danger icon={<CloseCircleOutlined />} onClick={() => handleReject(record.id)}>
          Rechazar
        </Button>
      )}
      {canOperate && (
        <Button size="large" icon={<WarningOutlined />} onClick={() => handleIncidence(record.id)}>
          Incidencia
        </Button>
      )}
      <Button
        size="large"
        icon={<CommentOutlined />}
        onClick={() => setCommentModalOpen({ open: true, encargoId: record.id })}
      >
        Comentarios
      </Button>
    </>
  );

  return (
    // Letra más grande solo en esta pantalla (pedido de los usuarios)
    <ConfigProvider theme={{ token: { fontSize: 15 } }}>
    <div style={{ padding: '16px 0' }}>
      <style>{`
        .mensajeria-compact-table .ant-table-tbody > tr > td,
        .mensajeria-compact-table .ant-table-thead > tr > th {
          padding-top: 6px;
          padding-bottom: 6px;
          line-height: 1.35;
        }
        .mensajeria-compact-table .ant-table-thead > tr > th {
          text-align: center;
          font-weight: 700;
          font-size: 13px;
          word-break: keep-all;
          padding-left: 2px;
          padding-right: 2px;
        }
        .mensajeria-compact-table .ant-table-tbody > tr > td {
          word-break: break-word;
        }
        /* Pantallas angostas (laptops de la empresa): letra mas compacta */
        @media (max-width: 1600px) {
          .mensajeria-compact-table .ant-table-tbody > tr > td,
          .mensajeria-compact-table .ant-table-thead > tr > th {
            font-size: 13px;
            padding-left: 4px;
            padding-right: 4px;
          }
        }
        /* Fila azul del viejo: envío con observaciones */
        .fila-observaciones > td {
          background-color: rgba(0, 0, 255, 0.4) !important;
        }
      `}</style>

      {/* Título centrado, como el viejo */}
      <h2 style={{ textAlign: 'center', marginTop: 0 }}>Envios Pendientes</h2>

      {/* Botonera del viejo: izquierda acciones, derecha filtro */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          {!isMensajero && (
            <Button style={BTN.success} onClick={() => navigate('/dashboard/mensajeria/crear')}>
              Crear Envio
            </Button>
          )}
          {canOperate && (
            <Dropdown
              menu={{
                items: [
                  { key: '1', label: 'En proceso', onClick: () => handleCrearReporte(1) },
                  { key: '2', label: 'General', onClick: () => handleCrearReporte(2) },
                ],
              }}
            >
              <Button style={BTN.warning} loading={exporting}>
                Crear Reporte
              </Button>
            </Dropdown>
          )}
          <Button style={BTN.secondary} onClick={() => navigate('/dashboard/mensajeria/todos')}>
            Ver entregados
          </Button>
          {isMensajero && (
            <Button style={BTN.info} onClick={() => navigate('/dashboard/mensajeria/asignados')}>
              Envios asignados
            </Button>
          )}
        </Space>
        <Space>
          <Button style={BTN.primary} onClick={() => setFilterModalOpen(true)}>
            Filtrar encargos
          </Button>
          <Tooltip title="Quitar filtros">
            <Button
              style={BTN.danger}
              icon={<ReloadOutlined />}
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            />
          </Tooltip>
        </Space>
      </div>

      {isMobile ? (
        <EncargoCardList
          encargos={filteredEncargos}
          loading={loading}
          emptyText={emptyContent}
          renderActions={renderCardActions}
        />
      ) : (
        <Table
          className="mensajeria-compact-table"
          tableLayout="fixed"
          dataSource={filteredEncargos}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            defaultPageSize: 20,
            pageSizeOptions: ['10', '20', '50', '100'],
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} envíos`,
          }}
          bordered
          rowClassName={(record: Encargo) => (record.observaciones ? 'fila-observaciones' : '')}
          locale={{ emptyText: emptyContent }}
        />
      )}

      {/* Modal de comentarios */}
      {commentModalOpen.open && commentModalOpen.encargoId !== null && (
        <CommentModal
          open={true}
          encargoId={commentModalOpen.encargoId}
          onClose={() => setCommentModalOpen({ open: false, encargoId: null })}
        />
      )}

      {/* Modal "Filtrar encargos" del viejo: texto + rango de fechas (+ mensajero) */}
      <Modal
        title="Filtrar encargos"
        open={filterModalOpen}
        onCancel={() => setFilterModalOpen(false)}
        onOk={() => setFilterModalOpen(false)}
        okText="Aplicar"
        cancelText="Cerrar"
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Input
            placeholder="Buscar por solicitante, destinatario, empresa o dirección…"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <DatePicker.RangePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            placeholder={['Fecha inicio', 'Fecha final']}
            value={[
              dateRange[0] ? dayjs(dateRange[0]) : null,
              dateRange[1] ? dayjs(dateRange[1]) : null,
            ]}
            onChange={(dates) =>
              setDateRange([
                dates?.[0] ? dates[0].format('YYYY-MM-DD') : null,
                dates?.[1] ? dates[1].format('YYYY-MM-DD') : null,
              ])
            }
          />
          {!isMensajero && (
            <Select
              style={{ width: '100%' }}
              placeholder="Todos los mensajeros"
              value={filterMensajero}
              onChange={(value) => setFilterMensajero(value)}
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {mensajeros.map((m) => (
                <Option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name}
                </Option>
              ))}
            </Select>
          )}
          <span>
            {filteredEncargos.length} envío{filteredEncargos.length === 1 ? '' : 's'} con los filtros actuales
          </span>
        </Space>
      </Modal>

      {/* Modal para seleccionar mensajero al exportar (Crear Reporte) */}
      <Modal
        title="Seleccione el mensajero"
        confirmLoading={exporting}
        open={exportModal}
        onCancel={() => { setExportModal(false); setSelectedMensajero(null); }}
        onOk={handleConfirmExport}
        okText="Descargar"
        cancelText="Cancelar"
      >
        <Select
          style={{ width: '100%' }}
          placeholder="Seleccione un mensajero"
          value={selectedMensajero}
          onChange={(value) => setSelectedMensajero(value)}
          showSearch
          optionFilterProp="children"
          filterOption={(input, option) =>
            String(option?.children || '').toLowerCase().includes(input.toLowerCase())
          }
        >
          {mensajeros.map((m) => (
            <Option key={m.id} value={m.id}>
              {m.first_name} {m.last_name}
            </Option>
          ))}
        </Select>
      </Modal>

      {/* Modal razón de rechazo / incidencia */}
      <Modal
        title={actionModal.type === 'reject' ? 'Razón del rechazo' : 'Razón de la incidencia'}
        open={actionModal.open}
        onCancel={() => setActionModal({ open: false, type: null, encargoId: null, reason: '' })}
        onOk={handleActionOk}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <TextArea
          rows={3}
          placeholder="Escriba la razón…"
          value={actionModal.reason}
          onChange={(e) => setActionModal((prev) => ({ ...prev, reason: e.target.value }))}
        />
      </Modal>
    </div>
    </ConfigProvider>
  );
};

export default PendingEncargosPage;
