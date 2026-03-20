import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Typography,
  Modal,
  message,
} from 'antd';
import {
  SearchOutlined,
  MailOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AccountingCheck } from '../../types/accounting-checks.types';
import { listLiquidationChecks, sendEmailLiquidationChecks } from '../../api/accounting-checks';

const { Title } = Typography;
const { confirm } = Modal;

const announcementTag = (months: number) => {
  if (months === 0) return <Tag color="success">Al día</Tag>;
  if (months <= 3) return <Tag color="warning" icon={<WarningOutlined />}>{months} mes{months > 1 ? 'es' : ''}</Tag>;
  return <Tag color="error" icon={<WarningOutlined />}>{months} meses</Tag>;
};

const ListaCheques: React.FC = () => {
  const [checks, setChecks] = useState<AccountingCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchChecks = async (searchValue?: string) => {
    setLoading(true);
    try {
      const data = await listLiquidationChecks(searchValue);
      setChecks(data);
    } catch {
      message.error('Error al cargar la lista de cheques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecks();
  }, []);

  const handleSearch = () => fetchChecks(search.trim() || undefined);

  const handleSendEmail = (userName: string) => {
    confirm({
      title: '¿Enviar correo de recordatorio?',
      content: `Se enviará un correo de liquidación de cheques a ${userName}.`,
      okText: 'Enviar',
      cancelText: 'Cancelar',
      onOk: async () => {
        setSendingEmail(true);
        try {
          await sendEmailLiquidationChecks(userName);
          message.success('Correo enviado exitosamente');
        } catch (error: any) {
          const msg = error.response?.data?.message || 'Error al enviar el correo';
          message.error(msg);
        } finally {
          setSendingEmail(false);
        }
      },
    });
  };

  const columns: ColumnsType<AccountingCheck> = [
    {
      title: 'Fecha',
      dataIndex: 'date',
      key: 'date',
      render: (val: string) => new Date(val).toLocaleDateString('es-GT'),
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      width: 110,
    },
    {
      title: 'Tipo/Doc',
      dataIndex: 'document_type',
      key: 'document_type',
      width: 90,
    },
    {
      title: 'No. Cheque',
      dataIndex: 'check_number',
      key: 'check_number',
      width: 110,
    },
    {
      title: 'Usuario',
      dataIndex: 'user',
      key: 'user',
    },
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Monto',
      dataIndex: 'amount',
      key: 'amount',
      width: 110,
      render: (val: string) => `Q. ${val}`,
    },
    {
      title: 'Antigüedad',
      dataIndex: 'announcements',
      key: 'announcements',
      width: 120,
      sorter: (a, b) => a.announcements - b.announcements,
      defaultSortOrder: 'descend',
      render: (val: number) => announcementTag(val),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 110,
      render: (_: any, record: AccountingCheck) => (
        <Button
          size="small"
          icon={<MailOutlined />}
          loading={sendingEmail}
          disabled={record.announcements === 0}
          onClick={() => handleSendEmail(record.user)}
        >
          Correo
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Lista de cheques</Title>

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Buscar por usuario..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 280 }}
          prefix={<SearchOutlined />}
          allowClear
          onClear={() => fetchChecks()}
        />
        <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />}>
          Buscar
        </Button>
      </Space>

      <Table
        dataSource={checks}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        rowClassName={(record) =>
          record.announcements >= 4 ? 'row-danger' : record.announcements >= 1 ? 'row-warning' : ''
        }
        scroll={{ x: 900 }}
      />
    </div>
  );
};

export default ListaCheques;
