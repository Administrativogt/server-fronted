import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Spin,
  message,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, DownloadOutlined } from '@ant-design/icons';
import { getCase } from '../../api/clientCreation';
import type { Case } from '../../types/clientCreation.types';
import { CASE_STATES, CASE_STATE_COLORS } from '../../types/clientCreation.types';

const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const data = await getCase(Number(id));
        setCaseData(data);
      } catch {
        message.error('Error al cargar el caso');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!caseData) return <div>Caso no encontrado</div>;

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={`Detalle de Solicitud de Caso #${caseData.id}`}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard/casos/solicitudes')}>
              Regresar
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/dashboard/casos/solicitud/editar/${caseData.id}`)}
            >
              Editar
            </Button>
          </Space>
        }
      >
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Cliente">{caseData.client || '-'}</Descriptions.Item>
          <Descriptions.Item label="Área">{caseData.area?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Concepto" span={2}>{caseData.concept || '-'}</Descriptions.Item>
          <Descriptions.Item label="Moneda">{caseData.currency || '-'}</Descriptions.Item>
          <Descriptions.Item label="Monto de honorarios">{caseData.amount_of_fees || '-'}</Descriptions.Item>
          <Descriptions.Item label="Límite de horas">{caseData.limit_of_hours ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="Tipo de honorario">{caseData.fee_type || '-'}</Descriptions.Item>
          <Descriptions.Item label="Socio coordinador">{caseData.coordinating_partner?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Socio encargado">{caseData.partner_in_charge?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Responsable">{caseData.responsible || '-'}</Descriptions.Item>
          <Descriptions.Item label="Dirigido a">
            {caseData.addressed_to
              ? `${caseData.addressed_to.first_name} ${caseData.addressed_to.last_name}`
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Tipo de facturación">{caseData.billing_type?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Nombre del contacto">{caseData.name_of_contact || '-'}</Descriptions.Item>
          <Descriptions.Item label="Teléfono del contacto">{caseData.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="Email del contacto">{caseData.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="Estado">
            <Tag color={CASE_STATE_COLORS[caseData.state] || 'default'}>
              {CASE_STATES[caseData.state] || caseData.state}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Creado por">
            {caseData.created_by
              ? `${caseData.created_by.first_name} ${caseData.created_by.last_name}`
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Fecha de creación">{caseData.creation_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="Propuesta de honorarios">
            {caseData.fee_files ? (
              <a href={caseData.fee_files} target="_blank" rel="noopener noreferrer">
                <Button size="small" icon={<DownloadOutlined />}>Ver archivo</Button>
              </a>
            ) : (
              'Sin archivo'
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default CaseDetailPage;
