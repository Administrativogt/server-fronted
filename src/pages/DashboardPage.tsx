import React, { useEffect, useState, useCallback } from "react";
import { Card, Col, Row, Typography, Table, Tag, Spin, Button, Tooltip, Badge } from "antd";
import {
  MailOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  RightOutlined,
  ExclamationCircleFilled,
} from "@ant-design/icons";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveBar } from "@nivo/bar";
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

// ── PrimaryCard — gradient style ─────────────────────────────────────
interface PrimaryCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: [string, string];
  shadow: string;
  footer: string;
  onClick: () => void;
  urgent?: boolean;
}

function PrimaryCard({ title, value, icon, gradient, shadow, footer, onClick, urgent }: PrimaryCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`,
        borderRadius: 16,
        padding: "22px 22px 18px",
        boxShadow: hovered
          ? `0 16px 36px ${shadow}`
          : `0 4px 16px ${shadow}`,
        transform: hovered ? "translateY(-4px) scale(1.01)" : "translateY(0) scale(1)",
        transition: "box-shadow 0.25s ease, transform 0.25s ease",
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
        minHeight: 148,
      }}
    >
      {/* Large decorative background icon */}
      <div style={{
        position: "absolute",
        right: -10,
        bottom: -10,
        fontSize: 100,
        color: "rgba(255,255,255,0.12)",
        lineHeight: 1,
        pointerEvents: "none",
        transition: "transform 0.25s ease, opacity 0.25s ease",
        transform: hovered ? "scale(1.12) rotate(-8deg)" : "scale(1) rotate(0deg)",
      }}>
        {icon}
      </div>

      {/* Urgent pulse dot */}
      {urgent && value > 0 && (
        <div style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 0 0 3px rgba(255,255,255,0.4)",
          animation: "pulse 1.5s infinite",
        }} />
      )}

      {/* Label */}
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: "rgba(255,255,255,0.75)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 10,
      }}>
        {title}
      </div>

      {/* Value */}
      <div style={{
        fontSize: 42,
        fontWeight: 800,
        color: "#fff",
        lineHeight: 1,
        marginBottom: 18,
        letterSpacing: "-2px",
      }}>
        {value.toLocaleString()}
      </div>

      {/* Footer link */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        color: "rgba(255,255,255,0.80)",
        fontSize: 12,
        fontWeight: 500,
        transition: "color 0.2s",
      }}>
        <span>{footer}</span>
        <RightOutlined style={{
          fontSize: 10,
          transition: "transform 0.2s ease",
          transform: hovered ? "translateX(4px)" : "translateX(0)",
        }} />
      </div>
    </div>
  );
}

// ── MiniCard — outlined pill style ───────────────────────────────────
interface MiniCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  gradient: [string, string];
}

function MiniCard({ title, value, icon, color, gradient }: MiniCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? `linear-gradient(135deg, ${gradient[0]}18, ${gradient[1]}28)`
          : "#fff",
        borderRadius: 12,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        border: `1.5px solid ${hovered ? color + "66" : "#ebebeb"}`,
        boxShadow: hovered ? `0 6px 18px ${color}22` : "0 1px 3px rgba(0,0,0,0.05)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s ease",
        cursor: "default",
      }}
    >
      {/* Icon pill */}
      <div style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: hovered ? color : color + "18",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 17,
        color: hovered ? "#fff" : color,
        flexShrink: 0,
        transition: "background 0.2s, color 0.2s",
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontSize: 11,
          color: "#aaa",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 3,
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 20,
          fontWeight: 700,
          color: hovered ? color : "#1f1f1f",
          lineHeight: 1,
          transition: "color 0.2s",
        }}>
          {value.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// ── DashboardStats interface ──────────────────────────────────────────
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
  const firstName = useAuthStore((s) => s.firstName);
  const lastName = useAuthStore((s) => s.lastName);
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

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <Title level={2} style={{ marginBottom: 2, fontWeight: 700, letterSpacing: "-0.5px" }}>
            Bienvenido, {firstName ? `${firstName} ${lastName}`.trim() : username || "Usuario"} 👋
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            {" · "}Resumen general del sistema
          </Text>
        </div>
        <Tooltip title="Refrescar datos">
          <Button
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={() => loadDashboard(true)}
            loading={refreshing}
            style={{ borderRadius: 8, fontWeight: 500 }}
          >
            Actualizar
          </Button>
        </Tooltip>
      </div>

      {/* ── Primary action cards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <PrimaryCard
            title="Notificaciones pendientes"
            value={stats.notifPending}
            icon={<MailOutlined />}
            gradient={["#ff9a3c", "#fa5c00"]}
            shadow="rgba(250,92,0,0.35)"
            onClick={() => navigate("/dashboard/notificaciones")}
            footer="Ver notificaciones"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <PrimaryCard
            title="Documentos pendientes"
            value={stats.docsPending}
            icon={<FileTextOutlined />}
            gradient={["#4facfe", "#1677ff"]}
            shadow="rgba(22,119,255,0.32)"
            onClick={() => navigate("/dashboard/documentos")}
            footer="Ver documentos"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <PrimaryCard
            title="Mis notif. por aceptar"
            value={stats.myNotifToAccept}
            icon={<ClockCircleOutlined />}
            gradient={stats.myNotifToAccept > 0 ? ["#ff4d4f", "#cf1322"] : ["#73d13d", "#389e0d"]}
            shadow={stats.myNotifToAccept > 0 ? "rgba(207,19,34,0.32)" : "rgba(56,158,13,0.28)"}
            onClick={() => navigate("/dashboard/notificaciones/entregadas")}
            footer="Ir a mis notificaciones"
            urgent={stats.myNotifToAccept > 0}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <PrimaryCard
            title="Mis docs. por aceptar"
            value={stats.myDocsToAccept}
            icon={<ClockCircleOutlined />}
            gradient={stats.myDocsToAccept > 0 ? ["#ff4d4f", "#cf1322"] : ["#73d13d", "#389e0d"]}
            shadow={stats.myDocsToAccept > 0 ? "rgba(207,19,34,0.32)" : "rgba(56,158,13,0.28)"}
            onClick={() => navigate("/dashboard/documentos/entregados")}
            footer="Ir a mis documentos"
            urgent={stats.myDocsToAccept > 0}
          />
        </Col>
      </Row>

      {/* ── Secondary stat cards ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6} lg={24 / 5}>
          <MiniCard
            title="Notif. entregadas"
            value={stats.notifDelivered}
            icon={<SendOutlined />}
            color="#fa8c16"
            gradient={["#ff9a3c", "#fa5c00"]}
          />
        </Col>
        <Col xs={12} sm={8} md={6} lg={24 / 5}>
          <MiniCard
            title="Notif. finalizadas"
            value={stats.notifFinalized}
            icon={<CheckCircleOutlined />}
            color="#52c41a"
            gradient={["#73d13d", "#389e0d"]}
          />
        </Col>
        <Col xs={12} sm={8} md={6} lg={24 / 5}>
          <MiniCard
            title="Docs. entregados"
            value={stats.docsDelivered}
            icon={<SendOutlined />}
            color="#1677ff"
            gradient={["#4facfe", "#1677ff"]}
          />
        </Col>
        <Col xs={12} sm={8} md={6} lg={24 / 5}>
          <MiniCard
            title="Docs. finalizados"
            value={stats.docsFinalized}
            icon={<CheckCircleOutlined />}
            color="#52c41a"
            gradient={["#73d13d", "#389e0d"]}
          />
        </Col>
        <Col xs={12} sm={8} md={6} lg={24 / 5}>
          <MiniCard
            title="Docs. rechazados"
            value={stats.docsRejected}
            icon={<CloseCircleOutlined />}
            color="#f5222d"
            gradient={["#ff4d4f", "#cf1322"]}
          />
        </Col>
      </Row>

      {/* Gráficas */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card title="Notificaciones por estado" size="small">
            {notifPieData.length > 0 ? (
              <div style={{ height: 220 }}>
                <ResponsivePie
                  data={notifPieData.map((d) => ({ id: d.type, label: d.type, value: d.value }))}
                  innerRadius={0.6}
                  padAngle={2}
                  cornerRadius={3}
                  colors={["#fa8c16", "#faad14", "#52c41a"]}
                  arcLinkLabelsSkipAngle={10}
                  arcLinkLabelsTextColor="#666"
                  arcLinkLabelsThickness={2}
                  arcLinkLabelsColor={{ from: "color" }}
                  arcLabelsSkipAngle={10}
                  legends={[{
                    anchor: "bottom",
                    direction: "row",
                    translateY: 32,
                    itemWidth: 90,
                    itemHeight: 14,
                    symbolSize: 12,
                    symbolShape: "circle",
                  }]}
                  margin={{ top: 16, right: 16, bottom: 40, left: 16 }}
                />
              </div>
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
              <div style={{ height: 220 }}>
                <ResponsivePie
                  data={docsPieData.map((d) => ({ id: d.type, label: d.type, value: d.value }))}
                  innerRadius={0.6}
                  padAngle={2}
                  cornerRadius={3}
                  colors={["#1677ff", "#fa8c16", "#52c41a", "#f5222d"]}
                  arcLinkLabelsSkipAngle={10}
                  arcLinkLabelsTextColor="#666"
                  arcLinkLabelsThickness={2}
                  arcLinkLabelsColor={{ from: "color" }}
                  arcLabelsSkipAngle={10}
                  legends={[{
                    anchor: "bottom",
                    direction: "row",
                    translateY: 32,
                    itemWidth: 90,
                    itemHeight: 14,
                    symbolSize: 12,
                    symbolShape: "circle",
                  }]}
                  margin={{ top: 16, right: 16, bottom: 40, left: 16 }}
                />
              </div>
            ) : (
              <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Text type="secondary">Sin datos</Text>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Comparativa general" size="small">
            <div style={{ height: 220 }}>
              <ResponsiveBar
                data={[
                  { categoria: "Pendientes", Notificaciones: stats.notifPending, Documentos: stats.docsPending },
                  { categoria: "Entregados", Notificaciones: stats.notifDelivered, Documentos: stats.docsDelivered },
                  { categoria: "Finalizados", Notificaciones: stats.notifFinalized, Documentos: stats.docsFinalized },
                ]}
                keys={["Notificaciones", "Documentos"]}
                indexBy="categoria"
                groupMode="grouped"
                colors={["#fa8c16", "#1677ff"]}
                borderRadius={3}
                padding={0.3}
                innerPadding={3}
                axisBottom={{ tickSize: 0, tickPadding: 8 }}
                axisLeft={{ tickSize: 0, tickPadding: 8 }}
                enableGridY
                gridYValues={4}
                enableLabel={false}
                legends={[{
                  dataFrom: "keys",
                  anchor: "bottom",
                  direction: "row",
                  translateY: 32,
                  itemWidth: 90,
                  itemHeight: 14,
                  symbolSize: 12,
                  symbolShape: "square",
                }]}
                margin={{ top: 8, right: 16, bottom: 40, left: 32 }}
              />
            </div>
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
