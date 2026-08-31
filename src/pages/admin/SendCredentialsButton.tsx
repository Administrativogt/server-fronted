// src/pages/admin/SendCredentialsButton.tsx
import React, { useEffect, useState } from 'react';
import { Button, Modal, Select, Space, Typography, Alert, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import useAuthStore from '../../auth/useAuthStore';
import { sendCredentialsToUser } from '../../api/auth';
import { fetchUsers, fullName, type UserLite } from '../../api/users';

const { Text } = Typography;

/**
 * Reinicio de credenciales: busca UN usuario y le envía el correo con su
 * username + enlace firmado para crear su contraseña. Solo superusuarios
 * (el backend también lo exige, y solo acepta cuentas activas con correo).
 */
const SendCredentialsButton: React.FC = () => {
  const isSuperuser = useAuthStore((s) => s.is_superuser);

  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || users.length) return;
    setUsersLoading(true);
    fetchUsers()
      .then((data) => setUsers(data.filter((u) => u.estado === 1)))
      .catch(() => message.error('Error al cargar usuarios'))
      .finally(() => setUsersLoading(false));
  }, [open, users.length]);

  if (!isSuperuser) return null;

  const selectedUser = users.find((u) => u.username === selected);

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    try {
      const result = await sendCredentialsToUser(selected);
      message.success(
        `Correo de reinicio enviado a ${result.username} (${result.email})`,
      );
      setSelected(undefined);
      setOpen(false);
    } catch (e: any) {
      message.error(
        e?.response?.data?.message || 'Error al enviar el reinicio de credenciales',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button icon={<MailOutlined />} onClick={() => setOpen(true)}>
        Reinicio de credenciales
      </Button>

      <Modal
        title="Reinicio de credenciales"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={520}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <span>
              El usuario recibirá un correo con su nombre de usuario y un enlace
              para <b>crear su contraseña</b> (válido 14 días). Solo cuentas
              activas con correo registrado.
            </span>
          }
        />

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Select<string>
            showSearch
            allowClear
            placeholder="Buscar usuario por nombre o código"
            style={{ width: '100%' }}
            loading={usersLoading}
            value={selected}
            onChange={setSelected}
            optionFilterProp="label"
            options={users.map((u) => ({
              label: `${fullName(u)} (${u.username})`,
              value: u.username,
            }))}
          />

          {selectedUser && (
            <Text type="secondary">
              Se enviará a: <Text strong>{selectedUser.email || 'sin correo registrado'}</Text>
            </Text>
          )}

          <Button
            type="primary"
            icon={<MailOutlined />}
            block
            disabled={!selected}
            loading={sending}
            onClick={handleSend}
          >
            Enviar reinicio
          </Button>
        </Space>
      </Modal>
    </>
  );
};

export default SendCredentialsButton;
