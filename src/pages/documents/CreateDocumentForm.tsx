// src/pages/documents/CreateDocumentForm.tsx
import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Checkbox, Button, message, Row, Col } from 'antd';
import api from '../../api/axios';

const { Option } = Select;

const documentTypes = ['Sobre', 'Folder', 'Cheque', 'Revista'];
const creationPlaces = [
  { id: 1, name: 'DIAGO 6' },
  { id: 2, name: 'Las Margaritas' },
];

const CreateDocumentForm: React.FC = () => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState<any[]>([]);
  const [otroEntregadoPor, setOtroEntregadoPor] = useState(false);
  const [otroDeliverTo, setOtroDeliverTo] = useState(false);
  const [showObservations, setShowObservations] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users?role=admin_or_secretary');
        setUsers(res.data);
      } catch {
        message.error('Error cargando usuarios');
      }
    };

    fetchUsers();
  }, []);

  const onFinish = async (values: any) => {
    const payload = {
      ...values,
      observations: showObservations ? values.observations : undefined,
      documentDeliverBy: otroEntregadoPor ? values.documentDeliverByOther : values.documentDeliverBy,
      deliverTo: otroDeliverTo ? values.deliverToOther : values.deliverTo,
    };

    try {
      await api.post('/documents', payload);
      message.success('Documento creado exitosamente');
      form.resetFields();
      setOtroEntregadoPor(false);
      setOtroDeliverTo(false);
      setShowObservations(false);
    } catch (err: any) {
      message.error('Error al crear documento');
      console.error(err);
    }
  };

  return (
    <Form layout="vertical" form={form} onFinish={onFinish}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Documentos entregados por" name="documentDeliverBy" rules={[{ required: !otroEntregadoPor }]}>
            <Select placeholder="Selecciona persona" disabled={otroEntregadoPor} showSearch>
              {users.map((u) => (
                <Option key={u.id} value={u.id}>{`${u.first_name} ${u.last_name}`}</Option>
              ))}
            </Select>
          </Form.Item>
          {otroEntregadoPor && (
            <Form.Item name="documentDeliverByOther" rules={[{ required: true }]} label="Otro (nombre)">
              <Input placeholder="Nombre de persona" />
            </Form.Item>
          )}
          <Checkbox checked={otroEntregadoPor} onChange={(e) => setOtroEntregadoPor(e.target.checked)}>Otro</Checkbox>
        </Col>

        <Col span={12}>
          <Form.Item label="Tipo de documento" name="documentType" rules={[{ required: true }]}>
            <Select placeholder="Selecciona tipo">
              {documentTypes.map((type) => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Cantidad de documentos" name="amount" rules={[{ required: true }]}>
            <Input type="number" min={1} placeholder="Ej. 1" />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item label="Para entregar a" name="submitTo" rules={[{ required: true }]}>
            <Input placeholder="Ej. Gerencia, DHL, etc." />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Recibido por" name="receivedBy" rules={[{ required: true }]}>
            <Select placeholder="Selecciona persona">
              {users.map((u) => (
                <Option key={u.id} value={u.id}>{`${u.first_name} ${u.last_name}`}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item label="Recibido en" name="creationPlace" rules={[{ required: true }]}>
            <Select placeholder="Selecciona lugar">
              {creationPlaces.map((p) => (
                <Option key={p.id} value={p.id}>{p.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Entregar a" name="deliverTo" rules={[{ required: !otroDeliverTo }]}>
            <Select placeholder="Selecciona persona" disabled={otroDeliverTo} showSearch>
              {users.map((u) => (
                <Option key={u.id} value={u.id}>{`${u.first_name} ${u.last_name}`}</Option>
              ))}
            </Select>
          </Form.Item>
          {otroDeliverTo && (
            <Form.Item name="deliverToOther" rules={[{ required: true }]} label="Otro (nombre)">
              <Input placeholder="Nombre destino" />
            </Form.Item>
          )}
          <Checkbox checked={otroDeliverTo} onChange={(e) => setOtroDeliverTo(e.target.checked)}>Otro</Checkbox>
        </Col>

        <Col span={12}>
          <Checkbox
            checked={showObservations}
            onChange={(e) => setShowObservations(e.target.checked)}
            style={{ marginTop: '30px' }}
          >
            Observaciones
          </Checkbox>
          {showObservations && (
            <Form.Item name="observations" label="Observaciones">
              <Input.TextArea rows={4} placeholder="Observaciones adicionales" />
            </Form.Item>
          )}
        </Col>
      </Row>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          Crear documento
        </Button>
      </Form.Item>
    </Form>
  );
};

export default CreateDocumentForm;