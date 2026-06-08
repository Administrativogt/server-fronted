import React, { useState } from 'react';
import { Tabs, Typography, Result } from 'antd';
import { BankOutlined, TeamOutlined, MailOutlined } from '@ant-design/icons';
import useAuthStore from '../../../auth/useAuthStore';
import AsambleasTab from './AsambleasTab';
import SociedadesTab from './SociedadesTab';
import ReglasNotificacionTab from './ReglasNotificacionTab';

const { Title, Text } = Typography;

const AsambleasPage: React.FC = () => {
  const modules = useAuthStore((s) => s.modules);
  const hasActas = modules.some((m: { key: string }) => m.key === 'actas');
  const [activeKey, setActiveKey] = useState('asambleas');

  if (!hasActas) {
    return (
      <Result
        status="403"
        title="Sin acceso"
        subTitle="No tienes acceso al módulo de Actas de Nombramiento."
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          <BankOutlined style={{ marginRight: 10 }} />
          Asambleas de sociedades
        </Title>
        <Text type="secondary">
          Catálogo de sociedades, generación de asambleas anuales y reglas de ruteo de
          recordatorios por correo.
        </Text>
      </div>

      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        destroyInactiveTabPane
        items={[
          {
            key: 'asambleas',
            label: <span><BankOutlined /> Asambleas</span>,
            children: <AsambleasTab />,
          },
          {
            key: 'sociedades',
            label: <span><TeamOutlined /> Sociedades</span>,
            children: <SociedadesTab />,
          },
          {
            key: 'reglas',
            label: <span><MailOutlined /> Reglas de notificación</span>,
            children: <ReglasNotificacionTab />,
          },
        ]}
      />
    </div>
  );
};

export default AsambleasPage;
