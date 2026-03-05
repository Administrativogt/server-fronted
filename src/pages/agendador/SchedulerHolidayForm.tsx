import React, { useState } from 'react';
import { App as AntdApp, Button, Card, Checkbox, DatePicker, Form, Input, Space } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { createHoliday } from '../../api/agendador';

const SchedulerHolidayForm: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await createHoliday({
        name: values.name,
        date: values.date.format('YYYY-MM-DD'),
        is_repetitive: !!values.is_repetitive,
      });
      message.success('Feriado creado');
      navigate('/dashboard/agendador/feriados');
    } catch (e: any) {
      message.error(e.response?.data?.message || 'No se pudo crear feriado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="Crear feriado"
      extra={(
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard/agendador/feriados')}>
          Volver
        </Button>
      )}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="name"
          label="Nombre del feriado"
          rules={[{ required: true, message: 'Requerido' }]}
        >
          <Input placeholder="Ej: Año Nuevo" />
        </Form.Item>
        <Form.Item
          name="date"
          label="Fecha del feriado"
          rules={[{ required: true, message: 'Requerido' }]}
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item name="is_repetitive" valuePropName="checked">
          <Checkbox>¿Es repetitivo?</Checkbox>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={loading}>
              Guardar
            </Button>
            <Button onClick={() => navigate('/dashboard/agendador/feriados')}>Cancelar</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SchedulerHolidayForm;
