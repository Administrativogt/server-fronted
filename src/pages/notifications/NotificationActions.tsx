import React from "react";
import { Button, Space, message } from "antd";
import { applyActionToNotifications } from "../../api/notifications";

interface Props {
  selectedIds: number[];
  onSuccess: () => void;
}

const NotificationActions: React.FC<Props> = ({ selectedIds, onSuccess }) => {
  const handleAction = async (action: 1 | 2 | 3) => {
    try {
      await applyActionToNotifications(action, selectedIds);
      message.success("Acción aplicada correctamente");
      onSuccess();
    } catch {
      message.error("Error al aplicar acción");
    }
  };

  return (
    <Space>
      <Button
        type="primary"
        disabled={!selectedIds.length}
        onClick={() => handleAction(1)}
      >
        ✅ Aceptar
      </Button>
      <Button
        danger
        disabled={!selectedIds.length}
        onClick={() => handleAction(2)}
      >
        ❌ Rechazar
      </Button>
      <Button
        disabled={!selectedIds.length}
        onClick={() => handleAction(3)}
      >
        🤔 Seleccionar algunos
      </Button>
    </Space>
  );
};

export default NotificationActions;
