import React from 'react';
import { Button, Space, message } from 'antd';
import { applyActionToDocuments } from "../../api/documents";

interface Props {
  selectedIds: number[];
  onSuccess: () => void;
}

const DocumentActions: React.FC<Props> = ({ selectedIds, onSuccess }) => {
  const handleAction = async (action: 1 | 2 | 3) => {
    try {
      await applyActionToDocuments(action, selectedIds);
      message.success('Acción aplicada correctamente');
      onSuccess();
    } catch (err) {
      message.error('Error al aplicar acción');
    }
  };

  return (
    <Space>
      <Button type="primary" disabled={!selectedIds.length} onClick={() => handleAction(1)}>
        ✅ Aceptar
      </Button>
      <Button danger disabled={!selectedIds.length} onClick={() => handleAction(2)}>
        ❌ Rechazar
      </Button>
      <Button disabled={!selectedIds.length} onClick={() => handleAction(3)}>
        🤔 Seleccionar algunos
      </Button>
    </Space>
  );
};

export default DocumentActions;
