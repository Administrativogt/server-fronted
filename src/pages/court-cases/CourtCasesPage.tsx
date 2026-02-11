import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Radio,
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
  FileTextOutlined,
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

  const [reportVisible, setReportVisible] = useState(false);
  const [reportFormat, setReportFormat] = useState<'word' | 'excel'>('excel');
  const [updateMode, setUpdateMode] = useState<'last' | 'all'>('last');
  const [reportTo, setReportTo] = useState<string>('');

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
          await updateCase({ state: stateId });
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

  const exportExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');
    const cases = searchCases as CourtCase[];
    if (!cases?.length) {
      message.info('No hay datos para exportar');
      return;
    }
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Casos');
      ws.columns = [
        { header: 'Cliente', key: 'client', width: 28 },
        { header: 'Identificador', key: 'idv', width: 28 },
        { header: 'Tipo', key: 'type', width: 18 },
        { header: 'Estado', key: 'state', width: 22 },
        { header: updateMode === 'all' ? 'Actualización' : 'Última actualización', key: 'update', width: 40 },
        { header: 'Fecha', key: 'date', width: 16 },
      ];
      const top = `Dirigido a: ${reportTo || '-'}`;
      ws.mergeCells('A1:F1');
      ws.getCell('A1').value = top;
      ws.getCell('A1').font = { bold: true, size: 14 };
      ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
      ws.addRow([]);
      const label = defaultLabels[activeType];
      const now = dayjs().format('YYYY-MM-DD HH:mm');
      ws.addRow([`Reporte de casos — ${label}`, '', '', '', '', `Generado: ${now}`]).font = { bold: true };
      ws.addRow([]);
      for (const c of cases) {
        const client = c.client?.name || '-';
        const type = label;
        const state = c.state?.name || '-';
        const idv =
          (c as any).expedient ||
          (c as any).process_number ||
          (c as any).case_name ||
          (c as any).subject ||
          '-';
        if (updateMode === 'all') {
          const updates = (c as any).status_updates || [];
          if (!updates.length) {
            ws.addRow({ client, idv, type, state, update: '-', date: '-' });
          } else {
            for (const u of updates) {
              ws.addRow({
                client,
                idv,
                type,
                state,
                update: u.description || '-',
                date: u.created ? dayjs(u.created).format('YYYY-MM-DD') : '-',
              });
            }
          }
        } else {
          const updates = (c as any).status_updates || [];
          const last = updates.length ? updates[updates.length - 1] : null;
          ws.addRow({
            client,
            idv,
            type,
            state,
            update: last?.description || '-',
            date: last?.created ? dayjs(last.created).format('YYYY-MM-DD') : '-',
          });
        }
      }
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf]), `reporte-casos-${activeType}-${dayjs().format('YYYYMMDD-HHmm')}.xlsx`);
      message.success('Excel generado correctamente');
    } catch {
      message.error('No fue posible generar el Excel');
    }
  };

  const exportWord = async () => {
    const cases = searchCases as CourtCase[];
    if (!cases?.length) return message.info('No hay datos para exportar');
    try {
      const {
        Document,
        Packer,
        Paragraph,
        Table,
        TableRow,
        TableCell,
        HeadingLevel,
        WidthType,
        TextRun,
      } = await import('docx');
      const label = defaultLabels[activeType];
      const now = dayjs().format('YYYY-MM-DD HH:mm');
      const children: any[] = [
        new Paragraph({
          text: `Reporte de casos — ${label}`,
          heading: HeadingLevel.TITLE,
        }),
        new Paragraph({
          children: [new TextRun({ text: `Dirigido a: ${reportTo || '-'}`, bold: true })],
        }),
        new Paragraph({ text: `Generado: ${now}` }),
      ];
      const headerCells = [
        new TableCell({ children: [new Paragraph({ text: 'Cliente' })] }),
        new TableCell({ children: [new Paragraph({ text: 'Identificador' })] }),
        new TableCell({ children: [new Paragraph({ text: 'Estado' })] }),
        new TableCell({
          children: [new Paragraph({ text: updateMode === 'all' ? 'Actualización' : 'Última actualización' })],
        }),
        new TableCell({ children: [new Paragraph({ text: 'Fecha' })] }),
      ];
      const rows: any[] = [new TableRow({ children: headerCells })];
      for (const c of cases) {
        const client = c.client?.name || '-';
        const state = c.state?.name || '-';
        const idv =
          (c as any).expedient ||
          (c as any).process_number ||
          (c as any).case_name ||
          (c as any).subject ||
          '-';
        const updates = (c as any).status_updates || [];
        if (updateMode === 'all') {
          if (!updates.length) {
            rows.push(
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: client })] }),
                  new TableCell({ children: [new Paragraph({ text: idv })] }),
                  new TableCell({ children: [new Paragraph({ text: state })] }),
                  new TableCell({ children: [new Paragraph({ text: '-' })] }),
                  new TableCell({ children: [new Paragraph({ text: '-' })] }),
                ],
              })
            );
          } else {
            for (const u of updates) {
              rows.push(
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: client })] }),
                    new TableCell({ children: [new Paragraph({ text: idv })] }),
                    new TableCell({ children: [new Paragraph({ text: state })] }),
                    new TableCell({ children: [new Paragraph({ text: u.description || '-' })] }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          text: u.created ? dayjs(u.created).format('YYYY-MM-DD') : '-',
                        }),
                      ],
                    }),
                  ],
                })
              );
            }
          }
        } else {
          const last = updates.length ? updates[updates.length - 1] : null;
          rows.push(
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: client })] }),
                new TableCell({ children: [new Paragraph({ text: idv })] }),
                new TableCell({ children: [new Paragraph({ text: state })] }),
                new TableCell({ children: [new Paragraph({ text: last?.description || '-' })] }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: last?.created ? dayjs(last.created).format('YYYY-MM-DD') : '-',
                    }),
                  ],
                }),
              ],
            })
          );
        }
      }
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows,
      });
      children.push(table);
      const doc = new Document({
        sections: [{ properties: {}, children }],
      });
      const blob = await Packer.toBlob(doc);
      const { saveAs } = await import('file-saver');
      saveAs(blob, `Reporte de Casos ${label}.docx`);
      message.success('Word generado correctamente');
    } catch {
      message.error('No fue posible generar el Word');
    }
  };

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
          <Button icon={<FileTextOutlined />} onClick={() => setReportVisible(true)}>
            Generar reporte…
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

      <Modal
        open={reportVisible}
        title="Generar reporte"
        onCancel={() => setReportVisible(false)}
        onOk={async () => {
          setReportVisible(false);
          if (reportFormat === 'excel') await exportExcel();
          else await exportWord();
        }}
      >
        <Form layout="vertical">
          <Form.Item label="Formato">
            <Radio.Group
              value={reportFormat}
              onChange={(e: any) => setReportFormat(e.target.value)}
              options={[
                { label: 'Excel', value: 'excel' },
                { label: 'Word', value: 'word' },
              ]}
              optionType="button"
              buttonStyle="solid"
            />
          </Form.Item>
          <Form.Item label="Actualizaciones">
            <Radio.Group
              value={updateMode}
              onChange={(e: any) => setUpdateMode(e.target.value)}
              options={[
                { label: 'Última', value: 'last' },
                { label: 'Todas', value: 'all' },
              ]}
              optionType="button"
              buttonStyle="solid"
            />
          </Form.Item>
          <Form.Item label="Dirigido a">
            <Input value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CourtCasesPage;
