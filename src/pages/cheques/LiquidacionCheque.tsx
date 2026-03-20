import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { fetchUsers, fullName, type UserLite } from '../../api/users';
import {
  getCheckEntities,
  liquidateCheck,
  syncPendingLiquidation,
  getPendingLiquidation,
  getInmobiliarioExpenses,
  getLitigioExpenses,
} from '../../api/checks';
import { getEntities as getProcurationEntities } from '../../api/procuration';
import type { CheckRequest, CheckEntity, InmobiliarioExpense, LitigioExpense } from '../../types/checks.types';
import useAuthStore from '../../auth/useAuthStore';

const { Title } = Typography;

function LiquidacionCheque() {
  const userId = useAuthStore((s) => s.userId);
  const tipoUsuario = useAuthStore((s) => s.tipo_usuario);
  const isSuperuser = useAuthStore((s) => s.is_superuser);
  const canViewAll = isSuperuser || [1, 2, 10].includes(tipoUsuario || 0);

  const [data, setData] = useState<CheckRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [liquidateLoading, setLiquidateLoading] = useState(false);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [selectedCheck, setSelectedCheck] = useState<CheckRequest | null>(null);
  const [liquidateModalOpen, setLiquidateModalOpen] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [changeInvoiceData, setChangeInvoiceData] = useState(false);
  const [entities, setEntities] = useState<CheckEntity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(true);
  const [inmobiliarioExpenses, setInmobiliarioExpenses] = useState<InmobiliarioExpense[]>([]);
  const [litigioExpenses, setLitigioExpenses] = useState<LitigioExpense[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<number[]>([]);
  const [selectedLitigioIds, setSelectedLitigioIds] = useState<number[]>([]);
  const [filters, setFilters] = useState({
    request_id: undefined as number | undefined,
    work_note_number: undefined as number | undefined,
    client: '',
    responsible_id: canViewAll ? (undefined as number | undefined) : (userId ?? undefined),
    page: 1,
    per_page: 20,
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, per_page: 20 });
  const [syncForm] = Form.useForm();
  const [liquidateForm] = Form.useForm();

  useEffect(() => {
    if (!canViewAll && userId) {
      setFilters((prev) => ({ ...prev, responsible_id: userId }));
    }
  }, [canViewAll, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await getPendingLiquidation({
        ...filters,
        request_id: filters.request_id || undefined,
        work_note_number: filters.work_note_number || undefined,
        client: filters.client || undefined,
        responsible_id: canViewAll ? filters.responsible_id || undefined : userId || undefined,
      });
      setData(response.data);
      setPagination({
        total: response.total,
        page: response.page,
        per_page: response.per_page,
      });
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al cargar pendientes de liquidación');
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

  useEffect(() => {
    setEntitiesLoading(true);
    getCheckEntities()
      .then((list) => {
        if (list.length) {
          setEntities(list);
          setEntitiesLoading(false);
        } else {
          return getProcurationEntities()
            .then((res) => {
              const list = Array.isArray(res?.data) ? res.data : [];
              setEntities(list);
            })
            .catch(() => setEntities([]))
            .finally(() => setEntitiesLoading(false));
        }
      })
      .catch(() => {
        getProcurationEntities()
          .then((res) => {
            setEntities(Array.isArray(res?.data) ? res.data : []);
          })
          .catch(() => setEntities([]))
          .finally(() => setEntitiesLoading(false));
      });
  }, []);

  const handleSync = async (values: { anio?: number }) => {
    setSyncLoading(true);
    try {
      const response = await syncPendingLiquidation(values);
      message.success(`Sincronización completada: ${response.synced} de ${response.total_results}`);
      await loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al sincronizar');
    } finally {
      setSyncLoading(false);
    }
  };

  const openLiquidateModal = async (check: CheckRequest) => {
    setSelectedCheck(check);
    setChangeInvoiceData(false);
    setFileList([]);
    setSelectedExpenseIds([]);
    setSelectedLitigioIds([]);
    setInmobiliarioExpenses([]);
    setLitigioExpenses([]);
    const defaultEntityId = entities[0]?.id ?? 12;
    liquidateForm.setFieldsValue({
      entity_id: defaultEntityId,
      codigo_tipo_documento: 'COMP',
      serie_factura: check.document_serie || 'B',
      numero_factura: check.document_number ? String(check.document_number) : '',
      nit_factura: check.invoice_nit || 'CF',
      nombre_factura: check.invoice_name || check.client_name || check.client,
      direccion_factura: check.invoice_adress || 'CIUDAD',
      valor_total: Number(check.total_value),
      descripcion: check.description,

    });
    setLiquidateModalOpen(true);

    // Cargar gastos aceptados (state=1) del cheque en paralelo
    try {
      const [inmoRes, litRes] = await Promise.all([
        getInmobiliarioExpenses({ request_id: check.request_id, state: 1, per_page: 100 }),
        getLitigioExpenses({ request_id: check.request_id, state: 1, per_page: 100 }),
      ]);
      setInmobiliarioExpenses(inmoRes.data);
      setLitigioExpenses(litRes.data);
    } catch {
      // Si falla la carga de gastos, no bloquear la liquidación
    }
  };

  const clearFile = () => {
    setFileList([]);
  };

  const handleLiquidate = async () => {
    if (!selectedCheck) return;

    try {
      const values = await liquidateForm.validateFields();
      setLiquidateLoading(true);

      if (fileList.length) {
        const formData = new FormData();
        Object.entries(values).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            formData.append(key, String(value));
          }
        });
        selectedExpenseIds.forEach((id) => formData.append('expense_ids[]', String(id)));
        selectedLitigioIds.forEach((id) => formData.append('litigio_expense_ids[]', String(id)));
        formData.append('document', fileList[0].originFileObj);
        await liquidateCheck(selectedCheck.request_id, formData);
      } else {
        await liquidateCheck(selectedCheck.request_id, {
          ...values,
          expense_ids: selectedExpenseIds.length ? selectedExpenseIds : undefined,
          litigio_expense_ids: selectedLitigioIds.length ? selectedLitigioIds : undefined,
        });
      }

      message.success('Cheque liquidado correctamente');
      setLiquidateModalOpen(false);
      setSelectedCheck(null);
      setFileList([]);
      await loadData();
    } catch (error: any) {
      const err = error?.response?.data;
      const rawMsg: string = Array.isArray(err?.message)
        ? err.message.join(', ')
        : err?.message || '';

      if (
        rawMsg.toLowerCase().includes('duplicate') ||
        rawMsg.toLowerCase().includes('unique') ||
        rawMsg.toLowerCase().includes('ya existe') ||
        rawMsg.toLowerCase().includes('ya fue utilizado') ||
        rawMsg.toLowerCase().includes('numero_factura') ||
        rawMsg.toLowerCase().includes('numero de comprobante')
      ) {
        message.error(
          'El número de comprobante ya fue utilizado en otra liquidación. Verifique e ingrese un número diferente.',
          6,
        );
      } else if (rawMsg.toLowerCase().includes('monto') || rawMsg.toLowerCase().includes('valor')) {
        message.error(`Error en el monto: ${rawMsg}`, 5);
      } else if (rawMsg.toLowerCase().includes('entidad') || rawMsg.toLowerCase().includes('entity')) {
        message.error(`Error con la entidad seleccionada: ${rawMsg}`, 5);
      } else if (rawMsg) {
        message.error(rawMsg, 5);
      } else {
        message.error('Error al liquidar el cheque. Intente nuevamente.');
      }
    } finally {
      setLiquidateLoading(false);
    }
  };

  return (
    <Card>
      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
        wrap
      >
        <Title level={4} style={{ margin: 0 }}>
          Liquidación de cheques
        </Title>
        <Button onClick={() => loadData()} loading={loading}>
          Recargar
        </Button>
      </Space>

      <Form form={syncForm} layout="inline" onFinish={handleSync} style={{ marginBottom: 12 }}>
        <Form.Item name="anio" label="Año">
          <InputNumber min={2000} max={2100} placeholder="2026" />
        </Form.Item>
        <Form.Item>
          <Button type="dashed" htmlType="submit" loading={syncLoading}>
            Sincronizar desde Sirvo
          </Button>
        </Form.Item>
      </Form>

      <Space style={{ marginBottom: 12 }} wrap>
        <InputNumber
          placeholder="ID de solicitud"
          value={filters.request_id}
          onChange={(value) => setFilters((prev) => ({ ...prev, request_id: value || undefined }))}
          style={{ width: 160 }}
        />
        <InputNumber
          placeholder="Nota de trabajo"
          value={filters.work_note_number}
          onChange={(value) => setFilters((prev) => ({ ...prev, work_note_number: value || undefined }))}
          style={{ width: 160 }}
        />
        <Input
          placeholder="Cliente"
          value={filters.client}
          onChange={(e) => setFilters((prev) => ({ ...prev, client: e.target.value }))}
          style={{ width: 220 }}
        />
        {canViewAll ? (
          <Select<number>
            allowClear
            showSearch
            style={{ width: 280 }}
            placeholder="responsable"
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

      <Table<CheckRequest>
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
          { title: 'Request ID', dataIndex: 'request_id', width: 120 },
          { title: 'NT', dataIndex: 'work_note_number', width: 110 },
          { title: 'Cliente', dataIndex: 'client', width: 110 },
          { title: 'Descripción', dataIndex: 'description', ellipsis: true },
          {
            title: 'Monto',
            dataIndex: 'total_value',
            width: 120,
            render: (value) => Number(value).toFixed(2),
          },
          {
            title: 'Tipo doc',
            dataIndex: 'type_document_code',
            width: 120,
            render: (value: string) => value || '—',
          },
          {
            title: 'Estado',
            width: 160,
            render: () => <Tag color="orange">Pendiente liquidación</Tag>,
          },
          {
            title: 'Acciones',
            width: 130,
            render: (_: unknown, record: CheckRequest) => (
              <Button type="primary" onClick={() => openLiquidateModal(record)}>
                Liquidar
              </Button>
            ),
          },
        ]}
      />

      <Modal
        title="Agregar liquidación"
        open={liquidateModalOpen}
        onCancel={() => {
          setLiquidateModalOpen(false);
          setFileList([]);
          setChangeInvoiceData(false);
          setSelectedExpenseIds([]);
          setSelectedLitigioIds([]);
          setInmobiliarioExpenses([]);
          setLitigioExpenses([]);
        }}
        onOk={handleLiquidate}
        okText="Listo!"
        confirmLoading={liquidateLoading}
        width={640}
        cancelButtonProps={{ style: { background: '#faad14', borderColor: '#faad14', color: '#000' } }}
      >
        <Alert
          type="error"
          message="Las solicitudes no pueden liquidarse con recibo simple a excepción que tenga sello de la entidad que lo emite."
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={liquidateForm} layout="vertical">
          <Form.Item label="Id de la solicitud">
            <Input value={selectedCheck?.request_id} readOnly disabled />
          </Form.Item>
          <Form.Item name="codigo_tipo_documento" label="Código tipo documento" rules={[{ required: true }]}>
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="numero_factura"
            label="Número de comprobante"
            rules={[{ required: true }]}
            extra="Solo números, sin letras ni símbolos."
          >
            <Input
              maxLength={20}
              onInput={(e) => {
                const t = (e.target as HTMLInputElement).value;
                (e.target as HTMLInputElement).value = t.replace(/[^0-9]/g, '');
              }}
            />
          </Form.Item>
          <Form.Item name="serie_factura" label="Serie">
            <Input />
          </Form.Item>
          <Form.Item
            name="entity_id"
            label="Entidad"
            rules={[{ required: true }]}
            extra={entities.length === 0 && !entitiesLoading ? 'No se cargaron entidades. Ingrese el ID de entidad (ej: 12).' : undefined}
          >
            {entities.length > 0 ? (
              <Select
                showSearch
                placeholder="Seleccione una entidad"
                optionFilterProp="label"
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
                options={entities.map((e) => ({ value: e.id, label: e.name }))}
                style={{ width: '100%' }}
                notFoundContent="Sin resultados"
              />
            ) : (
              <InputNumber
                min={1}
                style={{ width: '100%' }}
                placeholder={entitiesLoading ? 'Cargando...' : 'ID de entidad (ej: 12)'}
                disabled={entitiesLoading}
              />
            )}
          </Form.Item>
          <Form.Item label="Valor solicitud">
            <InputNumber
              readOnly
              style={{ width: '100%' }}
              value={selectedCheck ? Number(selectedCheck.unit_value) : undefined}
              min={0}
            />
          </Form.Item>
          <Form.Item
            name="valor_total"
            label="Monto a liquidar"
            rules={[{ required: true }]}
            extra="Sin comas. Use punto para decimales (ej: 1500.00)."
          >
            <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item noStyle>
            <Checkbox
              checked={changeInvoiceData}
              onChange={(e) => setChangeInvoiceData(e.target.checked)}
            >
              Cambiar datos de factura
            </Checkbox>
          </Form.Item>
          {changeInvoiceData && (
            <>
              <Form.Item name="nit_factura" label="NIT">
                <Input />
              </Form.Item>
              <Form.Item name="nombre_factura" label="Factura a nombre de">
                <Input />
              </Form.Item>
              <Form.Item name="direccion_factura" label="Dirección factura">
                <Input />
              </Form.Item>
            </>
          )}
          <Form.Item name="descripcion" label="Descripción" rules={[{ required: true }]}>
            <Input.TextArea rows={4} readOnly />
          </Form.Item>
          <Form.Item label="Documento">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Upload
                beforeUpload={() => false}
                fileList={fileList}
                onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
                maxCount={1}
              >
                <Button icon={<UploadOutlined />}>Elija un documento</Button>
              </Upload>
              <Button type="link" size="small" onClick={clearFile} style={{ padding: 0 }}>
                Limpiar
              </Button>
            </Space>
          </Form.Item>
          {inmobiliarioExpenses.length > 0 && (
            <Form.Item label="Gastos inmobiliarios aceptados">
              <Space direction="vertical" style={{ width: '100%' }}>
                {inmobiliarioExpenses.map((exp) => (
                  <Checkbox
                    key={exp.id}
                    checked={selectedExpenseIds.includes(exp.id)}
                    onChange={(e) =>
                      setSelectedExpenseIds((prev) =>
                        e.target.checked ? [...prev, exp.id] : prev.filter((id) => id !== exp.id),
                      )
                    }
                  >
                    Recibo {exp.receipt_number} — Q{Number(exp.receipt_value).toFixed(2)} — {exp.client}
                  </Checkbox>
                ))}
              </Space>
            </Form.Item>
          )}

          {litigioExpenses.length > 0 && (
            <Form.Item label="Gastos litigio aceptados">
              <Space direction="vertical" style={{ width: '100%' }}>
                {litigioExpenses.map((exp) => (
                  <Checkbox
                    key={exp.id}
                    checked={selectedLitigioIds.includes(exp.id)}
                    onChange={(e) =>
                      setSelectedLitigioIds((prev) =>
                        e.target.checked ? [...prev, exp.id] : prev.filter((id) => id !== exp.id),
                      )
                    }
                  >
                    Recibo {exp.receipt_number} — Q{Number(exp.receipt_value).toFixed(2)} — {exp.client}
                  </Checkbox>
                ))}
              </Space>
            </Form.Item>
          )}


        </Form>
      </Modal>
    </Card>
  );
}

export default LiquidacionCheque;
