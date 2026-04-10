import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { updateCodigoDirectorio } from '../../api/users';
import type { User } from '../../types/user.types';

interface EditSirvoCodeModalProps {
  open: boolean;
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

const EditSirvoCodeModal: React.FC<EditSirvoCodeModalProps> = ({
  open,
  user,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({ codigo_directorio: user.codigo_directorio || '' });
    }
  }, [open, user, form]);

  const handleSubmit = async (values: { codigo_directorio: string }) => {
    try {
      setLoading(true);
      const codigo = values.codigo_directorio?.trim() || null;
      await updateCodigoDirectorio(user.id, codigo);
      message.success('Código de directorio actualizado exitosamente');
      onSuccess();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || 'Error al actualizar el código';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={`Código de Directorio (Sirvo) — ${user.first_name} ${user.last_name}`}
      open={open}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Guardar"
      cancelText="Cancelar"
      width={420}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="codigo_directorio"
          label="Código de Directorio (Sirvo)"
          extra="Dejar vacío para eliminar el código"
        >
          <Input placeholder="Ej. OLI006" allowClear />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditSirvoCodeModal;
