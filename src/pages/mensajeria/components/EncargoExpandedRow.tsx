// src/pages/mensajeria/components/EncargoExpandedRow.tsx
// Detalle expandible de una fila de encargo. Hace visibles (también en móvil,
// donde no hay hover) las observaciones y las razones de rechazo, incidencia,
// reclamo y tardanza que antes solo vivían en tooltips o no se mostraban.
import React from 'react';
import { Descriptions } from 'antd';
import type { Encargo } from '../../../types/encargo';
import { formatHorario } from '../constants';

interface EncargoExpandedRowProps {
  encargo: Encargo;
}

const EncargoExpandedRow: React.FC<EncargoExpandedRowProps> = ({ encargo }) => {
  const horario = formatHorario(encargo);

  const items = [
    { label: 'Observaciones', value: encargo.observaciones },
    { label: 'Horario de entrega', value: horario },
    { label: 'Comentario extraordinario', value: encargo.razon_extra },
    { label: 'Razón de rechazo', value: encargo.razon_rechazo },
    { label: 'Incidencias', value: encargo.incidencias },
    { label: 'Reclamo', value: encargo.reclamo },
    { label: 'Razón de tardanza', value: encargo.razon_tardanza },
  ].filter((item) => item.value);

  if (!items.length) return null;

  return (
    <Descriptions size="small" column={1} bordered style={{ maxWidth: 720 }}>
      {items.map((item) => (
        <Descriptions.Item key={item.label} label={item.label}>
          <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.value}</span>
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
};

export default EncargoExpandedRow;
