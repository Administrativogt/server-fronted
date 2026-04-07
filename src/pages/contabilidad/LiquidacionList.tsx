import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Input,
  message,
  Modal,
  Space,
  Table,
  Tag,
} from 'antd';
import { MailOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { checksApi } from '../../api/accounting';
import type { AccountingCheck } from '../../types/accounting.types';

export default function LiquidacionList() {
  const [data, setData] = useState<AccountingCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [userFilter, setUserFilter] = useState('');
  const [emailModal, setEmailModal] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await checksApi.getAll({
        user: userFilter || undefined,
        active: true,
      });
      setData(res.data);
    } catch {
      message.error('Error al cargar cheques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = () => load();

  const handleSendEmail = async () => {
    if (!emailModal) return;
    try {
      setSending(true);
      await checksApi.sendEmail(emailModal);
      message.success('Email enviado correctamente');
      setEmailModal(null);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Error al enviar email');
    } finally {
      setSending(false);
    }
  };

  const columns: ColumnsType<AccountingCheck> = [
    { title: 'Fecha', dataIndex: 'date', width: 110 },
    { title: 'Tipo', dataIndex: 'document_type', width: 80 },
    { title: 'N° Cheque', dataIndex: 'check_number', width: 120 },
    { title: 'Usuario', dataIndex: 'user' },
    { title: 'Descripción', dataIndex: 'description' },
    { title: 'Monto', dataIndex: 'amount', width: 120 },
    {
      title: 'Avisos',
      dataIndex: 'announcements',
      width: 80,
      render: (val: number) => (
        <Tag color={val > 0 ? 'red' : 'default'}>{val}</Tag>
      ),
    },
    {
      title: 'Acciones',
      width: 80,
      render: (_, record) => (
        <Button
          size="small"
          icon={<MailOutlined />}
          onClick={() => setEmailModal(record.user)}
        />
      ),
    },
  ];

  return (
    <>
      <Card title="Lista de Cheques">
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="Buscar por usuario"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 220 }}
          />
          <Button onClick={handleSearch}>Buscar</Button>
        </Space>

        <Table
          rowKey="id"
          dataSource={data}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title={`Enviar aviso a: ${emailModal}`}
        open={!!emailModal}
        onOk={handleSendEmail}
        onCancel={() => setEmailModal(null)}
        okText="Enviar email"
        cancelText="Cancelar"
        confirmLoading={sending}
      >
        <p>
          Se enviará un email con todos los cheques pendientes (con avisos &gt; 0)
          del usuario <strong>{emailModal}</strong>.
        </p>
      </Modal>
    </>
  );
}
