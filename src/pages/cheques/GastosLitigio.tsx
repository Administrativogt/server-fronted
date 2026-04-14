import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { CheckRequest, LitigioExpense, ParentCheckResponse } from '../../types/checks.types';
import {
  createLitigioExpense,
  deleteLitigioExpense,
  downloadLitigioExpensesReport,
  getCheckByRequestId,
  getLitigioExpenses,
  getPendingLiquidation,
  liquidateLitigioExpense,
  updateLitigioExpense,
  verifyParentCheck,
} from '../../api/checks';
import { fetchUsers, fullName, type UserLite } from '../../api/users';
import useAuthStore from '../../auth/useAuthStore';

const { Title } = Typography;

function GastosLitigio() {
  const userId = useAuthStore((s) => s.userId);
  const tipoUsuario = useAuthStore((s) => s.tipo_usuario);
  const isSuperuser = useAuthStore((s) => s.is_superuser);
  const canViewAll = isSuperuser || [1, 2, 10].includes(tipoUsuario || 0);

  const [data, setData] = useState<LitigioExpense[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LitigioExpense | null>(null);
  const [checkOptions, setCheckOptions] = useState<CheckRequest[]>([]);
  const [checkOptionsLoading, setCheckOptionsLoading] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<CheckRequest | null>(null);
  const [checkBalance, setCheckBalance] = useState<number | null>(null);
  const [parentWarning, setParentWarning] = useState<ParentCheckResponse | null>(null);
  const [checkingRequest, setCheckingRequest] = useState(false);
  const [form] = Form.useForm();

  const requestOptions = useMemo(() => {
    const map = new Map<number, CheckRequest>();
    checkOptions.forEach((item) => map.set(item.request_id, item));
    if (selectedCheck) {
      map.set(selectedCheck.request_id, selectedCheck);
    }
    if (editing?.request_id?.request_id) {
      map.set(editing.request_id.request_id, editing.request_id as CheckRequest);
    }
    return Array.from(map.values());
  }, [checkOptions, editing, selectedCheck]);

  const requestSelectOptions = useMemo(
    () =>
      requestOptions.map((item) => ({
        label: `${item.request_id} — ${item.client}`,
        value: item.request_id,
      })),
    [requestOptions],
  );

  const [filters, setFilters] = useState({
    request_id: undefined as number | undefined,
    responsible_id: canViewAll ? (undefined as number | undefined) : (userId ?? undefined),
    page: 1,
    per_page: 20,
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, per_page: 20 });

  useEffect(() => {
    if (!canViewAll && userId) {
      setFilters((prev) => ({ ...prev, responsible_id: userId }));
    }
  }, [canViewAll, userId]);

  const fetchCheckOptions = useCallback(async () => {
    setCheckOptionsLoading(true);
    try {
      const response = await getPendingLiquidation({
        page: 1,
        per_page: 200,
        equipo_id: 6,
        ...(canViewAll ? {} : { responsible_id: userId ?? undefined }),
      });
      setCheckOptions(response.data);
    } catch (error: any) {
      setCheckOptions([]);
      message.error(
        error?.response?.data?.message || 'Error al cargar solicitudes disponibles',
      );
    } finally {
      setCheckOptionsLoading(false);
    }
  }, [canViewAll, userId]);

  useEffect(() => {
    if (modalOpen) {
      fetchCheckOptions();
    } else {
      form.resetFields();
      setSelectedCheck(null);
      setCheckBalance(null);
      setParentWarning(null);
    }
  }, [modalOpen, fetchCheckOptions, form]);

  const detectParentCheck = useCallback(async (requestId: number) => {
    try {
      const response = await verifyParentCheck(requestId);
      if (response?.has_parent) {
        setParentWarning(response);
      } else {
        setParentWarning(null);
      }
    } catch (error: any) {
      if (error?.response?.status === 400 && error.response.data?.has_parent) {
        setParentWarning(error.response.data);
      } else {
        setParentWarning(null);
      }
    }
  }, []);

  const handleRequestChange = async (requestId?: number) => {
    if (!requestId) {
      setSelectedCheck(null);
      setCheckBalance(null);
      setParentWarning(null);
      return;
    }
    setCheckingRequest(true);
    try {
      const check = await getCheckByRequestId(requestId);
      setSelectedCheck(check);
      setCheckBalance(
        typeof check.inmobiliario_expenses_amount === 'number'
          ? Number(check.inmobiliario_expenses_amount)
          : null,
      );
      form.setFieldsValue({
        note_number: check.work_note_number,
        client: check.client,
        description: check.description,
      });
      await detectParentCheck(requestId);
    } catch (error: any) {
      form.setFieldsValue({ request_id: undefined });
      setSelectedCheck(null);
      setCheckBalance(null);
      setParentWarning(null);
      message.error(error?.response?.data?.message || 'No se pudo obtener el cheque');
    } finally {
      setCheckingRequest(false);
    }
  };

  const handleApplyParentCheck = () => {
    if (!parentWarning?.parent?.request_id) return;
    const parentId = parentWarning.parent.request_id;
    form.setFieldsValue({ request_id: parentId });
    handleRequestChange(parentId);
  };

  const handleExtractReceiptData = () => {
    const reference: string = form.getFieldValue('receipt_number_reference') || '';
    if (!reference.trim()) {
      message.warning('Ingresa el número de comprobante completo primero');
      return;
    }
    const digits = reference.replace(/[^0-9]/g, '');
    const letters = reference.replace(/[0-9]/g, '').trim();
    form.setFieldsValue({
      receipt_number: digits,
      receipt_serie: letters,
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await getLitigioExpenses({
        ...filters,
        request_id: filters.request_id || undefined,
        responsible_id: canViewAll ? filters.responsible_id || undefined : userId || undefined,
      });
      setData(response.data);
      setPagination({
        total: response.total,
        page: response.page,
        per_page: response.per_page,
      });
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al cargar gastos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.per_page]);

  useEffect(() => {
    fetchUsers(6).then(setUsers).catch(() => setUsers([]));
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setSelectedCheck(null);
    setParentWarning(null);
    setCheckBalance(null);
    setModalOpen(true);
  };

  const openEdit = (expense: LitigioExpense) => {
    setEditing(expense);
    form.setFieldsValue({
      request_id: expense.request_id?.request_id,
      note_number: expense.note_number,
      date: expense.date ? dayjs(expense.date) : undefined,
      description: expense.description,
      client: expense.client,
      documents: expense.documents,
      receipt_number_reference: expense.receipt_number_reference,
      receipt_number: expense.receipt_number,
      receipt_value: expense.receipt_value,
      receipt_serie: expense.receipt_serie,
      comment: expense.comment,
      delivered_by_id: expense.delivered_by?.id,
    });
    setSelectedCheck(expense.request_id ?? null);
    setCheckBalance(
      expense.request_id?.inmobiliario_expenses_amount !== undefined
        ? Number(expense.request_id?.inmobiliario_expenses_amount)
        : null,
    );
    setParentWarning(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        date:
          values.date && typeof values.date !== 'string'
            ? (values.date as Dayjs).format('YYYY-MM-DD')
            : values.date,
      };
      if (editing?.id) {
        await updateLitigioExpense(editing.id, payload);
        message.success('Gasto actualizado');
      } else {
        await createLitigioExpense(payload);
        message.success('Gasto creado');
      }
      setModalOpen(false);
      await loadData();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || 'Error al guardar gasto');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteLitigioExpense(id);
      message.success('Gasto eliminado');
      await loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al eliminar gasto');
    }
  };

  const handleLiquidateExpense = async (id: number) => {
    try {
      await liquidateLitigioExpense(id);
      message.success('Estado actualizado');
      await loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al cambiar estado');
    }
  };

  return (
    <Card>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <Title level={4} style={{ margin: 0 }}>
          Gastos litigio
        </Title>
        <Space>
          <Button onClick={() => loadData()} loading={loading}>
            Recargar
          </Button>
          <Button onClick={() => downloadLitigioExpensesReport(filters.request_id)}>
            Descargar reporte
          </Button>
          <Button type="primary" onClick={openCreate}>
            Crear gasto
          </Button>
        </Space>
      </Space>

      <Space style={{ marginBottom: 12 }} wrap>
        <InputNumber
          placeholder="request_id"
          value={filters.request_id}
          onChange={(value) => setFilters((prev) => ({ ...prev, request_id: value || undefined }))}
        />
        {canViewAll ? (
          <Select<number>
            allowClear
            showSearch
            style={{ width: 280 }}
            placeholder="entregado por"
            value={filters.responsible_id}
            onChange={(value) => setFilters((prev) => ({ ...prev, responsible_id: value }))}
            options={users.map((user) => ({
              label: `${fullName(user)} (${user.username})`,
              value: user.id,
            }))}
            optionFilterProp="label"
          />
        ) : null}
        <Button
          type="primary"
          onClick={() => {
            setFilters((prev) => ({ ...prev, page: 1 }));
            loadData();
          }}
        >
          Buscar
        </Button>
      </Space>

      <Table<LitigioExpense>
        rowKey="id"
        loading={loading}
        dataSource={data}
        scroll={{ x: 'max-content', y: 480 }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.per_page,
          total: pagination.total,
          onChange: (page, pageSize) => {
            setFilters((prev) => ({ ...prev, page, per_page: pageSize }));
          },
        }}
        columns={[
          { title: 'Request ID', render: (_, row) => row.request_id?.request_id ?? '—', width: 120 },
          { title: 'Nota', dataIndex: 'note_number', width: 110 },
          { title: 'Cliente', dataIndex: 'client' },
          { title: 'Recibo', dataIndex: 'receipt_number' },
          { title: 'Serie', dataIndex: 'receipt_serie', width: 90 },
          { title: 'Valor', dataIndex: 'receipt_value', render: (v) => Number(v).toFixed(2), width: 120 },
          {
            title: 'Estado',
            dataIndex: 'state',
            width: 120,
            render: (state: number) => {
              const map: Record<number, { color: string; label: string }> = {
                1: { color: 'green', label: 'Aceptado' },
                2: { color: 'red', label: 'Rechazado' },
                3: { color: 'orange', label: 'Creado' },
                4: { color: 'blue', label: 'Listo para liquidar' },
              };
              const { color, label } = map[state] ?? { color: 'default', label: `Estado ${state}` };
              return <Tag color={color}>{label}</Tag>;
            },
          },
          {
            title: 'Acciones',
            width: 300,
            render: (_, record) => (
              <Space>
                <Button onClick={() => openEdit(record)}>Editar</Button>
                <Popconfirm title="¿Eliminar gasto?" onConfirm={() => handleDelete(record.id)}>
                  <Button danger>Eliminar</Button>
                </Popconfirm>
                <Button type="primary" onClick={() => handleLiquidateExpense(record.id)}>
                  Marcar liquidado
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? 'Editar gasto litigio' : 'Crear gasto litigio'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText="Guardar"
        width={760}
      >
        {parentWarning?.has_parent && parentWarning.parent ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="Advertencia"
            description={
              <div>
                <div>{parentWarning.message || 'Esta solicitud cuenta con un ID matriz.'}</div>
                <div style={{ marginTop: 8 }}>
                  ID matriz: <strong>{parentWarning.parent.request_id}</strong> — NT{' '}
                  {parentWarning.parent.work_note_number} — Cliente {parentWarning.parent.client}
                </div>
                <Button type="link" onClick={handleApplyParentCheck} style={{ paddingLeft: 0 }}>
                  Presiona acá para seleccionarlo
                </Button>
              </div>
            }
          />
        ) : null}
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="request_id"
                label="Request ID"
                rules={[{ required: true, message: 'Selecciona un Request ID' }]}
              >
                <Select<number>
                  showSearch
                  allowClear
                  placeholder="Selecciona un request"
                  loading={checkOptionsLoading || checkingRequest}
                  options={requestSelectOptions}
                  optionFilterProp="label"
                  onChange={(value) => handleRequestChange(value)}
                  onClear={() => handleRequestChange(undefined)}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="note_number" label="No. Nota" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="client" label="Cliente" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label="Descripción">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="date" label="Fecha" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="documents" label="Documentos">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="receipt_number_reference"
                label="No. documento entregado"
                rules={[{ required: true }]}
                extra={<span style={{ color: '#0050b3' }}>Ingresar número de comprobante completo</span>}
              >
                <Input />
              </Form.Item>
              <Button
                size="small"
                type="primary"
                htmlType="button"
                onClick={handleExtractReceiptData}
                style={{ marginBottom: 16 }}
              >
                Extraer número y serie
              </Button>
            </Col>
            <Col span={12}>
              <Form.Item
                name="receipt_number"
                label="No. documento para liquidar"
                rules={[{ required: true }]}
                extra={
                  <span style={{ color: '#0050b3' }}>
                    Este número es el que el usuario deberá ingresar al liquidar y que el sistema validará
                  </span>
                }
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="receipt_serie"
                label="Serie documento para liquidar"
                extra={
                  <span style={{ color: '#0050b3' }}>
                    Este número de serie es el que el sistema validará durante la liquidación
                  </span>
                }
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="receipt_value" label="Valor a liquidar" rules={[{ required: true }]}>
                <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Saldo en ID seleccionado">
                <Input
                  readOnly
                  value={
                    checkBalance !== null && !Number.isNaN(checkBalance)
                      ? checkBalance.toFixed(2)
                      : ''
                  }
                  placeholder="Selecciona un Request ID"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="comment" label="Comentario">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="delivered_by_id" label="Entregado por" rules={[{ required: true }]}>
                <Select
                  showSearch
                  options={users.map((user) => ({
                    label: `${fullName(user)} (${user.username})`,
                    value: user.id,
                  }))}
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
}

export default GastosLitigio;
