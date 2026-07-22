// src/pages/mensajeria/AllEncargosPage.tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, message, Modal, DatePicker, Select, Input, Tooltip, theme, Empty, Grid, ConfigProvider } from 'antd';
import {
  InfoCircleOutlined,
  FlagFilled,
  RocketOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FlagOutlined,
  RollbackOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { downloadEncargosExcel, getAllEncargos, sendComplaint, getMensajeros, updateEncargo } from '../../api/encargos';
import type { Encargo, Usuario } from '../../types/encargo';
import EncargoExpandedRow from './components/EncargoExpandedRow';
import EncargoCardList from './components/EncargoCardList';
import { ESTADOS, PRIORIDADES, formatFecha, formatHorario, hasDetalles, saveExcelResponse } from './constants';
import { confirmarEntrega } from './deliver';
import useAuthStore from '../../auth/useAuthStore'; // ✅ Importar para obtener userId y tipo_usuario
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

// Rango por defecto: últimos 30 días. Sin esto la pantalla pide los ~29 mil
// encargos históricos completos y tarda varios segundos en cargar.
const DEFAULT_START = () => dayjs().subtract(30, 'day').format('YYYY-MM-DD');
const DEFAULT_END = () => dayjs().format('YYYY-MM-DD');

const AllEncargosPage: React.FC = () => {
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    startDate: DEFAULT_START() as string | null,
    endDate: DEFAULT_END() as string | null,
    estado: null as number | null,
    search: null as string | null,
  });
  const [complaintModal, setComplaintModal] = useState<{ open: boolean; encargoId: number | null }>({
    open: false,
    encargoId: null,
  });
  const [complaintText, setComplaintText] = useState('');
  const [complaintPassword, setComplaintPassword] = useState('');
  
  // ✅ NUEVO: Modal para seleccionar mensajero antes de exportar Excel
  const [exportModal, setExportModal] = useState(false);
  const [selectedMensajero, setSelectedMensajero] = useState<number | null>(null);
  const [mensajeros, setMensajeros] = useState<Usuario[]>([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  
  const navigate = useNavigate();
  const { token } = theme.useToken(); // ✅ Tokens del tema (claro/oscuro)

  // En viewports < md (mensajeros en ruta) la tabla se reemplaza por tarjetas
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  // ✅ Obtener usuario actual para filtrar si es mensajero
  const userId = useAuthStore((state) => state.userId);
  const tipoUsuario = useAuthStore((state) => state.tipo_usuario); // ✅ CORREGIDO: acceso directo
  const isMensajero = tipoUsuario === 8;

  // ✅ Cargar mensajeros al inicio
  useEffect(() => {
    const loadMensajeros = async () => {
      try {
        const res = await getMensajeros();
        // ✅ Ordenar alfabéticamente
        const sorted = res.data.sort((a, b) => 
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'es')
        );
        setMensajeros(sorted);
      } catch (error) {
        console.error('Error al cargar mensajeros:', error);
      }
    };
    loadMensajeros();
  }, []);

  // Una sola función de carga reutilizada por el efecto y por las acciones
  // (asignar, iniciar, entregar) — antes el armado de params estaba duplicado 3 veces.
  const loadEncargos = async () => {
    setLoading(true);
    try {
      const params: any = {
        start: filters.startDate || undefined,
        end: filters.endDate || undefined,
        search: filters.search || undefined,
        estados: filters.estado ? [filters.estado] : undefined,
      };

      // ✅ Si es mensajero, SIEMPRE filtrar por sus propios encargos
      if (isMensajero && userId) {
        params.mensajero = userId;
      }

      const res = await getAllEncargos(params);
      setEncargos(res.data);
      setLoadError(false);
    } catch {
      setLoadError(true);
      message.error('Error al cargar los envíos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEncargos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, isMensajero, userId]);

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDateChange = (dates: any) => {
    if (dates && dates.length === 2) {
      const start = dates[0]?.format('YYYY-MM-DD') || null;
      const end = dates[1]?.format('YYYY-MM-DD') || null;
      setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
    } else {
      setFilters(prev => ({ ...prev, startDate: null, endDate: null }));
    }
  };

  const handleResetFilters = () => {
    setFilters({ startDate: DEFAULT_START(), endDate: DEFAULT_END(), estado: null, search: null });
  };

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

  const handleStartDelivery = (id: number) => {
    Modal.confirm({
      title: '¿Iniciar entrega?',
      content: '¿Desea marcar este envío como "En proceso"?',
      okText: 'Sí, iniciar',
      okType: 'primary',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await updateEncargo(id, { estado: 2 } as any);
          message.success('Envío marcado como "En proceso"');
          await loadEncargos();
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Error al iniciar');
        }
      },
    });
  };

  // Flujo de entrega viejo compartido: fecha_entrega + 5→8 + razón de tardanza
  const handleDeliver = (record: Encargo) => confirmarEntrega(record, loadEncargos);

  // "Volver a pendiente" del Django viejo (icono share rojo en Entregados):
  // regresa un encargo finalizado a estado 1 y limpia incidencias/razones.
  const handleBackToPending = (id: number) => {
    Modal.confirm({
      title: '¿Volver a pendiente?',
      content: 'El envío regresará a la lista de pendientes.',
      okText: 'Sí, regresar',
      okType: 'primary',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await updateEncargo(id, { estado: 1, incidencias: null, razon_eliminacion: '' } as any);
          message.success('Envío regresado a pendientes');
          await loadEncargos();
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Error al regresar el envío');
        }
      },
    });
  };

  const handleComplaint = (id: number) => {
    setComplaintModal({ open: true, encargoId: id });
  };

  const handleComplaintSubmit = async () => {
    if (!complaintModal.encargoId || !complaintText.trim()) {
      message.warning('Debe ingresar un reclamo');
      return;
    }
    if (!complaintPassword.trim()) {
      message.warning('Debe ingresar su contraseña de correo');
      return;
    }
    try {
      await sendComplaint(complaintModal.encargoId, complaintText, complaintPassword);
      message.success('Reclamo enviado por email exitosamente');
      setComplaintModal({ open: false, encargoId: null });
      setComplaintText('');
      setComplaintPassword('');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Las credenciales ingresadas están incorrectas');
    }
  };

  // ❌ ELIMINADO: handleRegisterEmail ya no es necesario

  // ✅ Abrir modal para seleccionar mensajero
  const handleExportExcel = () => {
    setExportModal(true);
  };

  // ✅ NUEVO: Exportar con mensajero seleccionado
  const handleConfirmExport = async () => {
    if (!selectedMensajero) {
      message.warning('Por favor seleccione un mensajero');
      return;
    }

    setExporting(true);
    try {
      // ✅ Exportar con filtros + mensajero
      const response = await downloadEncargosExcel({
        mensajeroId: selectedMensajero,
        type: 2, // Todos los pendientes/en proceso
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      
      saveExcelResponse(response, 'Reporte-Mensajeria.xlsx');
      message.success('Reporte descargado exitosamente');
      
      // Cerrar modal y limpiar selección
      setExportModal(false);
      setSelectedMensajero(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al descargar reporte';
      message.error(msg);
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      title: '#',
      width: '4%',
      dataIndex: 'id',
      key: 'id',
      render: (_: any, record: Encargo, index: number) => (
        <Space size={4}>
          <span>{index + 1}</span>
          <Tooltip title={`Creado: ${new Date(record.fecha_creacion).toLocaleString('es-GT')}`}>
            {/* Rojo como el icono info del viejo */}
            <InfoCircleOutlined style={{ color: '#dc3545', fontSize: 13, cursor: 'pointer' }} />
          </Tooltip>
          {/* "Volver a pendiente" del viejo: icono share rojo, solo admin */}
          {!isMensajero && [3, 4, 6, 7, 8].includes(record.estado) && (
            <Tooltip title="Volver a pendiente">
              <RollbackOutlined
                style={{ color: '#dc3545', fontSize: 14, cursor: 'pointer' }}
                onClick={() => handleBackToPending(record.id)}
              />
            </Tooltip>
          )}
          {record.razon_extra && (
            <Tooltip title={`Comentario: ${record.razon_extra}`}>
              <FlagFilled style={{ color: '#dc3545', fontSize: 12, cursor: 'pointer' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    // Columnas de texto largo: ancho fijo y el texto envuelve a la siguiente
    // línea (pedido de los usuarios: ver la info completa, no cortada con "…").
    {
      title: 'Solicitante',
      width: '9%',
      key: 'solicitante',
      sorter: (a: Encargo, b: Encargo) =>
        `${a.solicitante?.first_name ?? ''} ${a.solicitante?.last_name ?? ''}`
          .localeCompare(`${b.solicitante?.first_name ?? ''} ${b.solicitante?.last_name ?? ''}`, 'es'),
      render: (_: any, record: Encargo) =>
        record.solicitante ? `${record.solicitante.first_name} ${record.solicitante.last_name}` : '-'
    },
    { title: 'Destinatario', dataIndex: 'destinatario', key: 'destinatario', width: '9%', sorter: (a: Encargo, b: Encargo) => (a.destinatario || '').localeCompare(b.destinatario || '', 'es') },
    { title: 'Empresa', dataIndex: 'empresa', key: 'empresa', width: '8%', sorter: (a: Encargo, b: Encargo) => (a.empresa || '').localeCompare(b.empresa || '', 'es') },
    { title: 'Dirección', dataIndex: 'direccion', key: 'direccion', width: '20%', sorter: (a: Encargo, b: Encargo) => (a.direccion || '').localeCompare(b.direccion || '', 'es') },
    {
      title: 'Zona',
      width: '4%',
      dataIndex: 'zona',
      key: 'zona',
      sorter: (a: Encargo, b: Encargo) => (a.zona || 0) - (b.zona || 0),
    },
    {
      title: 'Tipo',
      width: '7%',
      dataIndex: 'mensajeria_enviada',
      key: 'mensajeria_enviada',
      sorter: (a: Encargo, b: Encargo) =>
        (a.mensajeria_enviada || '').localeCompare(b.mensajeria_enviada || '', 'es'),
      render: (v: string) => v || '—',
    },
    {
      title: 'Mensajero',
      width: '10%',
      key: 'mensajero',
      sorter: (a: Encargo, b: Encargo) =>
        `${a.mensajero?.first_name ?? ''} ${a.mensajero?.last_name ?? ''}`
          .localeCompare(`${b.mensajero?.first_name ?? ''} ${b.mensajero?.last_name ?? ''}`, 'es'),
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
            style={{ width: '100%' }}
            showSearch
            optionFilterProp="children"
            onChange={(value: number) => handleAssignMensajero(record.id, value)}
          >
            {mensajeros.map((m) => (
              <Option key={m.id} value={m.id}>
                {m.first_name} {m.last_name}
              </Option>
            ))}
          </Select>
        );
      }
    },
    {
      title: 'Pr',
      width: '3%',
      dataIndex: 'prioridad',
      key: 'prioridad',
      sorter: (a: Encargo, b: Encargo) => a.prioridad - b.prioridad,
      render: (p: number) => PRIORIDADES[p] || p,
    },
    {
      title: 'Fecha',
      width: '7%',
      dataIndex: 'fecha_realizacion',
      key: 'fecha',
      sorter: (a: Encargo, b: Encargo) =>
        (a.fecha_realizacion || '').localeCompare(b.fecha_realizacion || ''),
      render: (date: string) => {
        const ymd = formatFecha(date);
        if (ymd === '—') return ymd;
        const [y, m, d] = ymd.split('-');
        return `${d}/${m}/${y}`;
      },
    },
    {
      title: 'Horario',
      width: '7%',
      key: 'horario',
      render: (_: any, record: Encargo) => formatHorario(record) || '—',
    },
    {
      title: 'Estado',
      width: '6%',
      dataIndex: 'estado',
      key: 'estado',
      sorter: (a: Encargo, b: Encargo) => a.estado - b.estado,
      // Texto coloreado como el viejo: Entregado verde, Extraordinario rojo,
      // "Entregado Extra" verde con "Extra" en rojo
      render: (estado: number) => {
        const config = ESTADOS[estado];
        if (!config) return estado;
        if (estado === 8) {
          return (
            <span style={{ color: '#28a745', fontWeight: 600 }}>
              Entregado <span style={{ color: '#dc3545' }}>Extra</span>
            </span>
          );
        }
        const color =
          estado === 3 ? '#28a745' : [4, 5, 7].includes(estado) ? '#dc3545' : undefined;
        return <span style={color ? { color, fontWeight: 600 } : undefined}>{config.label}</span>;
      },
    },
    {
      title: 'Opciones',
      width: '6%',
      key: 'acciones',
      render: (_: any, record: Encargo) => (
        <Space size="small" wrap>
          {/* Iniciar - Estado Pendiente (1): mensajero solo ve el suyo, admin ve todos */}
          {record.estado === 1 && (!isMensajero || record.mensajero?.id === userId) && (
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

          {/* Entregado - En proceso (2) y Extraordinario (5) */}
          {[2, 5].includes(record.estado) && (!isMensajero || record.mensajero?.id === userId) && (
            <Tooltip title="Entregado">
              <Button
                size="small"
                type="primary"
                style={{ background: '#28a745', borderColor: '#28a745' }}
                aria-label="Entregado"
                icon={<CheckCircleOutlined />}
                onClick={() => handleDeliver(record)}
              />
            </Tooltip>
          )}


          <Tooltip title="Editar">
            <Button
              size="small"
              aria-label="Editar"
              icon={<EditOutlined />}
              onClick={() => navigate(`/dashboard/mensajeria/editar/${record.id}`)}
            />
          </Tooltip>
          {/* Botones de admin */}
          {!isMensajero && record.estado !== 3 && (
            <Tooltip title="Enviar reclamo">
              <Button size="small" type="dashed" aria-label="Enviar reclamo" icon={<FlagOutlined />} onClick={() => handleComplaint(record.id)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const emptyContent = loadError ? (
    <Empty description="No se pudieron cargar los envíos">
      <Button type="primary" onClick={loadEncargos}>
        Reintentar
      </Button>
    </Empty>
  ) : (
    <Empty description="No hay envíos en el rango de fechas seleccionado. Amplíe el rango o ajuste los filtros." />
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
            <Option key={m.id} value={m.id}>
              {m.first_name} {m.last_name}
            </Option>
          ))}
        </Select>
      )}
      {record.estado === 1 && (!isMensajero || record.mensajero?.id === userId) && (
        <Button size="large" type="primary" icon={<RocketOutlined />} onClick={() => handleStartDelivery(record.id)}>
          Iniciar
        </Button>
      )}
      {[2, 5].includes(record.estado) && (!isMensajero || record.mensajero?.id === userId) && (
        <Button
          size="large"
          type="primary"
          style={{ background: '#28a745', borderColor: '#28a745' }}
          icon={<CheckCircleOutlined />}
          onClick={() => handleDeliver(record)}
        >
          Entregado
        </Button>
      )}
      {!isMensajero && [3, 4, 6, 7, 8].includes(record.estado) && (
        <Button size="large" danger icon={<RollbackOutlined />} onClick={() => handleBackToPending(record.id)}>
          Volver a pendiente
        </Button>
      )}
      <Button size="large" icon={<EditOutlined />} onClick={() => navigate(`/dashboard/mensajeria/editar/${record.id}`)}>
        Editar
      </Button>
      {!isMensajero && record.estado !== 3 && (
        <Button size="large" icon={<FlagOutlined />} onClick={() => handleComplaint(record.id)}>
          Reclamo
        </Button>
      )}
    </>
  );

  return (
    // Letra más grande solo en esta pantalla (pedido de los usuarios): sube la
    // tipografía base de AntD para tabla, filtros, tags y modales.
    <ConfigProvider theme={{ token: { fontSize: 15 } }}>
    <div style={{ padding: '16px 0' }}>
      <style>{`
        .entregados-table .ant-table-thead > tr > th {
          text-align: center;
          font-weight: 700;
        }
        .entregados-table .ant-table-tbody > tr > td {
          word-break: break-word;
          padding: 6px 6px;
        }
        @media (max-width: 1600px) {
          .entregados-table .ant-table-tbody > tr > td,
          .entregados-table .ant-table-thead > tr > th {
            font-size: 13px;
            padding-left: 4px;
            padding-right: 4px;
          }
        }
      `}</style>
      {/* Título centrado y botonera de colores, como el viejo */}
      <h2 style={{ textAlign: 'center', marginTop: 0 }}>Envios entregados</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          {!isMensajero && (
            <Button style={{ background: '#28a745', borderColor: '#28a745', color: '#fff' }} onClick={() => navigate('/dashboard/mensajeria/crear')}>
              Crear Envio
            </Button>
          )}
          <Button style={{ background: '#ffc107', borderColor: '#ffc107', color: '#212529' }} onClick={handleExportExcel} loading={exporting}>
            Crear Reporte
          </Button>
          <Button style={{ background: '#6c757d', borderColor: '#6c757d', color: '#fff' }} onClick={() => navigate('/dashboard/mensajeria')}>
            Ver pendientes
          </Button>
        </Space>
        <Space>
          <Button style={{ background: '#0d6efd', borderColor: '#0d6efd', color: '#fff' }} onClick={() => setFilterModalOpen(true)}>
            Filtrar encargos
          </Button>
          <Tooltip title="Quitar filtros">
            <Button
              style={{ background: '#dc3545', borderColor: '#dc3545', color: '#fff' }}
              icon={<ReloadOutlined />}
              onClick={handleResetFilters}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Modal "Filtrar encargos" del viejo */}
      <Modal
        title="Filtrar encargos"
        open={filterModalOpen}
        onCancel={() => setFilterModalOpen(false)}
        onOk={() => setFilterModalOpen(false)}
        okText="Aplicar"
        cancelText="Cerrar"
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <RangePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            value={[
              filters.startDate ? dayjs(filters.startDate) : null,
              filters.endDate ? dayjs(filters.endDate) : null,
            ]}
            onChange={handleDateChange}
          />
          <Select
            placeholder="Filtrar por estado"
            allowClear
            value={filters.estado || undefined}
            onChange={(value) => handleFilterChange('estado', value)}
            style={{ width: '100%' }}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              String(option?.children || '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {Object.entries(ESTADOS).map(([key, value]) => (
              <Option key={key} value={parseInt(key)}>{value.label}</Option>
            ))}
          </Select>
          <Input.Search
            placeholder="Buscar por solicitante, empresa..."
            allowClear
            onSearch={(value) => handleFilterChange('search', value || null)}
            onChange={(e) => { if (!e.target.value) handleFilterChange('search', null); }}
          />
        </Space>
      </Modal>

      {isMobile ? (
        <EncargoCardList
          encargos={encargos}
          loading={loading}
          emptyText={emptyContent}
          showMensajero={!isMensajero}
          renderActions={renderCardActions}
        />
      ) : (
        <Table
          className="entregados-table"
          tableLayout="fixed"
          dataSource={encargos}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
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

      {/* Modal de reclamo */}
      <Modal
        title="Enviar Reclamo"
        open={complaintModal.open}
        onCancel={() => {
          setComplaintModal({ open: false, encargoId: null });
          setComplaintText('');
          setComplaintPassword('');
        }}
        onOk={handleComplaintSubmit}
        okText="Enviar Reclamo"
        cancelText="Cancelar"
      >
        <p style={{ marginBottom: 12, color: token.colorTextSecondary }}>
          El reclamo será enviado desde su correo personal al coordinador de mensajería.
        </p>
        <TextArea
          value={complaintText}
          onChange={(e) => setComplaintText(e.target.value)}
          placeholder="Ingrese el motivo de su reclamo..."
          rows={4}
          maxLength={250}
          showCount
          style={{ marginBottom: 12 }}
        />
        <Input.Password
          value={complaintPassword}
          onChange={(e) => setComplaintPassword(e.target.value)}
          placeholder="Ingrese su contraseña de correo"
        />
      </Modal>

      {/* ✅ NUEVO: Modal para seleccionar mensajero antes de exportar */}
      <Modal
        title="Seleccione el mensajero"
        confirmLoading={exporting}
        open={exportModal}
        onCancel={() => {
          setExportModal(false);
          setSelectedMensajero(null);
        }}
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
          {mensajeros.map(m => (
            <Option key={m.id} value={m.id}>
              {m.first_name} {m.last_name}
            </Option>
          ))}
        </Select>
      </Modal>
    </div>
    </ConfigProvider>
  );
};

export default AllEncargosPage;