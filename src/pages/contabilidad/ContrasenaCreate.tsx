import React, { useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Space,
  Table,
  Typography,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { contrasenaApi } from '../../api/accounting';
import type { Factura } from '../../types/accounting.types';

const { Title } = Typography;

export default function ContrasenaCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(false);

  const addFactura = () => {
    setFacturas((prev) => [...prev, { numero: '', fecha: '', valor: '' }]);
  };

  const removeFactura = (index: number) => {
    setFacturas((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFactura = (index: number, field: keyof Factura, value: string) => {
    setFacturas((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)),
    );
  };

  const handleSubmit = async (values: any) => {
    if (!facturas.length) {
      message.warning('Agregue al menos una factura');
      return;
    }
    const hasEmpty = facturas.some((f) => !f.numero || !f.fecha || !f.valor);
    if (hasEmpty) {
      message.warning('Complete todos los campos de las facturas');
      return;
    }
    try {
      setLoading(true);
      await contrasenaApi.create({
        codigo_unico: values.codigo_unico,
        cliente: values.cliente,
        cliente_correo: values.cliente_correo,
        fecha_cancelacion: values.fecha_cancelacion.format('YYYY-MM-DD'),
        facturas,
      });
      message.success('Contraseña de pago creada y email enviado');
      navigate('/dashboard/contabilidad/contrasenas');
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Error al crear contraseña');
    } finally {
      setLoading(false);
    }
  };

  const facturaColumns: ColumnsType<Factura> = [
    {
      title: 'N° Factura',
      dataIndex: 'numero',
      render: (_, __, idx) => (
        <Input
          value={facturas[idx].numero}
          onChange={(e) => updateFactura(idx, 'numero', e.target.value)}
          placeholder="FAC-001"
        />
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      render: (_, __, idx) => (
        <Input
          value={facturas[idx].fecha}
          onChange={(e) => updateFactura(idx, 'fecha', e.target.value)}
          placeholder="DD/MM/YYYY"
        />
      ),
    },
    {
      title: 'Valor',
      dataIndex: 'valor',
      render: (_, __, idx) => (
        <Input
          value={facturas[idx].valor}
          onChange={(e) => updateFactura(idx, 'valor', e.target.value)}
          placeholder="1,000.00"
        />
      ),
    },
    {
      title: '',
      width: 50,
      render: (_, __, idx) => (
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => removeFactura(idx)}
        />
      ),
    },
  ];

  return (
    <Card title="Nueva Contraseña de Pago">
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="codigo_unico"
          label="Código único"
          rules={[{ required: true, message: 'Requerido' }]}
        >
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="cliente"
          label="Cliente / Proveedor"
          rules={[{ required: true, message: 'Requerido' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="cliente_correo"
          label="Correo del cliente (puede separar varios con coma)"
          rules={[{ required: true, message: 'Requerido' }]}
        >
          <Input placeholder="correo@ejemplo.com, otro@ejemplo.com" />
        </Form.Item>

        <Form.Item
          name="fecha_cancelacion"
          label="Fecha de cancelación"
          rules={[{ required: true, message: 'Requerido' }]}
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>

        <Title level={5}>Facturas</Title>
        <Table
          rowKey={(_, idx) => String(idx)}
          dataSource={facturas}
          columns={facturaColumns}
          pagination={false}
          size="small"
          style={{ marginBottom: 12 }}
        />
        <Button icon={<PlusOutlined />} onClick={addFactura} style={{ marginBottom: 24 }}>
          Agregar factura
        </Button>

        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            Crear y enviar email
          </Button>
          <Button onClick={() => navigate('/dashboard/contabilidad/contrasenas')}>
            Cancelar
          </Button>
        </Space>
      </Form>
    </Card>
  );
}
