import React, { useEffect, useState } from "react";
import { Modal, Select, message } from "antd";
import { fetchUsers, deliverNotifications } from "../../api/notifications";
import type { User } from "../../types/user.types";

const { Option } = Select;

interface Props {
  open: boolean;
  onClose: () => void;
  selectedIds: number[];
  onSuccess: () => void;
}

const NotificationActions: React.FC<Props> = ({ open, onClose, selectedIds, onSuccess }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers()
        .then(setUsers)
        .catch(() => {
          message.error("Error al cargar usuarios");
        });
    }
  }, [open]);

  const handleDeliver = async () => {
    if (!selectedUser) {
      message.warning("Selecciona a quién entregar");
      return;
    }

    setLoading(true);
    try {
      await deliverNotifications({
        ids: selectedIds,
        action: 1,
        deliverTo: selectedUser,
      });
      message.success("Notificaciones entregadas con éxito");
      setSelectedUser(null);
      onSuccess();
    } catch {
      message.error("Error al entregar");
    } finally {
      setLoading(false);
    }
  };

  const filterOption = (input: string, option?: { children?: React.ReactNode }) => {
    const label = option?.children;
    return typeof label === "string" && label.toLowerCase().includes(input.toLowerCase());
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        setSelectedUser(null);
        onClose();
      }}
      onOk={handleDeliver}
      confirmLoading={loading}
      okText="Entregar"
      cancelText="Cancelar"
      title="Entregar notificaciones seleccionadas"
    >
      <p>Selecciona el usuario al que se entregan:</p>
      <Select
        style={{ width: "100%" }}
        placeholder="Selecciona un usuario"
        onChange={(val) => setSelectedUser(val)}
        value={selectedUser ?? undefined}
        showSearch
        filterOption={filterOption}
      >
        {users.map((user) => (
          <Option key={user.id} value={user.id}>
            {user.first_name} {user.last_name}
          </Option>
        ))}
      </Select>
    </Modal>
  );
};

export default NotificationActions;
