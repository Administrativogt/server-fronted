import React, { useState } from "react";
import { Modal, Form, Input, Checkbox, message } from "antd";
import { createProvenience, type ProvenienceDto } from "../../api/notifications";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (prov: ProvenienceDto) => void; // devolvemos la entidad creada para seleccionarla
}

const AddProvenienceModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [form] = Form.useForm();
  const [includeHall, setIncludeHall] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleOk = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();
      const payload: { name: string; hallName?: string } = {
        name: values.name,
        ...(includeHall && values.hallName ? { hallName: values.hallName } : {}),
      };
      const created = await createProvenience(payload);
      message.success("Entidad creada correctamente");
      form.resetFields();
      setIncludeHall(false);
      onCreated(created);
      onClose();
    } catch {
      message.error("No se pudo crear la entidad");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Agregar entidad"
      open={open}
      onOk={handleOk}
      confirmLoading={submitting}
      okText="Crear"
      cancelText="Cancelar"
      onCancel={() => {
        form.resetFields();
        setIncludeHall(false);
        onClose();
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Nombre de la entidad"
          rules={[{ required: true, message: "Ingrese el nombre de la entidad" }]}
        >
          <Input placeholder="Ej. Corte Suprema de Justicia" />
        </Form.Item>

        <Checkbox
          checked={includeHall}
          onChange={({ target }) => setIncludeHall(target.checked)}
          style={{ marginBottom: 8 }}
        >
          Incluir primera sala/oficina
        </Checkbox>

        {includeHall && (
          <Form.Item
            name="hallName"
            label="Nombre de sala/oficina"
            rules={[{ required: true, message: "Ingrese el nombre de la sala" }]}
          >
            <Input placeholder="Ej. Sala Primera de Apelaciones" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default AddProvenienceModal; 