// src/pages/mensajeria/components/EncargoCardList.tsx
// Vista de tarjetas para móvil (mensajeros en ruta). Reemplaza a la tabla en
// viewports < md: información de entrega primero (dirección con enlace a mapa,
// horario, observaciones visibles sin hover) y acciones táctiles grandes.
// Las páginas deciden qué acciones renderizar vía renderActions.
import React from 'react';
import { Card, List, Skeleton, Space, Tag, Typography, theme } from 'antd';
import { EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { Encargo } from '../../../types/encargo';
import { ESTADOS, PRIORIDADES, formatFecha, formatHorario } from '../constants';

const { Text } = Typography;

interface EncargoCardListProps {
  encargos: Encargo[];
  loading: boolean;
  emptyText: React.ReactNode;
  renderActions?: (encargo: Encargo) => React.ReactNode;
  showSolicitante?: boolean;
  showMensajero?: boolean;
}

const mapsUrl = (encargo: Encargo) => {
  // zona puede ser 0 (válida) — comparar contra null/undefined, no truthiness
  const query = [encargo.direccion, encargo.zona != null ? `zona ${encargo.zona}` : '', encargo.municipio?.nombre || '', 'Guatemala']
    .filter(Boolean)
    .join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

const EncargoCardList: React.FC<EncargoCardListProps> = ({
  encargos,
  loading,
  emptyText,
  renderActions,
  showSolicitante = true,
  showMensajero = false,
}) => {
  const { token } = theme.useToken();

  if (loading && !encargos.length) {
    return (
      <div>
        {[1, 2, 3].map((i) => (
          <Card key={i} size="small" style={{ marginBottom: 12 }}>
            <Skeleton active paragraph={{ rows: 3 }} title={false} />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <List
      dataSource={encargos}
      locale={{ emptyText }}
      pagination={encargos.length > 10 ? { pageSize: 10, size: 'small' } : false}
      renderItem={(encargo) => {
        const estado = ESTADOS[encargo.estado];
        const horario = formatHorario(encargo);
        const razonProblema = encargo.razon_rechazo || encargo.incidencias;

        return (
          <Card size="small" style={{ marginBottom: 12 }} styles={{ body: { padding: 12 } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Space size={4} wrap>
                {estado && <Tag color={estado.color} style={{ marginInlineEnd: 0 }}>{estado.label}</Tag>}
                <Tag style={{ marginInlineEnd: 0 }}>Prioridad {PRIORIDADES[encargo.prioridad] || encargo.prioridad}</Tag>
              </Space>
              <Text type="secondary">{formatFecha(encargo.fecha_realizacion)}</Text>
            </div>

            <div style={{ marginTop: 8 }}>
              <Text strong style={{ fontSize: 16 }}>{encargo.destinatario}</Text>
              <div>
                <Text type="secondary">{encargo.empresa}</Text>
              </div>
            </div>

            <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <EnvironmentOutlined style={{ color: token.colorPrimary, marginTop: 3 }} />
              <a href={mapsUrl(encargo)} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: 'anywhere' }}>
                {encargo.direccion}
                {encargo.zona != null ? ` — Zona ${encargo.zona}` : ''}
                {encargo.municipio?.nombre ? `, ${encargo.municipio.nombre}` : ''}
              </a>
            </div>

            {horario && (
              <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                <ClockCircleOutlined style={{ color: token.colorWarning }} />
                <Text strong>{horario}</Text>
              </div>
            )}

            <div style={{ marginTop: 6 }}>
              <Text type="secondary">{encargo.mensajeria_enviada || '—'}</Text>
              {showSolicitante && encargo.solicitante && (
                <div>
                  <Text type="secondary">
                    Solicita: {encargo.solicitante.first_name} {encargo.solicitante.last_name}
                  </Text>
                </div>
              )}
              {showMensajero && (
                <div>
                  <Text type="secondary">
                    Mensajero:{' '}
                    {encargo.mensajero
                      ? `${encargo.mensajero.first_name} ${encargo.mensajero.last_name}`
                      : 'Sin asignar'}
                  </Text>
                </div>
              )}
            </div>

            {encargo.observaciones && (
              <div
                style={{
                  marginTop: 8,
                  padding: '6px 10px',
                  background: token.colorPrimaryBg,
                  borderRadius: token.borderRadius,
                  overflowWrap: 'anywhere',
                }}
              >
                <Text>{encargo.observaciones}</Text>
              </div>
            )}

            {razonProblema && (
              <div
                style={{
                  marginTop: 8,
                  padding: '6px 10px',
                  background: token.colorErrorBg,
                  borderRadius: token.borderRadius,
                  overflowWrap: 'anywhere',
                }}
              >
                <Text>{encargo.razon_rechazo ? `Rechazo: ${encargo.razon_rechazo}` : `Incidencia: ${encargo.incidencias}`}</Text>
              </div>
            )}

            {renderActions && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {renderActions(encargo)}
              </div>
            )}
          </Card>
        );
      }}
    />
  );
};

export default EncargoCardList;
