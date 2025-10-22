import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Button,
  message,
  Card,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import type { CashReceipt } from '../../api/cashReceipts';
import cashReceiptsApi from '../../api/cashReceipts';

type EditarReciboProps =
  | {
      mode: 'modal';
      open: boolean;
      onClose: () => void;
      reciboId: number | null;
      onUpdated: () => void;
    }
  | {
      mode: 'page';
    };

const EditarRecibo: React.FC<EditarReciboProps> = (props) => {
  const [form] = Form.useForm<Partial<CashReceipt>>();
  const [loading, setLoading] = useState(false);

  const params = useParams();
  const navigate = useNavigate();

  const reciboId =
    props.mode === 'modal'
      ? props.reciboId
      : params.id
      ? Number(params.id)
      : null;

  const fetchRecibo = async () => {
    if (!reciboId) return;
    setLoading(true);
    try {
      const { data } = await cashReceiptsApi.getById(reciboId);
      form.setFieldsValue({
        serie: data.serie,
        correlative: data.correlative,
        received_from: data.received_from,
        concept: data.concept,
        bill_number: data.bill_number,
        work_note_number: data.work_note_number,
        iva_exemption: data.iva_exemption,
        amount: Number(data.amount),
      });
    } catch {
      message.error('Error al cargar recibo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reciboId) fetchRecibo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reciboId]);

  const handleSubmit = async (values: Partial<CashReceipt>) => {
    if (!reciboId) return;
    try {
      const payload = {
        ...values,
        amount: values.amount?.toString() ?? '0',
      };
      await cashReceiptsApi.update(reciboId, payload);
      message.success('Recibo actualizado correctamente');

      if (props.mode === 'modal') {
        props.onUpdated();
        props.onClose();
      } else {
        navigate('/dashboard/recibos/listar');
      }
    } catch {
      message.error('Error al actualizar el recibo');
    }
  };

  const formContent = (
    <Form
      form={form}
      layout="horizontal"
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 14 }}
      onFinish={handleSubmit}
    >
      <Form.Item name="serie" label="Serie">
        <Input disabled />
      </Form.Item>

      <Form.Item name="correlative" label="Correlativo">
        <Input disabled />
      </Form.Item>

      <Form.Item
        name="received_from"
        label="Recibimos de"
        rules={[{ required: true, message: 'Campo obligatorio' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="concept"
        label="Concepto"
        rules={[{ required: true, message: 'Campo obligatorio' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item name="bill_number" label="Factura No.">
        <Input />
      </Form.Item>

      <Form.Item name="work_note_number" label="Nota de trabajo No.">
        <Input />
      </Form.Item>

      <Form.Item name="iva_exemption" label="Exención de IVA">
        <Input />
      </Form.Item>

      <Form.Item
        name="amount"
        label="La cantidad de"
        rules={[{ required: true, message: 'Debe ingresar un monto' }]}
      >
        <InputNumber style={{ width: '100%' }} min={0} />
      </Form.Item>

      <Form.Item wrapperCol={{ span: 14, offset: 6 }}>
        {props.mode === 'modal' ? (
          <>
            <Button onClick={props.onClose} style={{ marginRight: 8 }}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Guardar
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => navigate('/dashboard/recibos/listar')}
              style={{ marginRight: 8 }}
            >
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Guardar
            </Button>
          </>
        )}
      </Form.Item>
    </Form>
  );

  if (props.mode === 'modal') {
    return (
      <Modal
        title="Editar Recibo"
        open={props.open}
        onCancel={props.onClose}
        footer={null}
        destroyOnClose
      >
        {formContent}
      </Modal>
    );
  }

  return <Card title="Editar Recibo">{formContent}</Card>;
};

export default EditarRecibo;