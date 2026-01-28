// src/pages/procuration/ProcurationList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Space,
  Card,
  Row,
  Col,
  Tag,
  message,
  Tooltip,
  Statistic,
  Select,
  DatePicker,
  Modal,
  Popconfirm,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  FilterOutlined,
  CommentOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  getProcurations,
  getAdvancedFilter,
  getStatistics,
  updateProcuration,
  getClients,
  getEntities,
  getRecurrences,
} from '../../api/procuration';
import type {
  Procuration,
  ProcurationFilters,
  StatisticsResponse,
  Client,
  Entity,
  Recurrence,
} from '../../types/procuration.types';
import {
  STATE_LABELS,
  STATE_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  ProcurationState,
} from '../../types/procuration.types';
import useAuthStore from '../../auth/useAuthStore';
import EditProcurationModal from './EditProcurationModal';

const { RangePicker } = DatePicker;

const ProcurationList: React.FC = () => {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.userId);
  const tipoUsuario = useAuthStore((s) => s.tipo_usuario);

  // Data states
  const [procurations, setProcurations] = useState<Procuration[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Statistics
  const [statistics, setStatistics] = useState<StatisticsResponse>({
    pendings: 0,
    rejected: 0,
    finalized: 0,
    suspend: 0,
  });

  // Master data for filters
  const [clients, setClients] = useState<Client[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);

  // Filters
  const [filters, setFilters] = useState<ProcurationFilters>({});
  const [stateFilter, setStateFilter] = useState<number | undefined>();
  const [recurrenceFilter, setRecurrenceFilter] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [clientFilter, setClientFilter] = useState<number | undefined>();
  const [entityFilter, setEntityFilter] = useState<number | undefined>();

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedProcuration, setSelectedProcuration] = useState<Procuration | null>(null);
  const [advancedFilterVisible, setAdvancedFilterVisible] = useState(false);

  // Check if user is procurator
  const isProcurator = tipoUsuario === 5;

  // Load master data
  const loadMasterData = useCallback(async () => {
    try {
      const [clientsRes, entitiesRes, recurrencesRes] = await Promise.all([
        getClients().catch(() => ({ data: [] })),
        getEntities().catch(() => ({ data: [] })),
        getRecurrences().catch(() => ({ data: [] })),
      ]);
      // Handle both { data: [...] } and direct array responses
      setClients(Array.isArray(clientsRes) ? clientsRes : (clientsRes.data || []));
      setEntities(Array.isArray(entitiesRes) ? entitiesRes : (entitiesRes.data || []));
      setRecurrences(Array.isArray(recurrencesRes) ? recurrencesRes : (recurrencesRes.data || []));
    } catch (error: any) {
      console.error('Error loading master data:', error);
    }
  }, []);

  // Fetch procurations
  const fetchProcurations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getProcurations({
        ...filters,
        page: currentPage,
        limit: pageSize,
      });
      // Handle both { data: [...] } and direct array responses
      const data = Array.isArray(response) ? response : (response?.data || []);
      setProcurations(data);
      setTotal(response?.total || data.length);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al cargar procuraciones');
      setProcurations([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters]);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const stats = await getStatistics();
      setStatistics(stats || { pendings: 0, rejected: 0, finalized: 0, suspend: 0 });
    } catch (error: any) {
      console.error('Error loading statistics:', error);
      setStatistics({ pendings: 0, rejected: 0, finalized: 0, suspend: 0 });
    }
  }, []);

  useEffect(() => {
    loadMasterData();
    fetchStatistics();
  }, [loadMasterData, fetchStatistics]);

  useEffect(() => {
    fetchProcurations();
  }, [fetchProcurations]);

  // Handle search
  const handleSearch = () => {
    const newFilters: ProcurationFilters = {};

    if (stateFilter) newFilters.state = stateFilter;
    if (recurrenceFilter) newFilters.recurrence = recurrenceFilter;
    if (dateRange[0]) newFilters.init_date = dateRange[0].format('YYYY-MM-DD');
    if (dateRange[1]) newFilters.end_date = dateRange[1].format('YYYY-MM-DD');
    if (clientFilter) newFilters.client = clientFilter;
    if (entityFilter) newFilters.entity = entityFilter;

    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setStateFilter(undefined);
    setRecurrenceFilter(undefined);
    setDateRange([null, null]);
    setClientFilter(undefined);
    setEntityFilter(undefined);
    setFilters({});
    setCurrentPage(1);
  };

  // Handle edit
  const handleEdit = (procuration: Procuration) => {
    setSelectedProcuration(procuration);
    setEditModalVisible(true);
  };

  // Handle state transitions
  const handleAccept = async (id: number) => {
    try {
      await updateProcuration(id, { state: ProcurationState.EN_PROCESO });
      message.success('Procuración aceptada');
      fetchProcurations();
      fetchStatistics();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al aceptar');
    }
  };

  const handleFinalize = async (id: number) => {
    try {
      await updateProcuration(id, {
        state: ProcurationState.FINALIZADO,
        finalized: new Date().toISOString(),
        user_finalized: userId || undefined,
      });
      message.success('Procuración finalizada');
      fetchProcurations();
      fetchStatistics();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al finalizar');
    }
  };

  const handleSuspend = async (id: number) => {
    try {
      await updateProcuration(id, { state: ProcurationState.EN_SUSPENSO });
      message.success('Procuración suspendida');
      fetchProcurations();
      fetchStatistics();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al suspender');
    }
  };

  const handleResume = async (id: number) => {
    try {
      await updateProcuration(id, { state: ProcurationState.EN_PROCESO });
      message.success('Procuración reanudada');
      fetchProcurations();
      fetchStatistics();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al reanudar');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await updateProcuration(id, { state: ProcurationState.RECHAZADO });
      message.success('Procuración rechazada');
      fetchProcurations();
      fetchStatistics();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al rechazar');
    }
  };

  // Quick filter by state
  const handleQuickFilter = (state: number | undefined) => {
    setStateFilter(state);
    if (state) {
      setFilters({ state });
    } else {
      setFilters({});
    }
    setCurrentPage(1);
  };

  // Render action buttons based on state and user role
  const renderActions = (record: Procuration) => {
    const actions = [];

    // View details - always available
    actions.push(
      <Tooltip title="Ver detalles" key="view">
        <Button
          type="default"
          icon={<EyeOutlined />}
          size="small"
          onClick={() => navigate(`/dashboard/procuration/${record.id}`)}
        />
      </Tooltip>
    );

    // Comments
    actions.push(
      <Tooltip title="Comentarios" key="comments">
        <Button
          type="default"
          icon={<CommentOutlined />}
          size="small"
          onClick={() => navigate(`/dashboard/procuration/${record.id}`)}
        />
      </Tooltip>
    );

    // Procurator actions
    if (isProcurator && record.procurator?.id === userId) {
      // Accept (state = Solicitado)
      if (record.state === ProcurationState.SOLICITADO) {
        actions.push(
          <Tooltip title="Aceptar" key="accept">
            <Popconfirm
              title="¿Marcar como recibido?"
              onConfirm={() => handleAccept(record.id)}
              okText="Sí"
              cancelText="No"
            >
              <Button type="primary" icon={<CheckOutlined />} size="small" />
            </Popconfirm>
          </Tooltip>
        );
      }

      // Finalize, Suspend, Reject (state = En Proceso)
      if (record.state === ProcurationState.EN_PROCESO) {
        actions.push(
          <Tooltip title="Finalizar" key="finalize">
            <Popconfirm
              title="¿Finalizar procuración?"
              onConfirm={() => handleFinalize(record.id)}
              okText="Sí"
              cancelText="No"
            >
              <Button
                type="primary"
                style={{ backgroundColor: '#52c41a' }}
                icon={<CheckOutlined />}
                size="small"
              />
            </Popconfirm>
          </Tooltip>
        );

        actions.push(
          <Tooltip title="Suspender" key="suspend">
            <Popconfirm
              title="¿Suspender procuración?"
              onConfirm={() => handleSuspend(record.id)}
              okText="Sí"
              cancelText="No"
            >
              <Button type="default" icon={<PauseOutlined />} size="small" />
            </Popconfirm>
          </Tooltip>
        );

        actions.push(
          <Tooltip title="Rechazar" key="reject">
            <Popconfirm
              title="¿Rechazar procuración?"
              onConfirm={() => handleReject(record.id)}
              okText="Sí"
              cancelText="No"
            >
              <Button type="primary" danger icon={<CloseOutlined />} size="small" />
            </Popconfirm>
          </Tooltip>
        );
      }

      // Resume (state = En Suspenso)
      if (record.state === ProcurationState.EN_SUSPENSO) {
        actions.push(
          <Tooltip title="Reanudar" key="resume">
            <Popconfirm
              title="¿Reanudar procuración?"
              onConfirm={() => handleResume(record.id)}
              okText="Sí"
              cancelText="No"
            >
              <Button type="primary" icon={<PlayCircleOutlined />} size="small" />
            </Popconfirm>
          </Tooltip>
        );
      }
    }

    // Edit (only for applicant and state = Solicitado)
    if (!isProcurator && record.applicant?.id === userId && record.state === ProcurationState.SOLICITADO) {
      actions.push(
        <Tooltip title="Editar" key="edit">
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          />
        </Tooltip>
      );
    }

    return <Space size="small">{actions}</Space>;
  };

  const columns: ColumnsType<Procuration> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      fixed: 'left',
    },
    {
      title: 'Estado',
      dataIndex: 'state',
      key: 'state',
      width: 130,
      render: (state: number, record) => (
        <Badge
          status={
            record.priority === 1 && state === ProcurationState.SOLICITADO
              ? 'error'
              : undefined
          }
        >
          <Tag color={STATE_COLORS[state]}>{STATE_LABELS[state]}</Tag>
        </Badge>
      ),
    },
    {
      title: 'Prioridad',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: number) => (
        <Tag color={PRIORITY_COLORS[priority]}>{PRIORITY_LABELS[priority]}</Tag>
      ),
    },
    {
      title: 'Cliente',
      dataIndex: ['client', 'name'],
      key: 'client',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Entidad',
      dataIndex: ['entity', 'name'],
      key: 'entity',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Descripcion',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Solicitante',
      dataIndex: ['applicant', 'username'],
      key: 'applicant',
      width: 120,
    },
    {
      title: 'Procurador',
      dataIndex: ['procurator', 'username'],
      key: 'procurator',
      width: 120,
      render: (username: string) => username || '-',
    },
    {
      title: 'Fecha',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Fecha Limite',
      dataIndex: 'limit_date',
      key: 'limit_date',
      width: 130,
      render: (date: string, record) => {
        if (!date) return '-';
        const limitDate = dayjs(date);
        const daysUntil = limitDate.diff(dayjs(), 'days');
        let color = 'green';
        if (daysUntil < 0) color = 'red';
        else if (daysUntil <= 3) color = 'orange';

        return (
          <Tooltip title={record.limit_hour ? `Hora: ${record.limit_hour}` : ''}>
            <Tag color={color}>
              {limitDate.format('DD/MM/YYYY')}
              {daysUntil < 0 && <span> (Vencido)</span>}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Recurrencia',
      dataIndex: ['recurrence', 'lapse'],
      key: 'recurrence',
      width: 110,
      render: (lapse: string) => lapse || '-',
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => renderActions(record),
    },
  ];

  return (
    <div>
      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card
            hoverable
            onClick={() => handleQuickFilter(undefined)}
            style={{ cursor: 'pointer', borderColor: !stateFilter ? '#1890ff' : undefined }}
          >
            <Statistic
              title="Pendientes"
              value={statistics.pendings}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            hoverable
            onClick={() => handleQuickFilter(ProcurationState.FINALIZADO)}
            style={{ cursor: 'pointer', borderColor: stateFilter === ProcurationState.FINALIZADO ? '#52c41a' : undefined }}
          >
            <Statistic
              title="Finalizados"
              value={statistics.finalized}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            hoverable
            onClick={() => handleQuickFilter(ProcurationState.RECHAZADO)}
            style={{ cursor: 'pointer', borderColor: stateFilter === ProcurationState.RECHAZADO ? '#ff4d4f' : undefined }}
          >
            <Statistic
              title="Rechazados"
              value={statistics.rejected}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            hoverable
            onClick={() => handleQuickFilter(ProcurationState.EN_SUSPENSO)}
            style={{ cursor: 'pointer', borderColor: stateFilter === ProcurationState.EN_SUSPENSO ? '#faad14' : undefined }}
          >
            <Statistic
              title="Suspendidos"
              value={statistics.suspend}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card title="Control de Procuraciones" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Estado"
                allowClear
                style={{ width: '100%' }}
                value={stateFilter}
                onChange={setStateFilter}
                options={[
                  { value: 1, label: 'Solicitado' },
                  { value: 2, label: 'En Proceso' },
                  { value: 3, label: 'Rechazado' },
                  { value: 4, label: 'Finalizado' },
                  { value: 5, label: 'En Suspenso' },
                  { value: 6, label: 'Fuera de Tiempo' },
                ]}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Recurrencia"
                allowClear
                style={{ width: '100%' }}
                value={recurrenceFilter}
                onChange={setRecurrenceFilter}
                options={recurrences.map((r) => ({ value: r.id, label: r.lapse }))}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Cliente"
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: '100%' }}
                value={clientFilter}
                onChange={setClientFilter}
                options={clients.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Entidad"
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: '100%' }}
                value={entityFilter}
                onChange={setEntityFilter}
                options={entities.map((e) => ({ value: e.id, label: e.name }))}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
                format="DD/MM/YYYY"
                placeholder={['Fecha inicio', 'Fecha fin']}
              />
            </Col>
          </Row>

          <Space wrap>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              Buscar
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleClearFilters}>
              Limpiar filtros
            </Button>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setAdvancedFilterVisible(true)}
            >
              Filtro avanzado
            </Button>
            {!isProcurator && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/dashboard/procuration/create')}
              >
                Crear procuracion
              </Button>
            )}
          </Space>
        </Space>
      </Card>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={procurations}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1800 }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showTotal: (total) => `Total: ${total} procuraciones`,
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size || 15);
          },
        }}
      />

      {/* Edit Modal */}
      <EditProcurationModal
        visible={editModalVisible}
        procuration={selectedProcuration}
        clients={clients}
        entities={entities}
        recurrences={recurrences}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedProcuration(null);
        }}
        onSuccess={() => {
          setEditModalVisible(false);
          setSelectedProcuration(null);
          fetchProcurations();
        }}
      />

      {/* Advanced Filter Modal */}
      <Modal
        title="Filtro Avanzado"
        open={advancedFilterVisible}
        onCancel={() => setAdvancedFilterVisible(false)}
        footer={null}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <label>Estados:</label>
              <Select
                mode="multiple"
                placeholder="Seleccionar estados"
                style={{ width: '100%' }}
                options={[
                  { value: 1, label: 'Solicitado' },
                  { value: 2, label: 'En Proceso' },
                  { value: 3, label: 'Rechazado' },
                  { value: 4, label: 'Finalizado' },
                  { value: 5, label: 'En Suspenso' },
                  { value: 6, label: 'Fuera de Tiempo' },
                ]}
              />
            </Col>
            <Col span={12}>
              <label>Cliente:</label>
              <Select
                placeholder="Seleccionar cliente"
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: '100%' }}
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Col>
            <Col span={12}>
              <label>Entidad:</label>
              <Select
                placeholder="Seleccionar entidad"
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: '100%' }}
                options={entities.map((e) => ({ value: e.id, label: e.name }))}
              />
            </Col>
            <Col span={12}>
              <label>Rango de fechas:</label>
              <RangePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                placeholder={['Inicio', 'Fin']}
              />
            </Col>
          </Row>
          <Space>
            <Button type="primary" onClick={() => setAdvancedFilterVisible(false)}>
              Aplicar
            </Button>
            <Button onClick={() => setAdvancedFilterVisible(false)}>Cancelar</Button>
          </Space>
        </Space>
      </Modal>
    </div>
  );
};

export default ProcurationList;
