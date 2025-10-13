import React, { useEffect, useState } from "react";
import { Modal, Select, message } from "antd";
import { fetchReceivers, deliverNotifications } from "../../api/notifications";

const { Option } = Select;

interface Props {
  open: boolean;
  onClose: () => void;
  selectedIds: number[];
  onSuccess: () => void;
}

const NotificationActions: React.FC<Props> = ({ open, onClose, selectedIds, onSuccess }) => {
  const [users, setUsers] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchReceivers()
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
      onSuccess();
    } catch {
      message.error("Error al entregar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
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