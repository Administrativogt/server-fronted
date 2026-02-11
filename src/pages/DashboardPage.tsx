import { useEffect, useState, useCallback } from "react";
import { Card, Col, Row, Typography, Statistic, Table, Tag, Spin, Space, Button, Divider } from "antd";
import {
  MailOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Pie, Column } from "@ant-design/charts";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../auth/useAuthStore";
import {
  fetchPendingNotifications,
  fetchDeliveredNotifications,
  type NotificationDto,
  NOTIFICATION_STATES,
} from "../api/notifications";
import {
  fetchPendingDocuments,
  fetchDeliveredDocuments,
  type DocumentDto,
  DOCUMENT_STATES,
} from "../api/documents";

const { Title, Text } = Typography;

interface DashboardStats {
  notifPending: number;
  notifDelivered: number;
  notifFinalized: number;
  docsPending: number;
  docsDelivered: number;
  docsFinalized: number;
  docsRejected: number;
  myNotifToAccept: number;
  myDocsToAccept: number;
}

function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    notifPending: 0,
    notifDelivered: 0,
    notifFinalized: 0,
    docsPending: 0,
    docsDelivered: 0,
    docsFinalized: 0,
    docsRejected: 0,
    myNotifToAccept: 0,
    myDocsToAccept: 0,
  });
  const [recentNotifs, setRecentNotifs] = useState<NotificationDto[]>([]);
  const [recentDocs, setRecentDocs] = useState<DocumentDto[]>([]);

  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.userId);
  const username = useAuthStore((s) => s.username);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [pendingNotifs, deliveredNotifs, pendingDocs, deliveredDocs] = await Promise.all([
        fetchPendingNotifications().catch(() => [] as NotificationDto[]),
        fetchDeliveredNotifications().catch(() => [] as NotificationDto[]),
        fetchPendingDocuments().catch(() => [] as DocumentDto[]),
        fetchDeliveredDocuments().catch(() => [] as DocumentDto[]),
      ]);

      const notifDelivered = deliveredNotifs.filter((n) => n.state === NOTIFICATION_STATES.DELIVERED);
      const notifFinalized = deliveredNotifs.filter((n) => n.state === NOTIFICATION_STATES.FINALIZED);

      const docsDelivered = deliveredDocs.filter((d) => d.state === DOCUMENT_STATES.DELIVERED);
      const docsFinalized = deliveredDocs.filter((d) => d.state === DOCUMENT_STATES.FINALIZED);
      const docsRejected = deliveredDocs.filter((d) => d.state === DOCUMENT_STATES.REJECTED);

      // Notificaciones pendientes de aceptar POR MÍ
      const myNotifToAccept = notifDelivered.filter(
        (n) => n.deliverTo?.id === userId
      ).length;

      // Documentos pendientes de aceptar POR MÍ
      const myDocsToAccept = docsDelivered.filter(
        (d) => String(d.deliverTo) === String(userId)
      ).length;

      setStats({
        notifPending: pendingNotifs.length,
        notifDelivered: notifDelivered.length,
        notifFinalized: notifFinalized.length,
        docsPending: pendingDocs.length,
        docsDelivered: docsDelivered.length,
        docsFinalized: docsFinalized.length,
        docsRejected: docsRejected.length,
        myNotifToAccept,
        myDocsToAccept,
      });

      // Últimas 5 notificaciones entregadas
      setRecentNotifs(
        [...deliveredNotifs]
          .sort((a, b) => new Date(b.deliveryDatetime || b.receptionDatetime).getTime() - new Date(a.deliveryDatetime || a.receptionDatetime).getTime())
          .slice(0, 5)
      );

      // Últimos 5 documentos entregados
      setRecentDocs(
        [...deliveredDocs]
          .sort((a, b) => new Date(b.deliverDatetime || b.receptionDatetime).getTime() - new Date(a.deliverDatetime || a.receptionDatetime).getTime())
          .slice(0, 5)
      );
    } catch {
      // silencioso
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Datos para gráfica de pie de notificaciones
  const notifPieData = [
    { type: "Pendientes", value: stats.notifPending },
    { type: "Entregadas", value: stats.notifDelivered },
    { type: "Finalizadas", value: stats.notifFinalized },
  ].filter((d) => d.value > 0);

  // Datos para gráfica de pie de documentos
  const docsPieData = [
    { type: "Pendientes", value: stats.docsPending },
    { type: "Entregados", value: stats.docsDelivered },
    { type: "Finalizados", value: stats.docsFinalized },
    { type: "Rechazados", value: stats.docsRejected },
  ].filter((d) => d.value > 0);

  // Datos para gráfica de barras comparativa
  const barData = [
    { categoria: "Pendientes", tipo: "Notificaciones", cantidad: stats.notifPending },
    { categoria: "Pendientes", tipo: "Documentos", cantidad: stats.docsPending },
    { categoria: "Entregados", tipo: "Notificaciones", cantidad: stats.notifDelivered },
    { categoria: "Entregados", tipo: "Documentos", cantidad: stats.docsDelivered },
    { categoria: "Finalizados", tipo: "Notificaciones", cantidad: stats.notifFinalized },
    { categoria: "Finalizados", tipo: "Documentos", cantidad: stats.docsFinalized },
  ];

  const notifColumns = [
    {
      title: "Dirigida a",
      dataIndex: "directedTo",
      ellipsis: true,
    },
    {
      title: "Cédula",
      dataIndex: "cedule",
      ellipsis: true,
    },
    {
      title: "De",
      render: (_: unknown, record: NotificationDto) =>
        record.provenience?.name || record.otherProvenience || "-",
      ellipsis: true,
    },
    {
      title: "Estado",
      dataIndex: "state",
      width: 110,
      render: (val: number) => {
        if (val === NOTIFICATION_STATES.DELIVERED) return <Tag color="orange">Entregado</Tag>;
        if (val === NOTIFICATION_STATES.FINALIZED) return <Tag color="green">Finalizado</Tag>;
        return <Tag>{val}</Tag>;
      },
    },
  ];

  const docsColumns = [
    {
      title: "Tipo",
      dataIndex: "documentType",
      render: (val: string) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: "Dirigido a",
      dataIndex: "submitTo",
      ellipsis: true,
    },
    {
      title: "Cantidad",
      dataIndex: "amount",
      width: 80,
    },
    {
      title: "Estado",
      dataIndex: "state",
      width: 110,
      render: (val: number) => {
        if (val === DOCUMENT_STATES.DELIVERED) return <Tag color="orange">Entregado</Tag>;
        if (val === DOCUMENT_STATES.FINALIZED) return <Tag color="green">Finalizado</Tag>;
        if (val === DOCUMENT_STATES.REJECTED) return <Tag color="red">Rechazado</Tag>;
        return <Tag>{val}</Tag>;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <Spin size="large" />
        <Text type="secondary">Cargando dashboard...</Text>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ marginBottom: 4 }}>
            Bienvenido, {username || "Usuario"}
          </Title>
          <Text type="secondary">
            Resumen general del sistema
          </Text>
        </Col>
        <Col>
          <Button
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={() => loadDashboard(true)}
            loading={refreshing}
          >
            Actualizar
          </Button>
        </Col>
      </Row>

      {/* Tarjetas principales */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate("/dashboard/notificaciones")} style={{ cursor: "pointer" }}>
            <Statistic
              title="Notificaciones pendientes"
              value={stats.notifPending}
              prefix={<MailOutlined style={{ color: "#fa8c16" }} />}
              valueStyle={{ color: "#fa8c16" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate("/dashboard/documentos")} style={{ cursor: "pointer" }}>
            <Statistic
              title="Documentos pendientes"
              value={stats.docsPending}
              prefix={<FileTextOutlined style={{ color: "#1677ff" }} />}
              valueStyle={{ color: "#1677ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate("/dashboard/notificaciones/entregadas")} style={{ cursor: "pointer" }}>
            <Statistic
              title="Tus notif. por aceptar"
              value={stats.myNotifToAccept}
              prefix={<ClockCircleOutlined style={{ color: stats.myNotifToAccept > 0 ? "#f5222d" : "#52c41a" }} />}
              valueStyle={{ color: stats.myNotifToAccept > 0 ? "#f5222d" : "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate("/dashboard/documentos/entregados")} style={{ cursor: "pointer" }}>
            <Statistic
              title="Tus docs. por aceptar"
              value={stats.myDocsToAccept}
              prefix={<ClockCircleOutlined style={{ color: stats.myDocsToAccept > 0 ? "#f5222d" : "#52c41a" }} />}
              valueStyle={{ color: stats.myDocsToAccept > 0 ? "#f5222d" : "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tarjetas de estado completado */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Notif. entregadas"
              value={stats.notifDelivered}
              prefix={<SendOutlined />}
              valueStyle={{ color: "#fa8c16", fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Notif. finalizadas"
              value={stats.notifFinalized}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a", fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Space split={<Divider type="vertical" />}>
              <Statistic
                title="Docs. finalizados"
                value={stats.docsFinalized}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#52c41a", fontSize: 20 }}
              />
              <Statistic
                title="Docs. rechazados"
                value={stats.docsRejected}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: "#f5222d", fontSize: 20 }}
              />
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Gráficas */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card title="Notificaciones por estado" size="small">
            {notifPieData.length > 0 ? (
              <Pie
                data={notifPieData}
                angleField="value"
                colorField="type"
                radius={0.8}
                innerRadius={0.6}
                height={220}
                label={{
                  text: "value",
                  style: { fontWeight: "bold" },
                }}
                legend={{
                  color: { position: "bottom", layout: { justifyContent: "center" } },
                }}
                scale={{
                  color: { range: ["#fa8c16", "#faad14", "#52c41a"] },
                }}
              />
            ) : (
              <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Text type="secondary">Sin datos</Text>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Documentos por estado" size="small">
            {docsPieData.length > 0 ? (
              <Pie
                data={docsPieData}
                angleField="value"
                colorField="type"
                radius={0.8}
                innerRadius={0.6}
                height={220}
                label={{
                  text: "value",
                  style: { fontWeight: "bold" },
                }}
                legend={{
                  color: { position: "bottom", layout: { justifyContent: "center" } },
                }}
                scale={{
                  color: { range: ["#1677ff", "#fa8c16", "#52c41a", "#f5222d"] },
                }}
              />
            ) : (
              <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Text type="secondary">Sin datos</Text>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Comparativa general" size="small">
            <Column
              data={barData}
              xField="categoria"
              yField="cantidad"
              colorField="tipo"
              group
              height={220}
              legend={{
                color: { position: "bottom", layout: { justifyContent: "center" } },
              }}
              scale={{
                color: { range: ["#fa8c16", "#1677ff"] },
              }}
              style={{
                radiusTopLeft: 4,
                radiusTopRight: 4,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tablas de actividad reciente */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="Últimas notificaciones"
            size="small"
            extra={
              <Button
                type="link"
                icon={<ArrowRightOutlined />}
                onClick={() => navigate("/dashboard/notificaciones/entregadas")}
              >
                Ver todas
              </Button>
            }
          >
            <Table
              rowKey="id"
              columns={notifColumns}
              dataSource={recentNotifs}
              pagination={false}
              size="small"
              locale={{ emptyText: "Sin notificaciones recientes" }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Últimos documentos"
            size="small"
            extra={
              <Button
                type="link"
                icon={<ArrowRightOutlined />}
                onClick={() => navigate("/dashboard/documentos/entregados")}
              >
                Ver todos
              </Button>
            }
          >
            <Table
              rowKey="id"
              columns={docsColumns}
              dataSource={recentDocs}
              pagination={false}
              size="small"
              locale={{ emptyText: "Sin documentos recientes" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default DashboardPage;
