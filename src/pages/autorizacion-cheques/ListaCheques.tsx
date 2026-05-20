import React, { useEffect, useState, useMemo } from 'react';
import {
  Table, Button, Input, Space, Tag, Typography,
  Modal, message, Collapse, Statistic, Row, Col, Card,
  Segmented, Select, Skeleton, Empty, Tooltip, Popover,
} from 'antd';
import {
  SearchOutlined, MailOutlined, WarningOutlined,
  UserOutlined, DownOutlined, RightOutlined,
  TeamOutlined, FileTextOutlined, AlertOutlined,
  ReloadOutlined, FilterOutlined, ClockCircleOutlined,
  MessageOutlined, EditOutlined, CheckOutlined, CloseOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AccountingCheck } from '../../types/accounting-checks.types';
import {
  listLiquidationChecks,
  sendEmailLiquidationChecks,
  updateLiquidationCheckComment,
  getCommentsSummary,
  sendCommentsDigest,
  type CommentsSummary,
} from '../../api/accounting-checks';
import useThemeStore from '../../hooks/useThemeStore';

const { Title, Text } = Typography;
const { confirm } = Modal;

type Severity = 'critical' | 'warning' | 'ok';
type SeverityFilter = 'all' | Severity;
type SortMode = 'severity' | 'count' | 'name';

const severityOf = (months: number): Severity =>
  months >= 6 ? 'critical' : months >= 2 ? 'warning' : 'ok';

const announcementTag = (months: number) => {
  if (months === 0) return <Tag color="success" style={{ margin: 0 }}>Al día</Tag>;
  if (months <= 3) return <Tag color="warning" icon={<WarningOutlined />} style={{ margin: 0 }}>{months} mes{months > 1 ? 'es' : ''}</Tag>;
  return <Tag color="error" icon={<WarningOutlined />} style={{ margin: 0 }}>{months} meses</Tag>;
};

interface UserGroup { user: string; checks: AccountingCheck[] }

const ListaCheques: React.FC = () => {
  const [checks, setChecks]           = useState<AccountingCheck[]>([]);
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState('');
  const [sendingUser, setSendingUser] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, React.Key[]>>({});
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [sortMode, setSortMode]       = useState<SortMode>('severity');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [commentsSummary, setCommentsSummary] = useState<CommentsSummary | null>(null);
  const [sendingDigest, setSendingDigest] = useState(false);
  const isDark = useThemeStore((s) => s.mode === 'dark');

  const palette = isDark
    ? {
        critical: { rail: '#ef4444', soft: 'rgba(239, 68, 68, 0.10)', chipBg: 'rgba(239, 68, 68, 0.20)', chipText: '#fecaca', dot: '#f87171' },
        warning:  { rail: '#f59e0b', soft: 'rgba(245, 158, 11, 0.10)', chipBg: 'rgba(245, 158, 11, 0.20)', chipText: '#fde68a', dot: '#fbbf24' },
        ok:       { rail: '#22c55e', soft: 'rgba(34, 197, 94, 0.08)',  chipBg: 'rgba(34, 197, 94, 0.20)',  chipText: '#bbf7d0', dot: '#4ade80' },
        cardBg: '#0f172a', cardBorder: 'rgba(148, 163, 184, 0.18)', cardHover: 'rgba(148, 163, 184, 0.32)',
        textPrimary: '#f1f5f9', textMuted: '#94a3b8', textName: '#cbd5e1',
      }
    : {
        critical: { rail: '#dc2626', soft: '#fef2f2', chipBg: '#fee2e2', chipText: '#991b1b', dot: '#dc2626' },
        warning:  { rail: '#d97706', soft: '#fffbeb', chipBg: '#fef3c7', chipText: '#92400e', dot: '#d97706' },
        ok:       { rail: '#16a34a', soft: '#f0fdf4', chipBg: '#dcfce7', chipText: '#166534', dot: '#16a34a' },
        cardBg: '#ffffff', cardBorder: '#e5e7eb', cardHover: '#cbd5e1',
        textPrimary: '#0f172a', textMuted: '#64748b', textName: '#334155',
      };

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

  const fetchCommentsSummary = async () => {
    try {
      const data = await getCommentsSummary();
      setCommentsSummary(data);
    } catch {
      // Silencioso: si el usuario no es contabilidad/superuser obtendra 403,
      // simplemente no mostramos el badge.
      setCommentsSummary(null);
    }
  };

  const handleSendDigest = () => {
    confirm({
      title: '¿Enviar resumen de comentarios?',
      content:
        'Se enviará un correo a contabilidad con todos los cheques que tienen comentario actualmente, agrupados por responsable.',
      okText: 'Enviar',
      cancelText: 'Cancelar',
      onOk: async () => {
        setSendingDigest(true);
        try {
          const res = await sendCommentsDigest();
          if (res.sent) {
            message.success(
              `Resumen enviado: ${res.matched} cheque(s) de ${res.users} usuario(s)`,
            );
          } else {
            message.info('No hay cheques con comentario para enviar');
          }
        } catch (error: any) {
          message.error(
            error?.response?.data?.message || 'Error al enviar el resumen',
          );
        } finally {
          setSendingDigest(false);
        }
      },
    });
  };

  useEffect(() => {
    fetchChecks();
    fetchCommentsSummary();
  }, []);

  const userGroups = useMemo<UserGroup[]>(() => {
    const map = new Map<string, AccountingCheck[]>();
    for (const c of checks) {
      if (!map.has(c.user)) map.set(c.user, []);
      map.get(c.user)!.push(c);
    }
    let groups = Array.from(map.entries()).map(([user, userChecks]) => ({ user, checks: userChecks }));

    if (severityFilter !== 'all') {
      groups = groups.filter((g) => severityOf(Math.max(...g.checks.map((c) => c.announcements))) === severityFilter);
    }

    const term = search.trim().toLowerCase();
    if (term) {
      groups = groups.filter((g) => {
        if (g.user.toLowerCase().includes(term)) return true;
        const fullName = g.checks.find((c) => c.user_full_name)?.user_full_name ?? '';
        return fullName.toLowerCase().includes(term);
      });
    }

    return groups.sort((a, b) => {
      if (sortMode === 'count')   return b.checks.length - a.checks.length;
      if (sortMode === 'name')    return a.user.localeCompare(b.user);
      return Math.max(...b.checks.map((c) => c.announcements)) -
             Math.max(...a.checks.map((c) => c.announcements));
    });
  }, [checks, severityFilter, sortMode, search]);

  // Stats globales (sobre todo el dataset, no sobre el filtro)
  const totalChecks   = checks.length;
  const allGroups = useMemo(() => {
    const m = new Map<string, AccountingCheck[]>();
    for (const c of checks) {
      if (!m.has(c.user)) m.set(c.user, []);
      m.get(c.user)!.push(c);
    }
    return Array.from(m.values());
  }, [checks]);
  const totalUsers    = allGroups.length;

  const severityCounts = useMemo(() => {
    let critical = 0, warning = 0, ok = 0;
    for (const g of allGroups) {
      const sev = severityOf(Math.max(...g.map((c) => c.announcements)));
      if (sev === 'critical') critical++;
      else if (sev === 'warning') warning++;
      else ok++;
    }
    return { critical, warning, ok };
  }, [allGroups]);

  const criticalUsers = severityCounts.critical;
  const warningUsers  = severityCounts.warning;
  

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
          setSelectedIds((prev) => ({ ...prev, [user]: [] }));
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Error al enviar el correo');
        } finally {
          setSendingUser(null);
        }
      },
    });
  };

  const openCommentEditor = (record: AccountingCheck) => {
    setEditingCommentId(record.id);
    setCommentDraft(record.comments ?? '');
  };

  const closeCommentEditor = () => {
    setEditingCommentId(null);
    setCommentDraft('');
  };

  const saveComment = async (record: AccountingCheck) => {
    setSavingComment(true);
    try {
      const updated = await updateLiquidationCheckComment(
        record.id,
        commentDraft.trim() ? commentDraft.trim() : null,
      );
      setChecks((prev) =>
        prev.map((c) => (c.id === record.id ? { ...c, comments: updated.comments } : c)),
      );
      message.success('Comentario guardado');
      closeCommentEditor();
      fetchCommentsSummary();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al guardar el comentario');
    } finally {
      setSavingComment(false);
    }
  };

  const renderCommentCell = (record: AccountingCheck) => {
    const hasComment = !!(record.comments && record.comments.trim());
    const isEditing = editingCommentId === record.id;

    const editor = (
      <div style={{ width: 320 }}>
        <Input.TextArea
          value={commentDraft}
          onChange={(e) => setCommentDraft(e.target.value)}
          rows={3}
          maxLength={2000}
          showCount
          placeholder="Ej. Factura entregada, depósito realizado, etc."
          autoFocus
        />
        <Space style={{ marginTop: 8, width: '100%', justifyContent: 'flex-end' }}>
          <Button size="small" icon={<CloseOutlined />} onClick={closeCommentEditor}>
            Cancelar
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            loading={savingComment}
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
        onOpenChange={(open) => {
          if (!open) closeCommentEditor();
        }}
        trigger="click"
        placement="leftTop"
        content={editor}
        destroyTooltipOnHide
      >
        {hasComment ? (
          <Tooltip title="Clic para editar comentario">
            <Tag
              color="blue"
              icon={<MessageOutlined />}
              style={{ cursor: 'pointer', maxWidth: 220, whiteSpace: 'normal', margin: 0 }}
              onClick={() => openCommentEditor(record)}
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
            onClick={() => openCommentEditor(record)}
          >
            Agregar
          </Button>
        )}
      </Popover>
    );
  };

  const columns: ColumnsType<AccountingCheck> = [
    { title: 'Fecha',      dataIndex: 'date',          width: 110, render: (v) => new Date(v).toLocaleDateString('es-GT') },
    { title: 'Tipo/Doc',   dataIndex: 'document_type', width: 100 },
    { title: 'No. Cheque', dataIndex: 'check_number',  width: 120 },
    { title: 'Descripción',dataIndex: 'description',   ellipsis: true },
    { title: 'Monto',      dataIndex: 'amount',        width: 120, align: 'right', render: (v) => <Text strong>Q. {v}</Text> },
    {
      title: 'Antigüedad', dataIndex: 'announcements', width: 130,
      sorter: (a, b) => a.announcements - b.announcements,
      defaultSortOrder: 'descend',
      render: (v) => announcementTag(v),
    },
    {
      title: 'Comentario',
      dataIndex: 'comments',
      width: 240,
      render: (_v, record) => renderCommentCell(record),
    },
  ];

  const renderUserCard = ({ user, checks: userChecks }: UserGroup) => {
    const selected     = selectedIds[user] ?? [];
    const maxMonths    = Math.max(...userChecks.map((c) => c.announcements));
    const severity     = severityOf(maxMonths);
    const tone         = palette[severity];
    const fullName     = userChecks.find((c) => c.user_full_name)?.user_full_name ?? null;
    const isCritical   = severity === 'critical';
    const isWarning    = severity === 'warning';

    return {
      key: user,
      style: {
        marginBottom: 10,
        borderRadius: 12,
        overflow: 'hidden',
        border: `1px solid ${palette.cardBorder}`,
        background: palette.cardBg,
        transition: 'border-color 200ms ease, box-shadow 200ms ease',
      },
      label: (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            position: 'relative',
            padding: '10px 14px 10px 16px',
            background: tone.soft,
            borderLeft: `4px solid ${tone.rail}`,
          }}
        >
          <Space size={14} wrap>
            <Tooltip title={`Severidad: ${severity === 'critical' ? 'Crítica' : severity === 'warning' ? 'Atención' : 'Al día'}`}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: tone.dot,
                  display: 'inline-block',
                  boxShadow: isCritical ? `0 0 0 3px ${tone.chipBg}` : 'none',
                }}
              />
            </Tooltip>

            <Space size={8} align="center">
              <UserOutlined style={{ color: palette.textMuted }} />
              <Text strong style={{ fontSize: 14, color: palette.textPrimary, letterSpacing: 0.3 }}>
                {user}
              </Text>
              {fullName && (
                <Text style={{ fontSize: 13, color: palette.textName, fontWeight: 500 }}>
                  · {fullName}
                </Text>
              )}
            </Space>

            <Tooltip title="Cheques pendientes">
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '2px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  background: isDark ? 'rgba(59, 130, 246, 0.18)' : '#dbeafe',
                  color: isDark ? '#bfdbfe' : '#1e40af',
                }}
              >
                <FileTextOutlined /> {userChecks.length}
              </span>
            </Tooltip>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: tone.chipBg,
                color: tone.chipText,
              }}
            >
              {isCritical && <AlertOutlined />}
              {isWarning && <WarningOutlined />}
              {!isCritical && !isWarning && <ClockCircleOutlined />}
              {isCritical ? 'Crítico' : isWarning ? 'Atención' : 'Al día'}
            </span>

            <Text style={{ fontSize: 12, color: palette.textMuted }}>
              Máx. <Text strong style={{ color: palette.textPrimary }}>{maxMonths}</Text> mes{maxMonths !== 1 ? 'es' : ''}
            </Text>
          </Space>

          <div onClick={(e) => e.stopPropagation()} style={{ paddingRight: 4 }}>
            <Button
              type="primary"
              size="middle"
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
        <div style={{ padding: '4px 8px 8px 8px' }}>
          <Table
            dataSource={userChecks}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={false}
            rowSelection={{
              selectedRowKeys: selected,
              onChange: (keys) => setSelectedIds((prev) => ({ ...prev, [user]: keys })),
            }}
          />
        </div>
      ),
    };
  };

  const collapseItems = userGroups.map(renderUserCard);

  const handleStatClick = (target: SeverityFilter) => {
    setSeverityFilter((prev) => (prev === target ? 'all' : target));
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        document.getElementById('lista-cheques-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const statCardBase: React.CSSProperties = {
    borderRadius: 12,
    border: `1px solid ${palette.cardBorder}`,
    cursor: 'pointer',
    transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
    userSelect: 'none',
  };

  const activeStatStyle = (active: boolean, accent: string): React.CSSProperties =>
    active
      ? {
          borderColor: accent,
          boxShadow: `0 0 0 3px ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)'}, 0 4px 16px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(15,23,42,0.06)'}`,
        }
      : {};

  // Barra de distribución
  const distTotal = Math.max(totalUsers, 1);
  const distSegments: { key: SeverityFilter; label: string; count: number; color: string; chipText: string }[] = [
    { key: 'critical', label: 'Críticos', count: severityCounts.critical, color: palette.critical.rail, chipText: palette.critical.chipText },
    { key: 'warning',  label: 'Atención', count: severityCounts.warning,  color: palette.warning.rail,  chipText: palette.warning.chipText  },
    { key: 'ok',       label: 'Al día',   count: severityCounts.ok,       color: palette.ok.rail,       chipText: palette.ok.chipText       },
  ];

  const renderCommentsSummaryPanel = () => {
    if (!commentsSummary) return null;
    if (commentsSummary.total === 0) {
      return (
        <div style={{ padding: 12, minWidth: 280 }}>
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>
            No hay cheques con comentario activo.
          </Text>
        </div>
      );
    }
    return (
      <div style={{ minWidth: 320, maxWidth: 380, padding: 4 }}>
        <div style={{ marginBottom: 10 }}>
          <Text strong style={{ color: palette.textPrimary, fontSize: 13 }}>
            Comentarios por responsable
          </Text>
          <div style={{ color: palette.textMuted, fontSize: 12 }}>
            {commentsSummary.total} cheque(s) · {commentsSummary.users} usuario(s)
          </div>
        </div>
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {commentsSummary.by_user.map((u) => (
            <div
              key={u.user_code}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderTop: `1px solid ${palette.cardBorder}`,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: palette.textPrimary, fontSize: 12, fontWeight: 600 }}>
                  {u.user_code}
                </div>
                <div
                  style={{
                    color: palette.textMuted,
                    fontSize: 11,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {u.user_name}
                </div>
              </div>
              <Tag color="blue" style={{ margin: 0 }}>
                {u.count} {u.count === 1 ? 'cheque' : 'cheques'}
              </Tag>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0, color: palette.textPrimary }}>Lista de cheques</Title>
          <Text style={{ color: palette.textMuted, fontSize: 14 }}>
            Cheques pendientes de liquidación agrupados por responsable.
          </Text>
        </div>
        {commentsSummary && (
          <Space wrap>
            <Popover
              trigger="click"
              placement="bottomRight"
              content={renderCommentsSummaryPanel()}
            >
              <Button
                icon={<MessageOutlined />}
                style={{
                  borderColor: commentsSummary.total > 0 ? '#1e40af' : palette.cardBorder,
                  color: commentsSummary.total > 0 ? '#1e40af' : palette.textPrimary,
                  fontWeight: 600,
                }}
              >
                Comentarios de usuarios
                <Tag
                  color={commentsSummary.total > 0 ? 'blue' : 'default'}
                  style={{ marginLeft: 8, marginRight: 0 }}
                >
                  {commentsSummary.total}
                </Tag>
              </Button>
            </Popover>
            <Tooltip title="Envía a contabilidad un correo con todos los comentarios actuales agrupados por responsable.">
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={sendingDigest}
                disabled={commentsSummary.total === 0}
                onClick={handleSendDigest}
              >
                Enviar resumen a contabilidad
              </Button>
            </Tooltip>
          </Space>
        )}
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Tooltip title={severityFilter === 'all' ? 'Mostrando todos' : 'Clic para mostrar todos'}>
            <Card
              size="small"
              bordered={false}
              hoverable
              onClick={() => handleStatClick('all')}
              style={{ ...statCardBase, ...activeStatStyle(severityFilter === 'all', '#1e40af') }}
            >
              <Statistic
                title={<span style={{ color: palette.textMuted }}>Usuarios con cheques</span>}
                value={totalUsers}
                prefix={<TeamOutlined style={{ color: '#1e40af' }} />}
                valueStyle={{ color: palette.textPrimary, fontWeight: 600 }}
              />
            </Card>
          </Tooltip>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Tooltip title="Total de cheques pendientes">
            <Card
              size="small"
              bordered={false}
              hoverable
              onClick={() => handleStatClick('all')}
              style={statCardBase}
            >
              <Statistic
                title={<span style={{ color: palette.textMuted }}>Total de cheques</span>}
                value={totalChecks}
                prefix={<FileTextOutlined style={{ color: '#0891b2' }} />}
                valueStyle={{ color: palette.textPrimary, fontWeight: 600 }}
              />
            </Card>
          </Tooltip>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Tooltip title={severityFilter === 'warning' ? 'Quitar filtro' : 'Filtrar usuarios en atención'}>
            <Card
              size="small"
              bordered={false}
              hoverable
              onClick={() => handleStatClick('warning')}
              style={{
                ...statCardBase,
                ...activeStatStyle(severityFilter === 'warning', palette.warning.rail),
                background: severityFilter === 'warning' ? palette.warning.soft : palette.cardBg,
              }}
            >
              <Statistic
                title={<span style={{ color: palette.textMuted }}>Atención (2-5 meses)</span>}
                value={warningUsers}
                prefix={<WarningOutlined style={{ color: warningUsers > 0 ? palette.warning.rail : palette.textMuted }} />}
                valueStyle={{
                  color: warningUsers > 0 ? palette.warning.rail : palette.textPrimary,
                  fontWeight: 700,
                }}
              />
            </Card>
          </Tooltip>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Tooltip title={severityFilter === 'critical' ? 'Quitar filtro' : 'Filtrar usuarios críticos'}>
            <Card
              size="small"
              bordered={false}
              hoverable
              onClick={() => handleStatClick('critical')}
              style={{
                ...statCardBase,
                ...activeStatStyle(severityFilter === 'critical', palette.critical.rail),
                background: severityFilter === 'critical'
                  ? palette.critical.soft
                  : (criticalUsers > 0 ? palette.critical.soft : palette.cardBg),
                borderColor: criticalUsers > 0 ? palette.critical.rail : palette.cardBorder,
              }}
            >
              <Statistic
                title={<span style={{ color: palette.textMuted }}>Críticos (≥ 6 meses)</span>}
                value={criticalUsers}
                prefix={<AlertOutlined style={{ color: criticalUsers > 0 ? palette.critical.rail : palette.textMuted }} />}
                valueStyle={{
                  color: criticalUsers > 0 ? palette.critical.rail : palette.textPrimary,
                  fontWeight: 700,
                }}
              />
            </Card>
          </Tooltip>
        </Col>
      </Row>

      {/* Distribución gráfica */}
      {totalUsers > 0 && (
        <Card
          size="small"
          bordered={false}
          style={{ borderRadius: 12, border: `1px solid ${palette.cardBorder}`, marginBottom: 16 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: palette.textMuted, fontSize: 13, fontWeight: 600 }}>
              Distribución por severidad
            </Text>
            <Space size={16} wrap>
              {distSegments.map((s) => (
                <Space size={6} key={s.key}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, display: 'inline-block' }} />
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                    {s.label} <Text strong style={{ color: palette.textPrimary }}>{s.count}</Text>
                  </Text>
                </Space>
              ))}
            </Space>
          </div>
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: 14,
              borderRadius: 999,
              overflow: 'hidden',
              background: isDark ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9',
            }}
          >
            {distSegments.map((s) => {
              const pct = (s.count / distTotal) * 100;
              if (pct === 0) return null;
              const isActive = severityFilter === s.key;
              return (
                <Tooltip
                  key={s.key}
                  title={`${s.label}: ${s.count} usuario${s.count !== 1 ? 's' : ''} (${pct.toFixed(1)}%)`}
                >
                  <div
                    onClick={() => handleStatClick(s.key)}
                    style={{
                      width: `${pct}%`,
                      background: s.color,
                      cursor: 'pointer',
                      transition: 'opacity 200ms ease, transform 200ms ease',
                      opacity: severityFilter === 'all' || isActive ? 1 : 0.45,
                      borderRight: '1px solid rgba(255,255,255,0.15)',
                    }}
                  />
                </Tooltip>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filtros */}
      <Card
        size="small"
        bordered={false}
        style={{ borderRadius: 12, border: `1px solid ${palette.cardBorder}`, marginBottom: 16 }}
      >
        <Row gutter={[12, 12]} align="middle" justify="space-between">
          <Col xs={24} md={10}>
            <Input
              placeholder="Buscar por código o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<SearchOutlined style={{ color: palette.textMuted }} />}
              allowClear
              size="middle"
            />
          </Col>
          <Col xs={24} md={14}>
            <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Segmented
                options={[
                  { label: 'Todos',      value: 'all'      },
                  { label: 'Críticos',   value: 'critical' },
                  { label: 'Atención',   value: 'warning'  },
                  { label: 'Al día',     value: 'ok'       },
                ]}
                value={severityFilter}
                onChange={(v) => setSeverityFilter(v as SeverityFilter)}
              />
              <Select
                value={sortMode}
                onChange={(v) => setSortMode(v as SortMode)}
                style={{ width: 180 }}
                suffixIcon={<FilterOutlined />}
                options={[
                  { value: 'severity', label: 'Por severidad' },
                  { value: 'count',    label: 'Por # cheques' },
                  { value: 'name',     label: 'Por código'    },
                ]}
              />
              <Tooltip title="Recargar datos">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => fetchChecks()}
                  loading={loading}
                />
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Lista */}
      <div id="lista-cheques-list" />
      {loading ? (
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          {[1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              size="small"
              style={{ borderRadius: 12, border: `1px solid ${palette.cardBorder}` }}
              bordered={false}
            >
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          ))}
        </Space>
      ) : userGroups.length === 0 ? (
        <Card
          bordered={false}
          style={{ borderRadius: 12, border: `1px solid ${palette.cardBorder}`, padding: 32, textAlign: 'center' }}
        >
          <Empty
            description={
              <Text style={{ color: palette.textMuted }}>
                {severityFilter !== 'all' || search
                  ? 'No hay cheques que coincidan con el filtro'
                  : 'No hay cheques activos'}
              </Text>
            }
          />
        </Card>
      ) : (
        <Collapse
          items={collapseItems}
          ghost
          expandIcon={({ isActive }) =>
            isActive
              ? <DownOutlined style={{ color: palette.textMuted }} />
              : <RightOutlined style={{ color: palette.textMuted }} />
          }
          style={{ background: 'transparent' }}
        />
      )}
    </div>
  );
};

export default ListaCheques;
