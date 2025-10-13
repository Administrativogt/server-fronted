import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Checkbox, Select } from "antd";
import type { HallDto } from "../../api/notifications";

const { Option } = Select;

interface AddProvenienceModalProps {
  open: boolean;
  halls: HallDto[];
  onCancel: () => void;
  onCreate: (name: string, hallName?: string, selectedHalls?: number[]) => Promise<void>;
}

const AddProvenienceModal: React.FC<AddProvenienceModalProps> = ({
  open,
  halls,
  onCancel,
  onCreate,
}) => {
  const [form] = Form.useForm();
  const [includeHall, setIncludeHall] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setIncludeHall(false);
    }
  }, [open, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const name = values.name;
      const hallName = includeHall ? values.hallName : undefined;
      const selectedHalls = values.selectedHalls ?? [];
      await onCreate(name, hallName, selectedHalls);
      form.resetFields();
      setIncludeHall(false);
    } catch {
      // Error de validación, no hacer nada
    }
  };

  return (
    <Modal
      open={open}
      title="Agregar nueva entidad"
      okText="Crear"
      cancelText="Cancelar"
      onCancel={() => {
        form.resetFields();
        setIncludeHall(false);
        onCancel();
      }}
      onOk={handleOk}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Nombre de la entidad"
          name="name"
          rules={[{ required: true, message: "Por favor, ingresa el nombre de la entidad" }]}
        >
          <Input placeholder="Nombre de la entidad" />
        </Form.Item>

        <Form.Item
          label="Asignar salas existentes (opcional)"
          name="selectedHalls"
        >
          <Select mode="multiple" placeholder="Selecciona una o varias salas">
            {halls.map((hall) => (
              <Option key={hall.id} value={hall.id}>
                {hall.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item>
          <Checkbox checked={includeHall} onChange={(e) => setIncludeHall(e.target.checked)}>
            ¿Agregar una nueva sala a esta entidad?
          </Checkbox>
        </Form.Item>

        {includeHall && (
          <Form.Item
            label="Nombre de la sala"
            name="hallName"
            rules={[{ required: true, message: "Ingresa el nombre de la sala" }]}
          >
            <Input placeholder="Ej. Sala 1, Sala Civil, etc." />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default AddProvenienceModal;