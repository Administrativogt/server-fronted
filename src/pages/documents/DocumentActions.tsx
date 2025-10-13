// src/pages/documents/DocumentActions.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Checkbox, Input, message } from 'antd';
import api from '../../api/axios';

const { Option } = Select;

interface DocumentActionsProps {
  visible: boolean;
  onClose: () => void;
  selectedIds: number[];        // IDs de documentos seleccionados para entregar
  onSuccess: () => void;         // callback para refrescar tabla
}

const DocumentActions: React.FC<DocumentActionsProps> = ({
  visible,
  onClose,
  selectedIds,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState<any[]>([]);
  const [otroDeliverTo, setOtroDeliverTo] = useState(false);
  const [observacionesEnabled, setObservacionesEnabled] = useState(false);

  useEffect(() => {
    // Cargar los usuarios destinatarios posibles (secretarias/admins)
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users?role=admin_or_secretary');
        setUsers(res.data);
      } catch (err) {
        console.error(err);
        message.error('Error cargando usuarios para entrega');
      }
    };
    fetchUsers();
  }, []);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const body: any = {
        documentsSelected: selectedIds,
        deliver_to: otroDeliverTo ? values.deliverToOther : values.deliverTo,
      };
      if (observacionesEnabled) {
        body.observations = values.observations;
      }

      // Llamada al backend PATCH /documents/deliver/1
      await api.patch('/documents/deliver/1', body);
      message.success('Documentos entregados correctamente');
      form.resetFields();
      setOtroDeliverTo(false);
      setObservacionesEnabled(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      message.error(err?.response?.data?.message ?? 'Error al entregar documentos');
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setOtroDeliverTo(false);
    setObservacionesEnabled(false);
    onClose();
  };

  return (
    <Modal
      title="Entregar documento(s)"
      visible={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Entregar"
      cancelText="Cancelar"
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Entregar a"
          name="deliverTo"
          rules={[{ required: !otroDeliverTo, message: 'Selecciona quién recibiría' }]}
        >
          <Select placeholder="Seleccione usuario" disabled={otroDeliverTo} showSearch>
            {users.map((u) => (
              <Option key={u.id} value={u.id}>
                {u.first_name} {u.last_name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {otroDeliverTo && (
          <Form.Item
            name="deliverToOther"
            label="Otro destino"
            rules={[{ required: true, message: 'Ingresa nombre' }]}
          >
            <Input placeholder="Nombre destino" />
          </Form.Item>
        )}

        <Checkbox
          checked={otroDeliverTo}
          onChange={(e) => setOtroDeliverTo(e.target.checked)}
        >
          Otro
        </Checkbox>

        <Form.Item style={{ marginTop: 16 }}>
          <Checkbox
            checked={observacionesEnabled}
            onChange={(e) => setObservacionesEnabled(e.target.checked)}
          >
            Observaciones
          </Checkbox>
        </Form.Item>

        {observacionesEnabled && (
          <Form.Item
            name="observations"
            label="Observaciones"
            rules={[{ required: false }]}
          >
            <Input.TextArea rows={3} placeholder="Ingrese observaciones" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default DocumentActions;