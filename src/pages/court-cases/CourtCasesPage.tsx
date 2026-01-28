import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  message,
  Checkbox,
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  CommentOutlined,
  CheckOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../auth/useAuthStore';
import { fetchClients } from '../../api/clients';
import { fetchUsers } from '../../api/users';
import {
  type CaseTypeKey,
  type CourtCaseType,
  type CourtCaseState,
  type Dependency,
  type LaborCase,
  type LitigationCase,
  type PenalCase,
  type TributaryCase,
  type AdministrativeTaxCase,
  type Action,
  type StatusUpdate,
  fetchCaseStates,
  fetchCaseTypes,
  fetchDependencies,
  fetchLaborCases,
  fetchLitigationCases,
  fetchPenalCases,
  fetchTributaryCases,
  fetchAdministrativeTaxCases,
  updateLaborCase,
  updateLitigationCase,
  updatePenalCase,
  updateTributaryCase,
  updateAdministrativeTaxCase,
  fetchActions,
  createAction,
  fetchStatusUpdates,
  createStatusUpdate,
} from '../../api/courtCases';
import CourtCaseForm from './CourtCaseForm';
import type { Client } from '../../api/clients';
import type { UserLite } from '../../api/users';
import { normalizeCasePayload, parseAdjustments } from './utils';

type CourtCase =
  | LaborCase
  | LitigationCase
  | PenalCase
  | TributaryCase
  | AdministrativeTaxCase;

const typeKeyFromModel: Record<string, CaseTypeKey> = {
  labor: 'labor',
  litigation: 'litigation',
  penal: 'penal',
  tributary: 'tributary',
  administrativetax: 'administrative-tax',
};

const defaultLabels: Record<CaseTypeKey, string> = {
  labor: 'Laboral',
  litigation: 'Litigio',
  penal: 'Penal',
  tributary: 'Tributario',
  'administrative-tax': 'Administrativo-Tributario',
};

const CourtCasesPage: React.FC = () => {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.userId);
  const [activeType, setActiveType] = useState<CaseTypeKey>('litigation');
  const [caseTypes, setCaseTypes] = useState<CourtCaseType[]>([]);
  const [states, setStates] = useState<CourtCaseState[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [lawyers, setLawyers] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [casesByType, setCasesByType] = useState<Record<CaseTypeKey, CourtCase[]>>({
    labor: [],
    litigation: [],
    penal: [],
    tributary: [],
    'administrative-tax': [],
  });

  const [editOpen, setEditOpen] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CourtCase | null>(null);
  const [editForm] = Form.useForm();

  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsList, setActionsList] = useState<Action[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionForm] = Form.useForm();

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusList, setStatusList] = useState<StatusUpdate[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusForm] = Form.useForm();

  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [selectedCaseType, setSelectedCaseType] = useState<CaseTypeKey>('litigation');

  const caseTypeIdByKey = useMemo(() => {
    const map: Partial<Record<CaseTypeKey, CourtCaseType>> = {};
    caseTypes.forEach((type) => {
      const key = typeKeyFromModel[type.model_name?.toLowerCase()];
      if (key) map[key] = type;
    });
    return map;
  }, [caseTypes]);

  const tabItems = useMemo(
    () =>
      (Object.keys(defaultLabels) as CaseTypeKey[]).map((key) => ({
        key,
        label: caseTypeIdByKey[key]?.display_name || defaultLabels[key],
      })),
    [caseTypeIdByKey]
  );

  const fetchCases = async (type: CaseTypeKey) => {
    setLoading(true);
    try {
      const data =
        type === 'labor'
          ? await fetchLaborCases()
          : type === 'litigation'
            ? await fetchLitigationCases()
            : type === 'penal'
              ? await fetchPenalCases()
              : type === 'tributary'
                ? await fetchTributaryCases()
                : await fetchAdministrativeTaxCases();
      setCasesByType((prev) => ({ ...prev, [type]: data }));
    } catch {
      message.error('Error al cargar casos');
    } finally {
      setLoading(false);
    }
  };

  const refreshActive = () => fetchCases(activeType);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [types, statesRes, deps, clientsRes, usersRes] = await Promise.all([
          fetchCaseTypes(),
          fetchCaseStates(),
          fetchDependencies(),
          fetchClients(),
          fetchUsers(),
        ]);
        setCaseTypes(types);
        setStates(statesRes);
        setDependencies(deps);
        setClients(clientsRes);
        setLawyers(usersRes);
      } catch {
        message.error('Error al cargar datos base');
      }
    };
    loadMasterData();
  }, []);

  useEffect(() => {
    fetchCases(activeType);
  }, [activeType]);

  const getLastStatusUpdate = (record: CourtCase) => {
    const updates = record.status_updates || [];
    if (!updates.length) return 'Sin actualizaciones';
    return updates[updates.length - 1]?.description || 'Sin actualizaciones';
  };

  const openEditModal = (record: CourtCase, onlyView = false) => {
    setSelectedCase(record);
    setViewOnly(onlyView);
    setEditOpen(true);

    const initialValues = {
      ...record,
      client: record.client?.id,
      responsible_lawyer: record.responsible_lawyer?.id,
      state: record.state?.id,
      sat_dependency: (record as AdministrativeTaxCase)?.sat_dependency?.id,
      init_date: record.init_date ? dayjs(record.init_date) : undefined,
      end_date: record.end_date ? dayjs(record.end_date) : undefined,
      adjustments: parseAdjustments((record as AdministrativeTaxCase | TributaryCase)?.adjustments),
    };

    editForm.setFieldsValue(initialValues);
  };

  const updateCase = async (payload: Record<string, any>) => {
    if (!selectedCase) return;
    const id = selectedCase.id;
    if (activeType === 'labor') return updateLaborCase(id, payload);
    if (activeType === 'litigation') return updateLitigationCase(id, payload);
    if (activeType === 'penal') return updatePenalCase(id, payload);
    if (activeType === 'tributary') return updateTributaryCase(id, payload);
    return updateAdministrativeTaxCase(id, payload);
  };

  const handleSaveEdit = async () => {
    try {
      const values = await editForm.validateFields();
      const payload = normalizeCasePayload(values);
      await updateCase(payload);
      message.success('Caso actualizado');
      setEditOpen(false);
      refreshActive();
    } catch {
      message.error('No se pudo actualizar el caso');
    }
  };

  const updateCaseState = (record: CourtCase, stateId: number) => {
    Modal.confirm({
      title: 'Confirmar acción',
      content: '¿Deseas actualizar el estado del caso?',
      okText: 'Sí',
      cancelText: 'No',
      onOk: async () => {
        try {
          if (activeType === 'labor') await updateLaborCase(record.id, { state: stateId });
          if (activeType === 'litigation') await updateLitigationCase(record.id, { state: stateId });
          if (activeType === 'penal') await updatePenalCase(record.id, { state: stateId });
          if (activeType === 'tributary') await updateTributaryCase(record.id, { state: stateId });
          if (activeType === 'administrative-tax')
            await updateAdministrativeTaxCase(record.id, { state: stateId });
          message.success('Estado actualizado');
          refreshActive();
        } catch {
          message.error('No se pudo actualizar el estado');
        }
      },
    });
  };

  const openActions = async (record: CourtCase) => {
    const caseTypeId = caseTypeIdByKey[activeType]?.id;
    if (!caseTypeId) {
      message.error('No se pudo determinar el tipo de caso');
      return;
    }

    setSelectedCaseId(record.id);
    setSelectedCaseType(activeType);
    setActionsOpen(true);
    setActionsLoading(true);
    try {
      const data = await fetchActions(record.id, caseTypeId);
      setActionsList(data);
    } catch {
      message.error('Error al cargar acciones');
    } finally {
      setActionsLoading(false);
    }
  };

  const submitAction = async () => {
    const caseTypeId = caseTypeIdByKey[selectedCaseType]?.id;
    if (!selectedCaseId || !caseTypeId) return;
    try {
      const values = await actionForm.validateFields();
      await createAction({
        description: values.description,
        is_reminder: values.is_reminder,
        instance_id: selectedCaseId,
        case_type: caseTypeId,
        creator: userId || undefined,
      });
      actionForm.resetFields();
      const data = await fetchActions(selectedCaseId, caseTypeId);
      setActionsList(data);
      message.success('Acción agregada');
    } catch {
      message.error('No se pudo agregar la acción');
    }
  };

  const openStatusUpdates = async (record: CourtCase) => {
    const caseTypeId = caseTypeIdByKey[activeType]?.id;
    if (!caseTypeId) {
      message.error('No se pudo determinar el tipo de caso');
      return;
    }

    setSelectedCaseId(record.id);
    setSelectedCaseType(activeType);
    setStatusOpen(true);
    setStatusLoading(true);
    try {
      const data = await fetchStatusUpdates(record.id, caseTypeId);
      setStatusList(data);
    } catch {
      message.error('Error al cargar actualizaciones');
    } finally {
      setStatusLoading(false);
    }
  };

  const submitStatusUpdate = async () => {
    const caseTypeId = caseTypeIdByKey[selectedCaseType]?.id;
    if (!selectedCaseId || !caseTypeId) return;
    try {
      const values = await statusForm.validateFields();
      await createStatusUpdate({
        description: values.description,
        instance_id: selectedCaseId,
        case_type: caseTypeId,
        creator: userId || undefined,
      });
      statusForm.resetFields();
      const data = await fetchStatusUpdates(selectedCaseId, caseTypeId);
      setStatusList(data);
      message.success('Estado actualizado');
    } catch {
      message.error('No se pudo actualizar el estado');
    }
  };

  const searchCases = useMemo(() => {
    const list = casesByType[activeType] || [];
    const term = searchText.trim().toLowerCase();
    if (!term) return list;
    return list.filter((item) => {
      const clientName = item.client?.name || '';
      const expedient = item.expedient || '';
      const subject = item.subject || '';
      const caseName = (item as LitigationCase | PenalCase).case_name || '';
      const authority = (item as LaborCase | LitigationCase).official_court || '';
      return [clientName, expedient, subject, caseName, authority].some((val) =>
        val.toLowerCase().includes(term)
      );
    });
  }, [casesByType, activeType, searchText]);

  const formatAmount = (amount?: string, currency?: number) => {
    if (!amount) return '-';
    const prefix = currency === 2 ? '$' : 'Q';
    return `${prefix} ${amount}`;
  };

  const renderActionsColumn = (record: CourtCase) => (
    <Space>
      <Tooltip title="Ver detalle">
        <Button icon={<EyeOutlined />} onClick={() => openEditModal(record, true)} />
      </Tooltip>
      {record.state?.id !== 4 && (
        <Tooltip title="Editar">
          <Button icon={<EditOutlined />} onClick={() => openEditModal(record, false)} />
        </Tooltip>
      )}
      {record.state?.id === 1 && (
        <Tooltip title="Eliminar">
          <Button danger icon={<DeleteOutlined />} onClick={() => updateCaseState(record, 2)} />
        </Tooltip>
      )}
      {record.state?.id === 1 && (
        <Tooltip title="Acciones">
          <Button icon={<InfoCircleOutlined />} onClick={() => openActions(record)} />
        </Tooltip>
      )}
      {record.state?.id === 1 && (
        <Tooltip title="Actualizaciones de estado">
          <Button icon={<CommentOutlined />} onClick={() => openStatusUpdates(record)} />
        </Tooltip>
      )}
      {record.state?.id === 1 && (
        <Tooltip title="Finalizar">
          <Button icon={<CheckOutlined />} onClick={() => updateCaseState(record, 4)} />
        </Tooltip>
      )}
      {record.state?.id === 1 && (
        <Tooltip title="Suspender">
          <Button icon={<PauseOutlined />} onClick={() => updateCaseState(record, 3)} />
        </Tooltip>
      )}
      {record.state?.id === 3 && (
        <Tooltip title="Reanudar">
          <Button icon={<PlayCircleOutlined />} onClick={() => updateCaseState(record, 1)} />
        </Tooltip>
      )}
      {record.state?.id === 4 && (
        <Tooltip title="Reabrir">
          <Button icon={<PlayCircleOutlined />} onClick={() => updateCaseState(record, 1)} />
        </Tooltip>
      )}
    </Space>
  );

  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: 'Cliente',
        dataIndex: ['client', 'name'],
        key: 'client',
      },
    ];

    if (activeType === 'labor') {
      return [
        ...baseColumns,
        { title: 'Autoridad', dataIndex: 'official_court', key: 'official_court' },
        { title: 'Tipo de proceso', dataIndex: 'process_type', key: 'process_type' },
        { title: 'Expediente', dataIndex: 'expedient', key: 'expedient' },
        { title: 'Demandante', dataIndex: 'actor', key: 'actor' },
        { title: 'Demandado', dataIndex: 'defendant', key: 'defendant' },
        { title: 'Estado', render: (_: unknown, record: CourtCase) => getLastStatusUpdate(record) },
        { title: 'Opciones', render: (_: unknown, record: CourtCase) => renderActionsColumn(record) },
      ];
    }

    if (activeType === 'litigation') {
      return [
        ...baseColumns,
        { title: 'Autoridad', dataIndex: 'official_court', key: 'official_court' },
        { title: 'Tipo de proceso', dataIndex: 'process_type', key: 'process_type' },
        {
          title: 'Monto en disputa',
          render: (_: unknown, record: CourtCase) => formatAmount(record.amount, record.currency),
        },
        {
          title: 'Estado',
          render: (_: unknown, record: CourtCase) => <Tag>{record.state?.name || '-'}</Tag>,
        },
        { title: 'Prob. éxito', dataIndex: 'success_probability', key: 'success_probability' },
        { title: 'Opciones', render: (_: unknown, record: CourtCase) => renderActionsColumn(record) },
      ];
    }

    if (activeType === 'penal') {
      return [
        ...baseColumns,
        { title: 'Nombre del caso', dataIndex: 'case_name', key: 'case_name' },
        { title: 'Expediente', dataIndex: 'expedient', key: 'expedient' },
        { title: 'Juzgado', dataIndex: 'court', key: 'court' },
        {
          title: 'Monto',
          render: (_: unknown, record: CourtCase) => formatAmount(record.amount, record.currency),
        },
        {
          title: 'Estado',
          render: (_: unknown, record: CourtCase) => <Tag>{record.state?.name || '-'}</Tag>,
        },
        { title: 'Prob. éxito', dataIndex: 'success_probability', key: 'success_probability' },
        { title: 'Opciones', render: (_: unknown, record: CourtCase) => renderActionsColumn(record) },
      ];
    }

    if (activeType === 'tributary') {
      return [
        ...baseColumns,
        { title: 'No. proceso', dataIndex: 'process_number', key: 'process_number' },
        { title: 'Sala', dataIndex: 'room', key: 'room' },
        {
          title: 'Monto total',
          render: (_: unknown, record: CourtCase) => formatAmount(record.amount, record.currency),
        },
        {
          title: 'Estado',
          render: (_: unknown, record: CourtCase) => <Tag>{record.state?.name || '-'}</Tag>,
        },
        { title: 'Prob. éxito', dataIndex: 'success_probability', key: 'success_probability' },
        { title: 'Opciones', render: (_: unknown, record: CourtCase) => renderActionsColumn(record) },
      ];
    }

    return [
      ...baseColumns,
      {
        title: 'Entidad',
        render: (_: unknown, record: AdministrativeTaxCase) =>
          record.sat_dependency ? `${record.entity || 'SAT'} - ${record.sat_dependency.name}` : record.entity || '-',
      },
      { title: 'Descripción', dataIndex: 'subject', key: 'subject' },
      {
        title: 'Monto total',
        render: (_: unknown, record: CourtCase) => formatAmount(record.amount, record.currency),
      },
      {
        title: 'Estado',
        render: (_: unknown, record: CourtCase) => <Tag>{record.state?.name || '-'}</Tag>,
      },
      { title: 'Prob. éxito', dataIndex: 'success_probability', key: 'success_probability' },
      { title: 'Opciones', render: (_: unknown, record: CourtCase) => renderActionsColumn(record) },
    ];
  }, [activeType, casesByType]);

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/dashboard/casos/crear')}>
            Crear caso
          </Button>
          <Button icon={<ReloadOutlined />} onClick={refreshActive}>
            Recargar
          </Button>
        </Space>
        <Input.Search
          placeholder="Buscar por cliente, expediente o asunto"
          allowClear
          onSearch={setSearchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </Space>

      <Tabs activeKey={activeType} onChange={(key) => setActiveType(key as CaseTypeKey)} items={tabItems} />

      <Table
        rowKey="id"
        loading={loading}
        dataSource={searchCases}
        columns={columns as any}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        open={editOpen}
        title={viewOnly ? 'Detalle del caso' : 'Editar caso'}
        onCancel={() => setEditOpen(false)}
        onOk={viewOnly ? undefined : handleSaveEdit}
        okText={viewOnly ? undefined : 'Guardar cambios'}
        cancelText="Cerrar"
        width={800}
      >
        <CourtCaseForm
          type={activeType}
          form={editForm}
          clients={clients}
          lawyers={lawyers}
          states={states}
          dependencies={dependencies}
          viewOnly={viewOnly}
        />
      </Modal>

      <Modal
        open={actionsOpen}
        title="Acciones"
        onCancel={() => setActionsOpen(false)}
        footer={null}
        width={700}
      >
        <Form form={actionForm} layout="vertical" onFinish={submitAction}>
          <Form.Item name="description" label="Descripción" rules={[{ required: true, message: 'Descripción requerida' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="is_reminder" valuePropName="checked">
            <Checkbox>Es recordatorio</Checkbox>
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Agregar
          </Button>
        </Form>

        <Table
          rowKey="id"
          loading={actionsLoading}
          dataSource={actionsList}
          columns={[
            { title: '#', render: (_: unknown, __: unknown, index: number) => index + 1 },
            {
              title: 'Fecha',
              dataIndex: 'created',
              render: (value: string) => (value ? new Date(value).toLocaleDateString() : '-'),
            },
            {
              title: 'Observación',
              dataIndex: 'description',
              render: (val: string, record: any) => (record.is_reminder ? <Tag color="blue">{val}</Tag> : val),
            },
          ]}
          pagination={false}
          style={{ marginTop: 16 }}
        />
      </Modal>

      <Modal
        open={statusOpen}
        title="Actualizaciones de estado"
        onCancel={() => setStatusOpen(false)}
        footer={null}
        width={700}
      >
        <Form form={statusForm} layout="vertical" onFinish={submitStatusUpdate}>
          <Form.Item name="description" label="Descripción" rules={[{ required: true, message: 'Descripción requerida' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Agregar
          </Button>
        </Form>

        <Table
          rowKey="id"
          loading={statusLoading}
          dataSource={statusList}
          columns={[
            { title: '#', render: (_: unknown, __: unknown, index: number) => index + 1 },
            {
              title: 'Fecha',
              dataIndex: 'created',
              render: (value: string) => (value ? new Date(value).toLocaleDateString() : '-'),
            },
            {
              title: 'Actualización',
              dataIndex: 'description',
            },
          ]}
          pagination={false}
          style={{ marginTop: 16 }}
        />
      </Modal>
    </div>
  );
};

export default CourtCasesPage;
