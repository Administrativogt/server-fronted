import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { LitigioExpense } from '../../types/checks.types';
import {
  createLitigioExpense,
  deleteLitigioExpense,
  downloadLitigioExpensesReport,
  getLitigioExpenses,
  liquidateLitigioExpense,
  updateLitigioExpense,
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
  const [form] = Form.useForm();
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
    fetchUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (expense: LitigioExpense) => {
    setEditing(expense);
    form.setFieldsValue({
      request_id: expense.request_id?.request_id,
      note_number: expense.note_number,
      date: expense.date,
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
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editing?.id) {
        await updateLitigioExpense(editing.id, values);
        message.success('Gasto actualizado');
      } else {
        await createLitigioExpense(values);
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
                  Marcar aceptado
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
        <Form form={form} layout="vertical">
          <Form.Item name="request_id" label="Request ID" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note_number" label="No. Nota" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="date" label="Fecha" rules={[{ required: true }]}>
            <Input placeholder="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="client" label="Cliente" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Descripción">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="receipt_number_reference"
            label="No. recibo referencia"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="receipt_number" label="No. recibo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="receipt_serie" label="Serie recibo">
            <Input />
          </Form.Item>
          <Form.Item name="receipt_value" label="Valor recibo" rules={[{ required: true }]}>
            <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="documents" label="Documentos">
            <Input />
          </Form.Item>
          <Form.Item name="comment" label="Comentario">
            <Input.TextArea rows={2} />
          </Form.Item>
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
        </Form>
      </Modal>
    </Card>
  );
}

export default GastosLitigio;
