import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Button,
  DatePicker,
  Modal,
  Radio,
  Card,
  Row,
  Col,
  Table,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import type { CashReceipt, Check } from '../../api/cashReceipts';
import cashReceiptsApi from '../../api/cashReceipts';
import useAuthStore from '../../auth/useAuthStore';

// Tipo del formulario
type CashReceiptForm = Omit<CashReceipt, 'id' | 'checks' | 'creator' | 'date'> & {
  date: Dayjs;
};

const CrearRecibo: React.FC = () => {
  const [form] = Form.useForm<CashReceiptForm>();
  const navigate = useNavigate();

  const username = useAuthStore((s) => s.username); // usuario actual

  const [currency, setCurrency] = useState<number>(1);
  const [showCurrencyModal, setShowCurrencyModal] = useState(true);
  const [checks, setChecks] = useState<Check[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm] = Form.useForm<Omit<Check, 'id'>>();
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Serie visual (solo para mostrar, no se envía al backend)
  const [serie, setSerie] = useState<string>('A');
  const [correlative, setCorrelative] = useState<string>('');

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const { data } = await cashReceiptsApi.getNextCorrelative();
      setSerie(data.serie_letter);
      setCorrelative(data.correlative);
    } catch {
      setSerie('-');
      setCorrelative('----');
      message.warning('No fue posible obtener serie/correlativo en este momento');
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddPayment = (values: Omit<Check, 'id'>) => {
    setChecks((prev) => [...prev, values]);
    setShowPaymentModal(false);
    paymentForm.resetFields();
  };

  const handleSubmit = async (values: CashReceiptForm) => {
    try {
      // 🧹 limpiar valores numéricos
      const cleanedChecks = checks.map((c) => ({
        number: c.number,
        bank: c.bank,
        value: Number(String(c.value).replace(/[^0-9.]/g, '')),
      }));

      const totalAmount = cleanedChecks.reduce((sum, c) => sum + c.value, 0);

      // 🧾 payload sin serie/correlative
      const payload = {
        date: values.date.format('YYYY-MM-DD'),
        received_from: values.received_from,
        concept: values.concept,
        bill_number: values.bill_number,
        work_note_number: values.work_note_number,
        iva_exemption: values.iva_exemption,
        currency,
        amount: totalAmount,
        active: true,
        checks: cleanedChecks,
      };

      console.log('📦 Payload enviado:', payload);

      await cashReceiptsApi.create(payload);
      message.success(`✅ Recibo creado correctamente por ${username}`);
      navigate('/dashboard/recibos/listar');
    } catch (err) {
      console.error('❌ Error al crear recibo:', err);
      message.error('Error al crear el recibo');
    }
  };

  const currencySymbol = currency === 1 ? 'Q.' : currency === 2 ? '$' : '€';

  return (
    <>
      {/* Modal de tipo de moneda */}
      <Modal
        title="Tipo de moneda del recibo"
        open={showCurrencyModal}
        closable={false}
        footer={[
          <Button key="ok" type="primary" onClick={() => setShowCurrencyModal(false)}>
            Listo
          </Button>,
        ]}
      >
        <p>Elegí el tipo de moneda que tendrá el recibo:</p>
        <Radio.Group value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <Radio value={1}>Quetzales (Q.)</Radio>
          <Radio value={2}>Dólares ($)</Radio>
          <Radio value={3}>Euros (€)</Radio>
        </Radio.Group>
      </Modal>

      {/* Formulario principal */}
      <Card title="Crear Recibo de Caja" bordered={false}>
        <Form<CashReceiptForm>
          form={form}
          layout="horizontal"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 14 }}
          onFinish={handleSubmit}
          initialValues={{
            date: dayjs(),
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="date" label="Fecha" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Serie">
                <Input
                  value={loadingPreview ? '...' : serie}
                  disabled
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Correlativo">
                <Input
                  value={loadingPreview ? '...' : correlative}
                  disabled
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="received_from"
            label="Recibimos de"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Formas de pago">
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => setShowPaymentModal(true)}
            >
              Agregar forma de pago
            </Button>
          </Form.Item>

          {/* Tabla de pagos */}
          <Table
            dataSource={checks}
            rowKey={(r) => `${r.number}-${r.bank}`}
            pagination={false}
            size="small"
            columns={[
              { title: 'Cheque No.', dataIndex: 'number' },
              { title: 'Banco', dataIndex: 'bank' },
              {
                title: 'Valor',
                dataIndex: 'value',
                render: (val: number) =>
                  `${currencySymbol} ${Number(val).toLocaleString()}`,
              },
            ]}
          />

          <Form.Item name="concept" label="Por concepto de" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="bill_number" label="Factura No.">
            <Input />
          </Form.Item>
          <Form.Item name="work_note_number" label="Nota de Trabajo No.">
            <Input />
          </Form.Item>
          <Form.Item name="iva_exemption" label="Exención de IVA">
            <Input />
          </Form.Item>

          <Form.Item wrapperCol={{ span: 14, offset: 6 }}>
            <Button
              style={{ marginRight: 8 }}
              onClick={() => navigate('/dashboard/recibos/listar')}
            >
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              Crear
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Modal agregar cheque */}
      <Modal
        title={`Agregar ${currencySymbol} - Forma de pago`}
        open={showPaymentModal}
        onCancel={() => setShowPaymentModal(false)}
        footer={null}
      >
        <Form<Omit<Check, 'id'>> form={paymentForm} layout="vertical" onFinish={handleAddPayment}>
          <Form.Item name="number" label="Cheque No." rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="bank" label="Banco" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="value" label="Valor" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button onClick={() => setShowPaymentModal(false)} style={{ marginRight: 8 }}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              Crear
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default CrearRecibo;