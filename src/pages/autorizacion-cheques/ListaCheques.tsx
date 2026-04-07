import React, { useEffect, useState, useMemo } from 'react';
import {
  Table, Button, Input, Space, Tag, Typography,
  Modal, message, Badge, Collapse, Statistic, Row, Col, Card,
} from 'antd';
import {
  SearchOutlined, MailOutlined, WarningOutlined,
  UserOutlined, DownOutlined, RightOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AccountingCheck } from '../../types/accounting-checks.types';
import { listLiquidationChecks, sendEmailLiquidationChecks } from '../../api/accounting-checks';

const { Title, Text } = Typography;
const { confirm } = Modal;

const announcementTag = (months: number) => {
  if (months === 0) return <Tag color="success">Al día</Tag>;
  if (months <= 3) return <Tag color="warning" icon={<WarningOutlined />}>{months} mes{months > 1 ? 'es' : ''}</Tag>;
  return <Tag color="error" icon={<WarningOutlined />}>{months} meses</Tag>;
};

interface UserGroup { user: string; checks: AccountingCheck[] }

const ListaCheques: React.FC = () => {
  const [checks, setChecks]       = useState<AccountingCheck[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [sendingUser, setSendingUser] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, React.Key[]>>({});

  const fetchChecks = async (searchValue?: string) => {
    setLoading(true);
    try {
      const data = await listLiquidationChecks(searchValue);
      setChecks(data);
      setSelectedIds({});
    } catch {
      message.error('Error al cargar la lista de cheques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChecks(); }, []);

  const userGroups = useMemo<UserGroup[]>(() => {
    const map = new Map<string, AccountingCheck[]>();
    for (const c of checks) {
      if (!map.has(c.user)) map.set(c.user, []);
      map.get(c.user)!.push(c);
    }
    return Array.from(map.entries())
      .map(([user, userChecks]) => ({ user, checks: userChecks }))
      .sort((a, b) =>
        Math.max(...b.checks.map(c => c.announcements)) -
        Math.max(...a.checks.map(c => c.announcements))
      );
  }, [checks]);

  // Stats globales
  const totalChecks   = checks.length;
  const totalUsers    = userGroups.length;
  const criticalUsers = userGroups.filter(g => Math.max(...g.checks.map(c => c.announcements)) >= 6).length;

  const handleSendEmail = (user: string, checkIds: number[]) => {
    confirm({
      title: '¿Enviar correo de recordatorio?',
      content: `Se enviarán ${checkIds.length} cheque(s) al usuario ${user}.`,
      okText: 'Enviar',
      cancelText: 'Cancelar',
      onOk: async () => {
        setSendingUser(user);
        try {
          await sendEmailLiquidationChecks(user, checkIds);
          message.success('Correo enviado exitosamente');
          setSelectedIds(prev => ({ ...prev, [user]: [] }));
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Error al enviar el correo');
        } finally {
          setSendingUser(null);
        }
      },
    });
  };

  const columns: ColumnsType<AccountingCheck> = [
    { title: 'Fecha',      dataIndex: 'date',          width: 100, render: (v) => new Date(v).toLocaleDateString('es-GT') },
    { title: 'Tipo/Doc',   dataIndex: 'document_type', width: 90  },
    { title: 'No. Cheque', dataIndex: 'check_number',  width: 110 },
    { title: 'Descripción',dataIndex: 'description',   ellipsis: true },
    { title: 'Monto',      dataIndex: 'amount',        width: 110, render: (v) => `Q. ${v}` },
    {
      title: 'Antigüedad', dataIndex: 'announcements', width: 120,
      sorter: (a, b) => a.announcements - b.announcements,
      defaultSortOrder: 'descend',
      render: (v) => announcementTag(v),
    },
  ];

  const collapseItems = userGroups.map(({ user, checks: userChecks }) => {
    const selected       = selectedIds[user] ?? [];
    const maxMonths      = Math.max(...userChecks.map(c => c.announcements));
    const isCritical     = maxMonths >= 6;
    const isWarning      = maxMonths >= 2 && maxMonths < 6;

    const headerColor = isCritical ? '#fee2e2' : isWarning ? '#fef3c7' : '#f0fdf4';
    const dotColor    = isCritical ? '#b91c1c' : isWarning ? '#92400e' : '#166534';

    return {
      key: user,
      style: { marginBottom: 6, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' },
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: headerColor, padding: '4px 0' }}>
          <Space size={12}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
            <UserOutlined style={{ color: '#6b7280' }} />
            <Text strong style={{ fontSize: 14 }}>{user}</Text>
            <Badge count={userChecks.length} color="#1a56a0" />
            {isCritical && <Tag color="error"  style={{ margin: 0 }}>Crítico</Tag>}
            {isWarning  && <Tag color="warning" style={{ margin: 0 }}>Atención</Tag>}
            <Text type="secondary" style={{ fontSize: 12 }}>
              Máx. {maxMonths} mes{maxMonths !== 1 ? 'es' : ''}
            </Text>
          </Space>

          {/* Botón: clic detenido para no colapsar el panel */}
          <div onClick={(e) => e.stopPropagation()} style={{ paddingRight: 8 }}>
            <Button
              type="primary"
              size="small"
              icon={<MailOutlined />}
              loading={sendingUser === user}
              disabled={selected.length === 0}
              onClick={() => handleSendEmail(user, selected as number[])}
            >
              Enviar correo {selected.length > 0 ? `(${selected.length})` : ''}
            </Button>
          </div>
        </div>
      ),
      children: (
        <Table
          dataSource={userChecks}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          rowSelection={{
            selectedRowKeys: selected,
            onChange: (keys) => setSelectedIds(prev => ({ ...prev, [user]: keys })),
          }}
          rowClassName={(r) =>
            r.announcements >= 6 ? 'row-danger' : r.announcements >= 2 ? 'row-warning' : ''
          }
        />
      ),
    };
  });

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Lista de cheques</Title>

      {/* Stats resumen */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Usuarios con cheques"  value={totalUsers}   prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total de cheques" value={totalChecks} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Usuarios críticos (≥6 meses)"
              value={criticalUsers}
              valueStyle={{ color: criticalUsers > 0 ? '#b91c1c' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      {/* Búsqueda */}
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Buscar por usuario..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onPressEnter={() => fetchChecks(search.trim() || undefined)}
          style={{ width: 280 }}
          prefix={<SearchOutlined />}
          allowClear
          onClear={() => fetchChecks()}
        />
        <Button type="primary" onClick={() => fetchChecks(search.trim() || undefined)} icon={<SearchOutlined />}>
          Buscar
        </Button>
      </Space>

      {/* Lista colapsable por usuario */}
      <Collapse
        items={collapseItems}
        ghost
        expandIcon={({ isActive }) => isActive ? <DownOutlined /> : <RightOutlined />}
        style={{ background: 'transparent' }}
      />

      {!loading && userGroups.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          No hay cheques activos
        </div>
      )}
    </div>
  );
};

export default ListaCheques;
