import React from 'react';
import { Form, Input, InputNumber, Button, message } from 'antd';
import type { Check } from '../../api/cashReceipts';

interface AgregarChequeProps {
  onAdded: (check: Omit<Check, 'id'>) => void;
}

const AgregarCheque: React.FC<AgregarChequeProps> = ({ onAdded }) => {
  const [form] = Form.useForm();

  const handleSubmit = async (values: Omit<Check, 'id'>) => {
    try {
      onAdded(values);
      message.success('Cheque agregado');
      form.resetFields();
    } catch {
      message.error('Error al agregar cheque');
    }
  };

  return (
    <Form
      form={form}
      layout="inline"
      onFinish={handleSubmit}
      style={{ marginTop: 16 }}
    >
      <Form.Item
        name="number"
        rules={[{ required: true, message: 'Número requerido' }]}
      >
        <Input placeholder="Número de cheque" />
      </Form.Item>
      <Form.Item
        name="bank"
        rules={[{ required: true, message: 'Banco requerido' }]}
      >
        <Input placeholder="Banco" />
      </Form.Item>
      <Form.Item
        name="value"
        rules={[{ required: true, message: 'Monto requerido' }]}
      >
        <InputNumber placeholder="Valor" />
      </Form.Item>
      <Button type="primary" htmlType="submit">
        Agregar
      </Button>
    </Form>
  );
};

export default AgregarCheque;