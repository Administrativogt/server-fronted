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
  Select,
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
  const [paymentType, setPaymentType] = useState<'cheque' | 'efectivo'>('cheque');
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [isSuperuser, setIsSuperuser] = useState(false);
  const [serie, setSerie] = useState<string>('');
  const [serieNumber, setSerieNumber] = useState<number | undefined>(undefined);
  const [correlative, setCorrelative] = useState<string>('');

  const SERIES_OPTIONS = [
    { label: 'A', value: 1 },
    { label: 'B', value: 2 },
    { label: 'C', value: 3 },
    { label: 'D', value: 4 },
    { label: 'E', value: 5 },
  ];

  const loadPreview = async (serieOverride?: number) => {
    setLoadingPreview(true);
    try {
      const { data } = await cashReceiptsApi.getNextCorrelative(serieOverride);
      if (data.is_superuser && serieOverride === undefined) {
        setIsSuperuser(true);
        setSerie('');
        setCorrelative('');
      } else {
        setIsSuperuser(data.is_superuser ?? false);
        setSerie(data.serie_letter);
        setCorrelative(data.correlative);
      }
    } catch {
      setSerie('-');
      setCorrelative('----');
      message.warning('No fue posible obtener serie/correlativo en este momento');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSerieChange = (value: number) => {
    setSerieNumber(value);
    loadPreview(value);
  };

  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddPayment = (values: Omit<Check, 'id'>) => {
    const finalValues = paymentType === 'efectivo'
      ? { ...values, number: '-', bank: 'Efectivo' }
      : values;
    setChecks((prev) => [...prev, finalValues]);
    setShowPaymentModal(false);
    paymentForm.resetFields();
    setPaymentType('cheque');
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

      if (isSuperuser && !serieNumber) {
        message.error('Debes seleccionar una serie');
        return;
      }

      const payload: Record<string, unknown> = {
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
        ...(isSuperuser && serieNumber ? { serie: serieNumber } : {}),
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
        </Radio.Group>
      </Modal>

      {/* Formulario principal */}
      <Card bordered={false}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, marginBottom: 24 }}>
          Crear recibo de caja
        </h2>

        {/* Tabla de pagos */}
        <Table
          dataSource={checks}
          rowKey={(r) => `${r.number}-${r.bank}`}
          pagination={false}
          size="small"
          style={{ marginBottom: 24 }}
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

        <Form<CashReceiptForm>
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ date: dayjs() }}
        >
          <Form.Item name="date" label="Fecha" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Serie">
                {isSuperuser ? (
                  <Select
                    placeholder="Seleccionar serie"
                    value={serieNumber}
                    onChange={handleSerieChange}
                    loading={loadingPreview}
                    options={SERIES_OPTIONS}
                  />
                ) : (
                  <Input value={loadingPreview ? '...' : serie} disabled />
                )}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Correlativo"
                help={isSuperuser && !correlative && !loadingPreview ? 'Selecciona una serie primero' : undefined}
              >
                <Input value={loadingPreview ? '...' : (correlative || '—')} disabled />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="received_from" label="Recibimos de" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item label="La cantidad de">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowPaymentModal(true)}
            >
              Agregar forma de pago
            </Button>
          </Form.Item>

          <Form.Item label="">
            <InputNumber
              value={checks.reduce((sum, c) => sum + Number(c.value), 0)}
              disabled
              style={{ width: '100%' }}
              addonBefore={currencySymbol}
            />
          </Form.Item>

          <Form.Item name="concept" label="Por concepto de" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="bill_number" label="Factura No.">
            <Input />
          </Form.Item>
          <Form.Item name="work_note_number" label="Nota de Trabajo No.">
            <Input />
          </Form.Item>
          <Form.Item name="iva_exemption" label="Exención de IVA:">
            <Input />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right' }}>
            <Button
              style={{ marginRight: 8, backgroundColor: '#faad14', borderColor: '#faad14', color: '#fff' }}
              onClick={() => navigate('/dashboard/recibos/listar')}
            >
              Cancelar
            </Button>
            <Button
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
              htmlType="submit"
            >
              Crear
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Modal agregar cheque */}
      <Modal
        title="Agregar cheques"
        open={showPaymentModal}
        onCancel={() => { setShowPaymentModal(false); setPaymentType('cheque'); paymentForm.resetFields(); }}
        footer={null}
      >
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span>Tipo de moneda elegido: <strong>{currency === 1 ? 'Quetzales' : 'Dólares'}</strong></span>
          <br />
          <a onClick={() => { setShowPaymentModal(false); setShowCurrencyModal(true); }}>Cambiar</a>
        </div>

        <Radio.Group
          value={paymentType}
          onChange={(e) => {
            setPaymentType(e.target.value);
            if (e.target.value === 'efectivo') {
              paymentForm.setFieldValue('bank', 'Efectivo');
              paymentForm.setFieldValue('number', undefined);
            } else {
              paymentForm.setFieldValue('bank', undefined);
            }
          }}
          style={{ marginBottom: 16 }}
        >
          <Radio value="cheque">Cheque</Radio>
          <Radio value="efectivo">Efectivo</Radio>
        </Radio.Group>

        <Form<Omit<Check, 'id'>> form={paymentForm} layout="vertical" onFinish={handleAddPayment}>
          {paymentType === 'cheque' && (
            <Form.Item name="number" label="Cheque No." rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          )}
          <Form.Item name="bank" label="Banco" rules={paymentType === 'cheque' ? [{ required: true }] : []}>
            <Input value={paymentType === 'efectivo' ? 'Efectivo' : undefined} disabled={paymentType === 'efectivo'} placeholder={paymentType === 'efectivo' ? 'Efectivo' : ''} />
          </Form.Item>
          <Form.Item name="value" label="Valor" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button onClick={() => { setShowPaymentModal(false); setPaymentType('cheque'); paymentForm.resetFields(); }} style={{ marginRight: 8 }}>
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