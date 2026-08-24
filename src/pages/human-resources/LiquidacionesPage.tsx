import React from 'react';
import { Typography } from 'antd';
import LiquidacionesTab from './LiquidacionesTab';

const { Title, Text } = Typography;

/**
 * Liquidaciones de vacaciones al retiro de un empleado: cálculo de períodos
 * pendientes, cierre de saldo y carta PDF. Solo RR.HH. (VacationHrRoute).
 */
const LiquidacionesPage: React.FC = () => (
  <div style={{ padding: '0 8px' }}>
    <div style={{ marginBottom: 16 }}>
      <Title level={3} style={{ marginBottom: 4 }}>
        Liquidaciones de Vacaciones
      </Title>
      <Text type="secondary">
        Cálculo de días pendientes al retiro, cierre de saldo y carta de
        liquidación
      </Text>
    </div>
    <LiquidacionesTab />
  </div>
);

export default LiquidacionesPage;
