import React, { useEffect, useState } from 'react';
import { Card, Form, Input, DatePicker, Button, Space, Row, Col, Select, App as AntdApp } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { createInstallment, getProcessTypes } from '../../api/agendador';
import type { ProcessType } from '../../types/agendador.types';

const SchedulerForm: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState<ProcessType[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getProcessTypes();
        setTypes(res || []);
      } catch {
        setTypes([]);
      }
    })();
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await createInstallment({
        expedient_number: values.expedient_number,
        start_date: values.start_date.format('YYYY-MM-DD'),
        client: values.client,
        process_type_id: values.process_type_id,
      });
      message.success('Plazo creado');
      navigate('/dashboard/agendador');
    } catch (e: any) {
      message.error(e.response?.data?.message || 'No se pudo crear el plazo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="Creación de plazo"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard/agendador')}>
          Volver
        </Button>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="expedient_number"
              label="Número de expediente"
              rules={[{ required: true, message: 'Requerido' }]}
            >
              <Input placeholder="Ej: EXP-2023-001" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="process_type_id"
              label="Procedimiento"
              rules={[{ required: true, message: 'Requerido' }]}
            >
              <Select
                placeholder="Seleccione procedimiento"
                options={types.map((t) => ({ value: t.id, label: t.name }))}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="start_date"
              label="Fecha de inicio"
              rules={[{ required: true, message: 'Requerido' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="client"
              label="Cliente"
              rules={[{ required: true, message: 'Requerido' }]}
            >
              <Input placeholder="Nombre del Cliente" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item>
          <Space>
            <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={loading}>
              Guardar
            </Button>
            <Button onClick={() => navigate('/dashboard/agendador')}>Cancelar</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SchedulerForm;
