// src/pages/procuration/CreateProcuration.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  Input,
  DatePicker,
  TimePicker,
  Button,
  Space,
  Select,
  message,
  Row,
  Col,
  Divider,
  Switch,
  Table,
  InputNumber,
  Alert,
  Modal,
  Tag,
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  createProcurations,
  getClients,
  getEntities,
  getRecurrences,
  getProcurators,
} from '../../api/procuration';
import type {
  CreateProcurationItem,
  Client,
  Entity,
  Recurrence,
  User,
  DocumentBreakdown,
} from '../../types/procuration.types';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '../../types/procuration.types';
import useAuthStore from '../../auth/useAuthStore';

const { TextArea } = Input;

interface ProcurationQueue extends CreateProcurationItem {
  key: string;
  clientName?: string;
  entityName?: string;
  procuratorName?: string;
}

const CreateProcuration: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const userId = useAuthStore((s) => s.userId);
  const username = useAuthStore((s) => s.username);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingMasterData, setLoadingMasterData] = useState(true);

  // Master data
  const [clients, setClients] = useState<Client[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [procurators, setProcurators] = useState<User[]>([]);

  // Form toggles
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [hasLimitHour, setHasLimitHour] = useState(false);

  // Queue for batch creation
  const [queue, setQueue] = useState<ProcurationQueue[]>([]);

  // Document breakdown modal
  const [breakdownModalVisible, setBreakdownModalVisible] = useState(false);
  const [documentBreakdown, setDocumentBreakdown] = useState<DocumentBreakdown[]>([]);
  const [breakdownClient, setBreakdownClient] = useState<number | undefined>();
  const [breakdownAmount, setBreakdownAmount] = useState<number>(1);

  // Load master data
  const loadMasterData = useCallback(async () => {
    setLoadingMasterData(true);
    try {
      const [clientsRes, entitiesRes, recurrencesRes, procuratorsRes] = await Promise.all([
        getClients().catch(() => ({ data: [] })),
        getEntities().catch(() => ({ data: [] })),
        getRecurrences().catch(() => ({ data: [] })),
        getProcurators().catch(() => ({ data: [] })),
      ]);
      // Handle both { data: [...] } and direct array responses
      setClients(Array.isArray(clientsRes) ? clientsRes : (clientsRes.data || []));
      setEntities(Array.isArray(entitiesRes) ? entitiesRes : (entitiesRes.data || []));
      setRecurrences(Array.isArray(recurrencesRes) ? recurrencesRes : (recurrencesRes.data || []));
      setProcurators(Array.isArray(procuratorsRes) ? procuratorsRes : (procuratorsRes.data || []));
    } catch (error: any) {
      message.error('Error al cargar datos maestros');
    } finally {
      setLoadingMasterData(false);
    }
  }, []);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Add to queue
  const handleAddToQueue = async () => {
    try {
      const values = await form.validateFields();

      const client = clients.find((c) => c.id === values.client);
      const entity = entities.find((e) => e.id === values.entity);
      const procurator = procurators.find((p) => p.id === values.procurator);

      const procurationItem: ProcurationQueue = {
        key: `${Date.now()}-${Math.random()}`,
        client: values.client,
        clientName: client?.name,
        entity: values.entity,
        entityName: entity?.name,
        description: values.description,
        documents: values.documents,
        date: dayjs().format('YYYY-MM-DD'),
        applicant: userId || undefined,
        procurator: values.procurator,
        procuratorName: procurator?.username,
        limit_date: values.limit_date ? values.limit_date.format('YYYY-MM-DD') : undefined,
        limit_hour: hasLimitHour && values.limit_hour ? values.limit_hour.format('HH:mm') : undefined,
        priority: values.priority || 3,
        state: 1, // Solicitado
        recurrence: isRecurrent ? values.recurrence : undefined,
        nt_number: values.nt_number,
        document_breakdown: documentBreakdown.length > 0 ? documentBreakdown : undefined,
      };

      setQueue([...queue, procurationItem]);
      message.success('Procuracion agregada a la cola');

      // Reset form but keep some values
      form.resetFields(['description', 'documents', 'nt_number']);
      setDocumentBreakdown([]);
    } catch (error) {
      message.error('Por favor complete los campos requeridos');
    }
  };

  // Remove from queue
  const handleRemoveFromQueue = (key: string) => {
    setQueue(queue.filter((item) => item.key !== key));
  };

  // Save all procurations
  const handleSaveAll = async () => {
    if (queue.length === 0) {
      message.warning('No hay procuraciones en la cola');
      return;
    }

    setLoading(true);
    try {
      // Remove UI-specific fields before sending
      const procurationsToSend: CreateProcurationItem[] = queue.map(
        ({ key, clientName, entityName, procuratorName, ...rest }) => rest
      );

      await createProcurations(procurationsToSend);
      message.success(`${queue.length} procuracion(es) creada(s) con exito`);
      navigate('/dashboard/procuration');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al crear procuraciones');
    } finally {
      setLoading(false);
    }
  };

  // Submit single procuration directly
  const handleSubmitSingle = async (values: any) => {
    if (!userId) {
      message.error('Error: Usuario no autenticado');
      return;
    }

    setLoading(true);
    try {
      const procurationItem: CreateProcurationItem = {
        client: values.client,
        entity: values.entity,
        description: values.description,
        documents: values.documents,
        date: dayjs().format('YYYY-MM-DD'),
        applicant: userId,
        procurator: values.procurator,
        limit_date: values.limit_date ? values.limit_date.format('YYYY-MM-DD') : undefined,
        limit_hour: hasLimitHour && values.limit_hour ? values.limit_hour.format('HH:mm') : undefined,
        priority: values.priority || 3,
        state: 1,
        recurrence: isRecurrent ? values.recurrence : undefined,
        nt_number: values.nt_number,
        document_breakdown: documentBreakdown.length > 0 ? documentBreakdown : undefined,
      };

      await createProcurations([procurationItem]);
      message.success('Procuracion creada con exito');
      navigate('/dashboard/procuration');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al crear procuracion');
    } finally {
      setLoading(false);
    }
  };

  // Add document breakdown
  const handleAddBreakdown = () => {
    if (!breakdownClient || !breakdownAmount) {
      message.warning('Seleccione cliente y cantidad');
      return;
    }

    setDocumentBreakdown([
      ...documentBreakdown,
      { client: breakdownClient, amount: breakdownAmount },
    ]);
    setBreakdownClient(undefined);
    setBreakdownAmount(1);
  };

  // Queue table columns
  const queueColumns: ColumnsType<ProcurationQueue> = [
    {
      title: 'Cliente',
      dataIndex: 'clientName',
      key: 'client',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Entidad',
      dataIndex: 'entityName',
      key: 'entity',
      width: 150,
    },
    {
      title: 'Descripcion',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Procurador',
      dataIndex: 'procuratorName',
      key: 'procurator',
      width: 120,
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
      title: 'Fecha Limite',
      dataIndex: 'limit_date',
      key: 'limit_date',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button
          type="primary"
          danger
          icon={<DeleteOutlined />}
          size="small"
          onClick={() => handleRemoveFromQueue(record.key)}
        />
      ),
    },
  ];

  return (
    <div>
      <Card
        title="Crear Procuracion"
        extra={
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dashboard/procuration')}
          >
            Volver
          </Button>
        }
      >
        {loadingMasterData ? (
          <div style={{ textAlign: 'center', padding: 50 }}>Cargando datos...</div>
        ) : (
          <Form form={form} layout="vertical" onFinish={handleSubmitSingle}>
            {/* Applicant info */}
            <Alert
              message={`Solicitante: ${username}`}
              type="info"
              style={{ marginBottom: 16 }}
            />

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Procurador Asignado"
                  name="procurator"
                  rules={[{ required: true, message: 'Seleccione un procurador' }]}
                >
                  <Select
                    placeholder="Seleccionar procurador"
                    showSearch
                    optionFilterProp="label"
                    options={procurators.map((p) => ({
                      value: p.id,
                      label: p.username,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Cliente"
                  name="client"
                  rules={[{ required: true, message: 'Seleccione un cliente' }]}
                >
                  <Select
                    placeholder="Seleccionar cliente"
                    showSearch
                    optionFilterProp="label"
                    options={clients.map((c) => ({
                      value: c.id,
                      label: `${c.code} - ${c.name}`,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Entidad a Procurar"
                  name="entity"
                  rules={[{ required: true, message: 'Seleccione una entidad' }]}
                >
                  <Select
                    placeholder="Seleccionar entidad"
                    showSearch
                    optionFilterProp="label"
                    options={entities.map((e) => ({
                      value: e.id,
                      label: e.name,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Numero NT"
                  name="nt_number"
                >
                  <InputNumber
                    placeholder="Numero de tramite"
                    style={{ width: '100%' }}
                    min={0}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Documentos Entregados"
                  name="documents"
                  rules={[{ required: true, message: 'Ingrese los documentos' }]}
                >
                  <Input placeholder="Ej: Escritura de constitucion, DPI" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Prioridad"
                  name="priority"
                  initialValue={3}
                  rules={[{ required: true, message: 'Seleccione una prioridad' }]}
                >
                  <Select
                    options={[
                      { value: 1, label: 'A - Urgente' },
                      { value: 2, label: 'B - Media' },
                      { value: 3, label: 'C - Baja' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label="Descripcion"
                  name="description"
                  rules={[{ required: true, message: 'Ingrese una descripcion' }]}
                >
                  <TextArea
                    rows={3}
                    placeholder="Descripcion detallada del requerimiento"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider>Opciones de Fecha</Divider>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="Asunto Recurrente">
                  <Switch
                    checked={isRecurrent}
                    onChange={(checked) => {
                      setIsRecurrent(checked);
                      if (checked) setHasLimitHour(false);
                    }}
                  />
                </Form.Item>
              </Col>

              {isRecurrent && (
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Lapso de Recurrencia"
                    name="recurrence"
                    rules={[{ required: isRecurrent, message: 'Seleccione recurrencia' }]}
                  >
                    <Select
                      placeholder="Seleccionar lapso"
                      options={recurrences.map((r) => ({
                        value: r.id,
                        label: r.lapse,
                      }))}
                    />
                  </Form.Item>
                </Col>
              )}

              {!isRecurrent && (
                <>
                  <Col xs={24} md={8}>
                    <Form.Item label="Fecha Limite" name="limit_date">
                      <DatePicker
                        style={{ width: '100%' }}
                        format="DD/MM/YYYY"
                        placeholder="Seleccionar fecha"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Agregar Hora Limite">
                      <Space>
                        <Switch
                          checked={hasLimitHour}
                          onChange={setHasLimitHour}
                        />
                        {hasLimitHour && (
                          <Form.Item name="limit_hour" noStyle>
                            <TimePicker format="HH:mm" placeholder="Hora" />
                          </Form.Item>
                        )}
                      </Space>
                    </Form.Item>
                  </Col>
                </>
              )}
            </Row>

            <Divider>Desglose de Documentos (Opcional)</Divider>

            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => setBreakdownModalVisible(true)}
              style={{ marginBottom: 16 }}
            >
              Agregar desglose
            </Button>

            {documentBreakdown.length > 0 && (
              <Table
                size="small"
                dataSource={documentBreakdown.map((d, idx) => ({
                  key: idx,
                  client: clients.find((c) => c.id === d.client)?.name || d.client,
                  amount: d.amount,
                }))}
                columns={[
                  { title: 'Cliente', dataIndex: 'client', key: 'client' },
                  { title: 'Cantidad', dataIndex: 'amount', key: 'amount' },
                  {
                    title: 'Acciones',
                    key: 'actions',
                    render: (_, __, idx) => (
                      <Button
                        type="link"
                        danger
                        onClick={() => {
                          const newBreakdown = [...documentBreakdown];
                          newBreakdown.splice(idx, 1);
                          setDocumentBreakdown(newBreakdown);
                        }}
                      >
                        Eliminar
                      </Button>
                    ),
                  },
                ]}
                pagination={false}
                style={{ marginBottom: 16 }}
              />
            )}

            <Divider />

            <Form.Item>
              <Space wrap>
                <Button
                  type="default"
                  icon={<PlusOutlined />}
                  onClick={handleAddToQueue}
                  size="large"
                >
                  Agregar a cola
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                  size="large"
                >
                  Guardar directamente
                </Button>
                <Button
                  size="large"
                  onClick={() => navigate('/dashboard/procuration')}
                >
                  Cancelar
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Card>

      {/* Queue Section */}
      {queue.length > 0 && (
        <Card
          title={`Cola de Procuraciones (${queue.length})`}
          style={{ marginTop: 16 }}
          extra={
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveAll}
              loading={loading}
            >
              Guardar todas ({queue.length})
            </Button>
          }
        >
          <Table
            columns={queueColumns}
            dataSource={queue}
            rowKey="key"
            pagination={false}
            scroll={{ x: 900 }}
          />
        </Card>
      )}

      {/* Document Breakdown Modal */}
      <Modal
        title="Agregar Desglose de Documentos"
        open={breakdownModalVisible}
        onOk={handleAddBreakdown}
        onCancel={() => setBreakdownModalVisible(false)}
        okText="Agregar"
        cancelText="Cancelar"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <label>Cliente:</label>
            <Select
              placeholder="Seleccionar cliente"
              style={{ width: '100%' }}
              value={breakdownClient}
              onChange={setBreakdownClient}
              showSearch
              optionFilterProp="label"
              options={clients.map((c) => ({
                value: c.id,
                label: `${c.code} - ${c.name}`,
              }))}
            />
          </div>
          <div>
            <label>Cantidad de documentos:</label>
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              value={breakdownAmount}
              onChange={(v) => setBreakdownAmount(v || 1)}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default CreateProcuration;
