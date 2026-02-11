import React, { useState, useEffect } from "react";
import { Modal, Form, Select, Checkbox, Input, message } from "antd";
import { fetchUsers, deliverDocuments } from "../../api/documents";
import type { User } from "../../types/user.types";

interface DocumentActionsProps {
  visible: boolean;
  onClose: () => void;
  selectedIds: number[];
  onSuccess: () => void;
}

const DocumentActions: React.FC<DocumentActionsProps> = ({
  visible,
  onClose,
  selectedIds,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState<User[]>([]);
  const [otroDeliverTo, setOtroDeliverTo] = useState(false);
  const [observacionesEnabled, setObservacionesEnabled] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchUsers()
        .then(setUsers)
        .catch((err) => {
          console.error(err);
          message.error("Error cargando usuarios para entrega");
        });
    }
  }, [visible]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const deliverTo = otroDeliverTo
        ? String(values.deliverToOther)
        : String(values.deliverTo);

      await deliverDocuments({
        ids: selectedIds,
        action: 1,
        deliverTo,
        observations: observacionesEnabled ? values.observations : undefined,
      });

      message.success("Documentos entregados correctamente");
      form.resetFields();
      setOtroDeliverTo(false);
      setObservacionesEnabled(false);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error(err);
      message.error(error?.response?.data?.message ?? "Error al entregar documentos");
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
      open={visible}
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
          rules={[{ required: !otroDeliverTo, message: "Selecciona quién recibiría" }]}
        >
          <Select
            placeholder="Escribe para buscar..."
            disabled={otroDeliverTo}
            showSearch
            optionFilterProp="label"
            options={users.map((u) => ({
              value: u.id,
              label: `${u.first_name} ${u.last_name}`,
            }))}
          />
        </Form.Item>

        {otroDeliverTo && (
          <Form.Item
            name="deliverToOther"
            label="Otro destino"
            rules={[{ required: true, message: "Ingresa nombre" }]}
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
