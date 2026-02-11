import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Checkbox,
  message,
  Alert,
} from 'antd';
import { resetUserPassword } from '../../api/users';
import type { User } from '../../types/user.types';

interface ResetPasswordModalProps {
  open: boolean;
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ open, user, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      await resetUserPassword(user.id, values.password, values.forceChange || false);
      message.success('Contraseña reseteada exitosamente');
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || 'Error al resetear contraseña';
      message.error(errorMsg);
      console.error(error);
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
      title={`Resetear Contraseña: ${user.username}`}
      open={open}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Resetear Contraseña"
      cancelText="Cancelar"
    >
      <Alert
        message="Advertencia"
        description={`Estás a punto de cambiar la contraseña de ${user.first_name} ${user.last_name} (${user.username})`}
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ forceChange: false }}
      >
        <Form.Item
          name="password"
          label="Nueva Contraseña"
          rules={[
            { required: true, message: 'Contraseña es requerida' },
            { min: 8, message: 'La contraseña debe tener al menos 8 caracteres' },
          ]}
        >
          <Input.Password placeholder="Nueva contraseña segura" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirmar Contraseña"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Por favor confirma la contraseña' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Las contraseñas no coinciden'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="Confirmar contraseña" />
        </Form.Item>

        <Form.Item name="forceChange" valuePropName="checked">
          <Checkbox>
            Forzar cambio de contraseña en el próximo inicio de sesión
          </Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ResetPasswordModal;
