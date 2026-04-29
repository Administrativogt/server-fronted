import React, { useEffect, useMemo, useState } from 'react';
import {
  Card, Table, Tag, Typography, Space, Button, Input, Popover, message,
  Skeleton, Empty, Tooltip, Alert, Statistic, Row, Col,
} from 'antd';
import {
  MessageOutlined, EditOutlined, CheckOutlined, CloseOutlined,
  WarningOutlined, AlertOutlined, ClockCircleOutlined, ReloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AccountingCheck } from '../../types/accounting-checks.types';
import {
  listMyLiquidationChecks,
  updateLiquidationCheckComment,
} from '../../api/accounting-checks';
import useThemeStore from '../../hooks/useThemeStore';

const { Title, Text } = Typography;

const announcementTag = (months: number) => {
  if (months === 0) return <Tag color="success" style={{ margin: 0 }}>Al día</Tag>;
  if (months >= 6) return <Tag color="error" icon={<AlertOutlined />} style={{ margin: 0 }}>{months} meses</Tag>;
  if (months >= 2) return <Tag color="warning" icon={<WarningOutlined />} style={{ margin: 0 }}>{months} meses</Tag>;
  return <Tag color="processing" icon={<ClockCircleOutlined />} style={{ margin: 0 }}>{months} mes</Tag>;
};

const MisCheques: React.FC = () => {
  const [checks, setChecks] = useState<AccountingCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const isDark = useThemeStore((s) => s.mode === 'dark');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await listMyLiquidationChecks();
      setChecks(data);
    } catch {
      message.error('Error al cargar tus cheques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const stats = useMemo(() => {
    let critical = 0, warning = 0, ok = 0, withComment = 0;
    for (const c of checks) {
      if (c.announcements >= 6) critical++;
      else if (c.announcements >= 2) warning++;
      else ok++;
      if (c.comments && c.comments.trim()) withComment++;
    }
    return { total: checks.length, critical, warning, ok, withComment };
  }, [checks]);

  const openEditor = (record: AccountingCheck) => {
    setEditingId(record.id);
    setDraft(record.comments ?? '');
  };

  const closeEditor = () => {
    setEditingId(null);
    setDraft('');
  };

  const saveComment = async (record: AccountingCheck) => {
    setSaving(true);
    try {
      const updated = await updateLiquidationCheckComment(
        record.id,
        draft.trim() ? draft.trim() : null,
      );
      setChecks((prev) =>
        prev.map((c) => (c.id === record.id ? { ...c, comments: updated.comments } : c)),
      );
      message.success('Comentario guardado');
      closeEditor();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const renderCommentCell = (record: AccountingCheck) => {
    const hasComment = !!(record.comments && record.comments.trim());
    const isEditing = editingId === record.id;

    const editor = (
      <div style={{ width: 320 }}>
        <Input.TextArea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          maxLength={2000}
          showCount
          placeholder="Ej. Factura entregada, depósito realizado, en revisión, etc."
          autoFocus
        />
        <Space style={{ marginTop: 8, width: '100%', justifyContent: 'flex-end' }}>
          <Button size="small" icon={<CloseOutlined />} onClick={closeEditor}>
            Cancelar
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            loading={saving}
            onClick={() => saveComment(record)}
          >
            Guardar
          </Button>
        </Space>
      </div>
    );

    return (
      <Popover
        open={isEditing}
        onOpenChange={(open) => { if (!open) closeEditor(); }}
        trigger="click"
        placement="leftTop"
        content={editor}
        destroyTooltipOnHide
      >
        {hasComment ? (
          <Tooltip title="Clic para editar">
            <Tag
              color="blue"
              icon={<MessageOutlined />}
              style={{ cursor: 'pointer', maxWidth: 260, whiteSpace: 'normal', margin: 0 }}
              onClick={() => openEditor(record)}
            >
              <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {record.comments}
              </span>
            </Tag>
          </Tooltip>
        ) : (
          <Button
            size="small"
            type="dashed"
            icon={<EditOutlined />}
            onClick={() => openEditor(record)}
          >
            Agregar comentario
          </Button>
        )}
      </Popover>
    );
  };

  const columns: ColumnsType<AccountingCheck> = [
    { title: 'Fecha', dataIndex: 'date', width: 110, render: (v) => new Date(v).toLocaleDateString('es-GT') },
    { title: 'Tipo', dataIndex: 'document_type', width: 80 },
    { title: 'No. Cheque', dataIndex: 'check_number', width: 110 },
    { title: 'Descripción', dataIndex: 'description', ellipsis: true },
    {
      title: 'Monto', dataIndex: 'amount', width: 120, align: 'right',
      render: (v) => <Text strong>Q. {v}</Text>,
    },
    {
      title: 'Antigüedad', dataIndex: 'announcements', width: 130,
      sorter: (a, b) => a.announcements - b.announcements,
      defaultSortOrder: 'descend',
      render: (v) => announcementTag(v),
    },
    {
      title: 'Mi comentario', dataIndex: 'comments', width: 280,
      render: (_v, record) => renderCommentCell(record),
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Mis cheques pendientes</Title>
        <Text type="secondary">
          Cheques que tenés pendientes de liquidar. Podés agregar un comentario por cheque (ej. "factura entregada", "en revisión") y se guardará para futuros recordatorios.
        </Text>
      </div>

      <Alert
        type="info"
        showIcon
        message="Tus comentarios persisten"
        description="Cuando contabilidad cargue una nueva integración de saldos, tus comentarios siguen aquí. Solo se reemplazan si vos los editás."
        style={{ marginBottom: 16 }}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small" bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <Statistic
              title="Total pendientes"
              value={stats.total}
              prefix={<FileTextOutlined style={{ color: '#0891b2' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <Statistic
              title="Críticos (≥6 meses)"
              value={stats.critical}
              valueStyle={{ color: stats.critical > 0 ? '#dc2626' : undefined }}
              prefix={<AlertOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <Statistic
              title="Atención (2-5 meses)"
              value={stats.warning}
              valueStyle={{ color: stats.warning > 0 ? '#d97706' : undefined }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <Statistic
              title="Con comentario"
              value={stats.withComment}
              suffix={`/ ${stats.total}`}
              prefix={<MessageOutlined style={{ color: '#1565C0' }} />}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <Tooltip title="Recargar">
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Recargar
          </Button>
        </Tooltip>
      </div>

      {loading ? (
        <Card bordered={false} style={{ borderRadius: 12, border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.18)' : '#e5e7eb'}` }}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : checks.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 12, padding: 32, textAlign: 'center' }}>
          <Empty description="No tenés cheques pendientes. ¡Bien hecho!" />
        </Card>
      ) : (
        <Table
          dataSource={checks}
          columns={columns}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      )}
    </div>
  );
};

export default MisCheques;
