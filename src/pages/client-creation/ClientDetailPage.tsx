import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Table,
  Button,
  Space,
  Tag,
  Spin,
  message,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, CopyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getClient } from '../../api/clientCreation';
import type { Client, ClientContact } from '../../types/clientCreation.types';
import { CLIENT_STATES, CLIENT_STATE_COLORS } from '../../types/clientCreation.types';

const copyToClipboard = (value: string | null | undefined) => {
  if (!value) return;
  navigator.clipboard.writeText(value);
  message.success(`Copiado: ${value}`);
};

const CopyableText: React.FC<{ value?: string | null }> = ({ value }) => {
  if (!value) return <span>-</span>;
  return (
    <span
      style={{ cursor: 'pointer' }}
      onClick={() => copyToClipboard(value)}
      title="Click para copiar"
    >
      {value} <CopyOutlined style={{ fontSize: 12, color: '#1890ff' }} />
    </span>
  );
};

const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const data = await getClient(Number(id));
        setClient(data);
      } catch {
        message.error('Error al cargar el cliente');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!client) return <div>Cliente no encontrado</div>;

  const contactColumns: ColumnsType<ClientContact> = [
    { title: 'Nombre', key: 'name', render: (_, r) => `${r.first_name} ${r.last_name}` },
    { title: 'Cargo', dataIndex: 'position', key: 'position' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Teléfono', dataIndex: 'phone', key: 'phone' },
    { title: 'Ciudad', dataIndex: 'city', key: 'city' },
    { title: 'País', key: 'country', render: (_, r) => r.country?.name || '-' },
    { title: 'Idioma', key: 'language', render: (_, r) => r.language?.name || '-' },
    {
      title: 'Suscrito BD',
      dataIndex: 'subscribe_to_database',
      key: 'subscribe',
      render: (v: boolean) => v ? 'Sí' : 'No',
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={`Detalle del Cliente: ${client.full_name}`}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard/clientes')}>
              Regresar
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/dashboard/clientes/editar/${client.id}`)}
            >
              Editar
            </Button>
          </Space>
        }
      >
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Nombre completo">
            <CopyableText value={client.full_name} />
          </Descriptions.Item>
          <Descriptions.Item label="Código">
            <CopyableText value={client.code} />
          </Descriptions.Item>
          <Descriptions.Item label="Correlativo">
            <CopyableText value={client.correlative} />
          </Descriptions.Item>
          <Descriptions.Item label="NIT">
            <CopyableText value={client.nit} />
          </Descriptions.Item>
          <Descriptions.Item label="Teléfono">
            <CopyableText value={client.phone} />
          </Descriptions.Item>
          <Descriptions.Item label="Email">
            <CopyableText value={client.email} />
          </Descriptions.Item>
          <Descriptions.Item label="Tipo de contribuyente">
            {client.type_of_taxpayer === 'Juridica' ? 'Jurídica' : 'Física'}
          </Descriptions.Item>
          <Descriptions.Item label="Nacionalidad">{client.nationality}</Descriptions.Item>
          <Descriptions.Item label="País">{client.country_of_origin?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Dirección">
            <CopyableText value={client.address} />
          </Descriptions.Item>
          <Descriptions.Item label="Sitio web">
            <CopyableText value={client.website} />
          </Descriptions.Item>
          <Descriptions.Item label="Código interno">
            <CopyableText value={client.internal_code} />
          </Descriptions.Item>
          <Descriptions.Item label="Nombre comercial">
            <CopyableText value={client.commercial_name} />
          </Descriptions.Item>
          <Descriptions.Item label="Grupo empresarial">
            <CopyableText value={client.business_group} />
          </Descriptions.Item>
          <Descriptions.Item label="Tipo doc. tributario">
            <CopyableText value={client.tax_document_type} />
          </Descriptions.Item>
          <Descriptions.Item label="Sector económico">{client.economic_sector?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Idioma">{client.language?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Socio responsable">{client.responsible_partner?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Origen">{client.origin?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Referido por">
            <CopyableText value={client.referred_by} />
          </Descriptions.Item>
          <Descriptions.Item label="Exento de IVA">{client.is_exempt_iva ? 'Sí' : 'No'}</Descriptions.Item>
          <Descriptions.Item label="Porcentaje IVA">{client.iva_percentage || '-'}</Descriptions.Item>
          <Descriptions.Item label="Estado">
            <Tag color={CLIENT_STATE_COLORS[client.state] || 'default'}>
              {CLIENT_STATES[client.state] || client.state}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Creado por">
            {client.created_by ? `${client.created_by.first_name} ${client.created_by.last_name}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Fecha de creación">{client.creation_date || '-'}</Descriptions.Item>
        </Descriptions>

        <Card size="small" title="Contactos" style={{ marginTop: 16 }}>
          <Table
            columns={contactColumns}
            dataSource={client.contacts || []}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      </Card>
    </div>
  );
};

export default ClientDetailPage;
