// src/pages/mensajeria/PendingEncargosPage.tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, message, Modal, Input, Select, Tooltip, Empty, theme, Grid, DatePicker } from 'antd';
import dayjs from 'dayjs';
import {
  InfoCircleOutlined,
  FlagFilled,
  RocketOutlined,
  CheckCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  CommentOutlined,
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
import EncargoExpandedRow from './components/EncargoExpandedRow';
import EncargoCardList from './components/EncargoCardList';
import { ESTADOS, PRIORIDADES, formatFecha, formatHorario, hasDetalles, saveExcelResponse } from './constants';
import useAuthStore from '../../auth/useAuthStore'; // ✅ Importar

const { confirm } = Modal;
const { TextArea } = Input;
const { Option } = Select;

const PendingEncargosPage: React.FC = () => {
  const [encargos, setEncargos] = useState<Encargo[]>([]); // ✅ Corregido: solo un paréntesis
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { token } = theme.useToken();

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
  const [exportModal, setExportModal] = useState(false);
  const [selectedMensajero, setSelectedMensajero] = useState<number | null>(null);
  const [mensajeros, setMensajeros] = useState<Usuario[]>([]);
  const [filterMensajero, setFilterMensajero] = useState<number | null>(null);
  // Filtro "Filtrar encargos": texto libre + rango de fechas de realización
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([null, null]);
  const navigate = useNavigate();
  
  // ✅ Obtener usuario actual para filtrar si es mensajero
  const userId = useAuthStore((state) => state.userId);
  const tipoUsuario = useAuthStore((state) => state.tipo_usuario);
  const isMensajero = tipoUsuario === 8;

  useEffect(() => {
    loadEncargos();
    if (!isMensajero) {
      getMensajeros()
        .then((res) => {
          const sorted = res.data.sort((a: Usuario, b: Usuario) =>
            `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'es'),
          );
          setMensajeros(sorted);
        })
        .catch(() => {});
    }
  }, [userId, isMensajero]); // ✅ Agregar dependencias

  const loadEncargos = async () => {
    setLoading(true);
    try {
      const res = await getPendingEncargos();
      // Estados activos: Pendiente (1), En proceso (2), Extraordinario (5) — igual que Django original
      const activeOnly = res.data.filter((e: Encargo) => [1, 2, 5].includes(e.estado));

      if (isMensajero && userId) {
        setEncargos(activeOnly.filter((e: Encargo) => e.mensajero?.id === userId));
      } else {
        setEncargos(activeOnly);
      }
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
    // Búsqueda por texto en solicitante, destinatario, empresa y dirección
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
    // Rango de fechas de realización
    const [start, end] = dateRange;
    if (start && (e.fecha_realizacion || '') < start) return false;
    if (end && (e.fecha_realizacion || '') > end) return false;
    return true;
  });

  // Asignar mensajero directo desde la celda de la tabla
  const handleAssignMensajero = async (encargoId: number, mensajeroId: number) => {
    try {
      await updateEncargo(encargoId, { mensajero_id: mensajeroId });
      message.success('Mensajero asignado');
      loadEncargos();
    } catch {
      message.error('No se pudo asignar el mensajero');
    }
  };

  const downloadExcel = async (mensajeroId: number) => {
    setExporting(true);
    try {
      const encargoIds = filteredEncargos.map((e) => e.id);
      const response = await downloadEncargosExcel({ mensajeroId, encargoIds });
      saveExcelResponse(response, 'Ruta-Pendientes.xlsx');
      message.success('Reporte descargado exitosamente');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Error al descargar reporte');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = () => {
    if (isMensajero && userId) {
      downloadExcel(userId);
    } else {
      setExportModal(true);
    }
  };

  const handleConfirmExport = async () => {
    if (!selectedMensajero) {
      message.warning('Por favor seleccione un mensajero');
      return;
    }
    await downloadExcel(selectedMensajero);
    setExportModal(false);
    setSelectedMensajero(null);
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
          await updateEncargo(id, { estado: 2 } as any);
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
      title: '¿Marcar como entregado?',
      content: '¿Confirma que el envío ya fue entregado?',
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

  const columns = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (_: any, record: Encargo, index: number) => (
        <Space size={4}>
          <span>{index + 1}</span>
          <Tooltip title={`Creado: ${new Date(record.fecha_creacion).toLocaleString('es-GT')}`}>
            {/* Info neutral en color secundario; el rojo se reserva para peligro/error */}
            <InfoCircleOutlined style={{ color: token.colorTextSecondary, fontSize: 12, cursor: 'pointer' }} />
          </Tooltip>
          {record.razon_extra && (
            <Tooltip title={`Comentario: ${record.razon_extra}`}>
              <FlagFilled style={{ color: token.colorWarning, fontSize: 12, cursor: 'pointer' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    // Columnas de texto largo: ancho fijo + ellipsis (tooltip nativo con el texto
    // completo). Sin width, AntD reparte el espacio a partes iguales y parte
    // palabras a la mitad; el detalle completo vive en la fila expandida.
    {
      title: 'Solicitante',
      key: 'solicitante',
      width: 150,
      ellipsis: true,
      render: (_: any, record: Encargo) =>
        record.solicitante ? `${record.solicitante.first_name} ${record.solicitante.last_name}` : '-'
    },
    { title: 'Destinatario', dataIndex: 'destinatario', key: 'destinatario', width: 140, ellipsis: true },
    { title: 'Empresa', dataIndex: 'empresa', key: 'empresa', width: 140, ellipsis: true },
    { title: 'Dirección', dataIndex: 'direccion', key: 'direccion', width: 260, ellipsis: true },
    {
      title: 'Zona',
      dataIndex: 'zona',
      key: 'zona',
      width: 70,
      sorter: (a: Encargo, b: Encargo) => (a.zona || 0) - (b.zona || 0),
    },
    {
      title: 'Tipo',
      dataIndex: 'mensajeria_enviada',
      key: 'mensajeria_enviada',
      width: 140,
      ellipsis: true,
      render: (v: string) => v || '—',
    },
    {
      title: 'Mensajero',
      key: 'mensajero',
      width: 180,
      ellipsis: true,
      render: (_: any, record: Encargo) => {
        if (record.mensajero) {
          return `${record.mensajero.first_name} ${record.mensajero.last_name}`;
        }
        // Los mensajeros no asignan; admins/coordinadores asignan aquí mismo
        if (isMensajero) return 'Sin asignar';
        return (
          <Select
            placeholder="Asignar…"
            size="small"
            style={{ minWidth: 160 }}
            showSearch
            optionFilterProp="children"
            onChange={(value: number) => handleAssignMensajero(record.id, value)}
          >
            {mensajeros.map((m) => (
              <Select.Option key={m.id} value={m.id}>
                {m.first_name} {m.last_name}
              </Select.Option>
            ))}
          </Select>
        );
      }
    },
    {
      title: 'Prioridad',
      dataIndex: 'prioridad',
      key: 'prioridad',
      width: 100,
      sorter: (a: Encargo, b: Encargo) => a.prioridad - b.prioridad,
      render: (p: number) => PRIORIDADES[p] || p,
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha_realizacion',
      key: 'fecha',
      width: 120,
      sorter: (a: Encargo, b: Encargo) =>
        (a.fecha_realizacion || '').localeCompare(b.fecha_realizacion || ''),
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
      width: 120,
      render: (estado: number) => {
        const config = ESTADOS[estado];
        return config ? <Tag color={config.color}>{config.label}</Tag> : estado;
      },
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 190,
      render: (_: any, record: Encargo) => (
        <Space size="small" wrap>
          {/* Iniciar - Solo si está en estado Pendiente (1) y tiene mensajero asignado */}
          {record.estado === 1 && record.mensajero && (
            <Tooltip title="Iniciar entrega">
              <Button
                size="small"
                type="primary"
                aria-label="Iniciar entrega"
                icon={<RocketOutlined />}
                onClick={() => handleStartDelivery(record.id)}
              />
            </Tooltip>
          )}

          {/* Entregar - En proceso (2): el mensajero cierra su entrega */}
          {record.estado === 2 && record.mensajero && (
            <Tooltip title="Marcar como entregado">
              <Button
                size="small"
                type="primary"
                aria-label="Marcar como entregado"
                icon={<CheckCircleOutlined />}
                onClick={() => handleDeliver(record.id)}
              />
            </Tooltip>
          )}

          {!isMensajero && (
            <>
              <Tooltip title="Editar">
                <Button
                  size="small"
                  aria-label="Editar"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/dashboard/mensajeria/editar/${record.id}`)}
                />
              </Tooltip>
              <Tooltip title="Eliminar">
                <Button size="small" danger aria-label="Eliminar" icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
              </Tooltip>
            </>
          )}

          <Tooltip title="Rechazar">
            <Button
              size="small"
              type="primary"
              danger
              aria-label="Rechazar"
              icon={<CloseCircleOutlined />}
              onClick={() => handleReject(record.id)}
            />
          </Tooltip>
          <Tooltip title="Reportar incidencia">
            <Button size="small" type="dashed" aria-label="Reportar incidencia" icon={<WarningOutlined />} onClick={() => handleIncidence(record.id)} />
          </Tooltip>
          <Tooltip title="Comentarios">
            <Button
              size="small"
              aria-label="Comentarios"
              icon={<CommentOutlined />}
              onClick={() => setCommentModalOpen({ open: true, encargoId: record.id })}
            />
          </Tooltip>
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
      {!isMensajero && !record.mensajero && (
        <Select
          placeholder="Asignar mensajero…"
          size="large"
          style={{ width: '100%' }}
          showSearch
          optionFilterProp="children"
          onChange={(value: number) => handleAssignMensajero(record.id, value)}
        >
          {mensajeros.map((m) => (
            <Select.Option key={m.id} value={m.id}>
              {m.first_name} {m.last_name}
            </Select.Option>
          ))}
        </Select>
      )}
      {record.estado === 1 && record.mensajero && (
        <Button size="large" type="primary" icon={<RocketOutlined />} onClick={() => handleStartDelivery(record.id)}>
          Iniciar
        </Button>
      )}
      {record.estado === 2 && record.mensajero && (
        <Button size="large" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleDeliver(record.id)}>
          Entregar
        </Button>
      )}
      {!isMensajero && (
        <>
          <Button size="large" icon={<EditOutlined />} onClick={() => navigate(`/dashboard/mensajeria/editar/${record.id}`)}>
            Editar
          </Button>
          <Button size="large" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
            Eliminar
          </Button>
        </>
      )}
      <Button size="large" danger icon={<CloseCircleOutlined />} onClick={() => handleReject(record.id)}>
        Rechazar
      </Button>
      <Button size="large" icon={<WarningOutlined />} onClick={() => handleIncidence(record.id)}>
        Incidencia
      </Button>
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
    <div style={{ padding: '16px 0' }}>
      {/* Compacta las celdas (menos alto) pero con letra mas grande y legible */}
      <style>{`
        .mensajeria-compact-table .ant-table-tbody > tr > td,
        .mensajeria-compact-table .ant-table-thead > tr > th {
          font-size: 14px;
          padding-top: 6px;
          padding-bottom: 6px;
          line-height: 1.35;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Envíos Pendientes</h2>
        <Space>
          {!isMensajero && (
            <Button type="primary" onClick={() => navigate('/dashboard/mensajeria/crear')}>
              Crear Envío
            </Button>
          )}
          <Button
            type="default"
            onClick={handleExportExcel}
            disabled={!filteredEncargos.length}
            loading={exporting}
          >
            Exportar Excel
          </Button>
        </Space>
      </div>

      {/* Filtrar encargos: búsqueda + rango de fechas + (para admin) mensajero */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="Buscar por solicitante, destinatario, empresa o dirección…"
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 340 }}
        />
        <DatePicker.RangePicker
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
            style={{ minWidth: 240 }}
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
        {(searchText || dateRange[0] || dateRange[1] || filterMensajero) && (
          <Button
            onClick={() => {
              setSearchText('');
              setDateRange([null, null]);
              setFilterMensajero(null);
            }}
          >
            Limpiar
          </Button>
        )}
        <span style={{ color: token.colorTextSecondary }}>
          {filteredEncargos.length} envío{filteredEncargos.length === 1 ? '' : 's'}
        </span>
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
          scroll={{ x: 1850 }}
          bordered
          expandable={{
            expandedRowRender: (record: Encargo) => <EncargoExpandedRow encargo={record} />,
            rowExpandable: hasDetalles,
          }}
          onRow={(record: Encargo) => ({
            // Tinte con token del tema: visible también en modo oscuro. El detalle
            // completo se lee expandiendo la fila (funciona en móvil, sin hover).
            style: record.observaciones ? { backgroundColor: token.colorPrimaryBg } : {},
          })}
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

      {/* Modal para seleccionar mensajero al exportar (solo admin) */}
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

      {/* Modal de rechazo / incidencia */}
      {actionModal.open && (
        <Modal
          title={
            actionModal.type === 'reject'
              ? 'Razón del rechazo'
              : 'Reportar incidencia'
          }
          open={true}
          onCancel={() =>
            setActionModal({ open: false, type: null, encargoId: null, reason: '' })
          }
          onOk={handleActionOk}
          okText="Confirmar"
          cancelText="Cancelar"
        >
          <TextArea
            value={actionModal.reason}
            onChange={(e) =>
              setActionModal({ ...actionModal, reason: e.target.value })
            }
            placeholder={
              actionModal.type === 'reject'
                ? 'Ingrese la razón del rechazo...'
                : 'Describa la incidencia...'
            }
            rows={4}
          />
        </Modal>
      )}
    </div>
  );
};

export default PendingEncargosPage;