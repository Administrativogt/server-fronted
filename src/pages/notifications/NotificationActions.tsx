import React, { useEffect, useMemo, useState } from "react";
import { Modal, Select, message } from "antd";
import { fetchUsers, deliverNotifications } from "../../api/notifications";
import type { User } from "../../types/user.types";
import { userSearchFilter } from "../../lib/searchFilter";

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
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (open && !users.length) {
      setLoadingUsers(true);
      fetchUsers()
        .then(setUsers)
        .catch(() => {
          message.error("Error al cargar usuarios");
        })
        .finally(() => setLoadingUsers(false));
    }
  }, [open, users.length]);

  // Etiqueta como string plano: así el filtro de búsqueda sí puede comparar
  // (con children JSX el texto llegaba como arreglo y nunca coincidía).
  const options = useMemo(
    () =>
      users
        .map((u) => ({
          value: u.id,
          label: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.username,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [users],
  );

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

  return (
    <Modal
      open={open}
      destroyOnHidden
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
      <p>Escribe el nombre de la persona a la que se entregan:</p>
      <Select
        style={{ width: "100%" }}
        placeholder="Escribe para buscar…"
        onChange={(val) => setSelectedUser(val)}
        value={selectedUser ?? undefined}
        showSearch
        autoFocus
        allowClear
        loading={loadingUsers}
        filterOption={userSearchFilter}
        options={options}
        notFoundContent={loadingUsers ? "Cargando…" : "Sin coincidencias"}
      />
    </Modal>
  );
};

export default NotificationActions;
