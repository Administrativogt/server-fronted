import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  Select,
  Button,
  message,
  Row,
  Col,
  Card,
  Space,
  Typography,
  DatePicker,
  Divider,
} from "antd";
import { ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs, { type Dayjs } from "dayjs";
import {
  createNotification,
  fetchProveniences,
  fetchPlaces,
  fetchNotificationReceivers,
  fetchHalls,
  createProvenience,
  fetchHallsByProvenience,
} from "../../api/notifications";
import { type ProvenienceDto, type HallDto } from "../../api/notifications";
import useAuthStore from "../../auth/useAuthStore";
import AddProvenienceModal from "./AddProvenienceModal";

const { Title } = Typography;

/** Valor especial del select de entidad para ingresar texto libre */
const OTHER_PROVENIENCE = -1;

interface NotificationFormValues {
  creationPlace: number;
  provenience: number;
  hall?: number;
  otherProvenience?: string;
  cedule: string;
  expedientNum: string;
  directedTo: string;
  recepReceives: number;
  receptionDatetime?: Dayjs;
}

const CrearNotificacion: React.FC = () => {
  const [form] = Form.useForm<NotificationFormValues>();
  const [proveniences, setProveniences] = useState<ProvenienceDto[]>([]);
  const [places, setPlaces] = useState<{ id: number; name: string }[]>([]);
  const [receivers, setReceivers] = useState<
    { id: number; first_name: string; last_name: string }[]
  >([]);
  const [halls, setHalls] = useState<HallDto[]>([]);
  const [allHalls, setAllHalls] = useState<HallDto[]>([]);
  const [showOther, setShowOther] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [loadingHalls, setLoadingHalls] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const userId = useAuthStore((s) => s.userId);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.allSettled([
      fetchProveniences().then(setProveniences),
      fetchPlaces().then(setPlaces),
      fetchNotificationReceivers().then((recs) => {
        setReceivers(recs);
        // Autocompletar con el usuario logueado si es un receptor válido.
        if (userId && recs.some((r) => r.id === userId)) {
          form.setFieldsValue({ recepReceives: userId });
        }
      }),
      fetchHalls().then(setAllHalls),
    ]).then((results) => {
      if (results.some((r) => r.status === "rejected")) {
        message.error("Error al cargar catálogos, recarga la página");
      }
      setLoadingCatalogs(false);
    });
  }, [userId, form]);

  const onProvenienceChange = (val: number) => {
    form.setFieldsValue({ hall: undefined, otherProvenience: undefined });
    if (val === OTHER_PROVENIENCE) {
      setShowOther(true);
      setHalls([]);
      return;
    }
    setShowOther(false);
    setLoadingHalls(true);
    fetchHallsByProvenience(val)
      .then(setHalls)
      .catch(() => {
        message.error("Error al cargar salas");
        setHalls([]);
      })
      .finally(() => setLoadingHalls(false));
  };

  const handleCreateProvenience = async (
    name: string,
    hallName?: string,
    selectedHalls?: number[],
  ) => {
    try {
      const prov = await createProvenience({
        name,
        halls: selectedHalls,
        hallName,
      });
      setProveniences((prev) => [...prev, prov]);
      setShowOther(false);
      form.setFieldsValue({ provenience: prov.id, otherProvenience: undefined });

      const provHalls = await fetchHallsByProvenience(prov.id).catch(() => prov.halls ?? []);
      setHalls(provHalls);
      form.setFieldsValue({ hall: provHalls.length === 1 ? provHalls[0].id : undefined });

      setModalVisible(false);
      message.success(`Entidad "${prov.name}" creada`);
    } catch {
      message.error("Error al crear entidad");
    }
  };

  const onFinish = async (values: NotificationFormValues) => {
    if (!userId) {
      message.error("No se pudo obtener el usuario logueado");
      return;
    }

    const payload = {
      creator: userId,
      creationPlace: values.creationPlace,
      provenience: showOther ? undefined : values.provenience,
      hall: showOther ? undefined : values.hall,
      otherProvenience: showOther ? values.otherProvenience : undefined,
      cedule: values.cedule,
      expedientNum: values.expedientNum,
      directedTo: values.directedTo,
      recepReceives: values.recepReceives,
      receptionDatetime: values.receptionDatetime?.toISOString(),
    };

    setSubmitting(true);
    try {
      await createNotification(payload);
      message.success("Notificación creada exitosamente");
      navigate("/dashboard/notificaciones");
    } catch (err: unknown) {
      console.error("Error al crear notificación:", err);
      message.error("Error al crear notificación");
    } finally {
      setSubmitting(false);
    }
  };

  const provenienceOptions = [
    { value: OTHER_PROVENIENCE, label: "Otra entidad (escribir manualmente)" },
    ...proveniences.map((p) => ({ value: p.id, label: p.name })),
  ];

  const hallPlaceholder = showOther
    ? "No aplica para entidad manual"
    : halls.length === 0
      ? "Selecciona una entidad primero"
      : "Selecciona sala";

  return (
    <div style={{ maxWidth: 1200 }}>
      <Space style={{ marginBottom: 16 }} align="center">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/dashboard/notificaciones")}
        >
          Volver
        </Button>
        <Title level={3} style={{ margin: 0 }}>
          Crear Nueva Notificación
        </Title>
      </Space>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ receptionDatetime: dayjs() }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                label="Entidad / Proveniencia"
                name="provenience"
                rules={[{ required: true, message: "Selecciona entidad o crea una nueva" }]}
              >
                <Select
                  placeholder="Selecciona entidad"
                  onChange={onProvenienceChange}
                  showSearch
                  optionFilterProp="label"
                  options={provenienceOptions}
                  loading={loadingCatalogs}
                  popupRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: "8px 0" }} />
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        block
                        style={{ textAlign: "left" }}
                        onClick={() => setModalVisible(true)}
                      >
                        Agregar nueva entidad
                      </Button>
                    </>
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              {showOther ? (
                <Form.Item
                  label="Nombre de la otra entidad"
                  name="otherProvenience"
                  rules={[{ required: true, message: "Ingresa el nombre de la entidad" }]}
                >
                  <Input placeholder="Nombre de la entidad" />
                </Form.Item>
              ) : halls.length > 0 ? (
                <Form.Item
                  label="Sala / Hall"
                  name="hall"
                  rules={[{ required: true, message: "Selecciona sala" }]}
                >
                  <Select
                    placeholder={hallPlaceholder}
                    showSearch
                    optionFilterProp="label"
                    loading={loadingHalls}
                    options={halls.map((h) => ({ value: h.id, label: h.name }))}
                  />
                </Form.Item>
              ) : null}
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item
                label="Lugar de recepción"
                name="creationPlace"
                rules={[{ required: true, message: "Selecciona lugar" }]}
              >
                <Select
                  placeholder="Selecciona lugar"
                  showSearch
                  optionFilterProp="label"
                  loading={loadingCatalogs}
                  options={places.map((pl) => ({ value: pl.id, label: pl.name }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item
                label="Receptor (usuario)"
                name="recepReceives"
                rules={[{ required: true, message: "Selecciona receptor" }]}
              >
                <Select
                  placeholder="Selecciona receptor"
                  showSearch
                  optionFilterProp="label"
                  loading={loadingCatalogs}
                  options={receivers.map((u) => ({
                    value: u.id,
                    label: `${u.first_name} ${u.last_name}`,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item
                label="Fecha y hora de recepción"
                name="receptionDatetime"
                rules={[{ required: true, message: "Selecciona fecha y hora" }]}
              >
                <DatePicker
                  showTime={{ format: "HH:mm" }}
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item
                label="Cédula"
                name="cedule"
                rules={[{ required: true, message: "Ingresa la cédula" }]}
              >
                <Input placeholder="Número cédula" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item
                label="No. Expediente"
                name="expedientNum"
                rules={[{ required: true, message: "Ingresa el número de expediente" }]}
              >
                <Input placeholder="Número expediente" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={16}>
              <Form.Item
                label="Dirigida a"
                name="directedTo"
                rules={[{ required: true, message: "Ingresa a quién va dirigida" }]}
              >
                <Input placeholder="A quién va dirigido" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Crear Notificación
              </Button>
              <Button onClick={() => navigate("/dashboard/notificaciones")} disabled={submitting}>
                Cancelar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <AddProvenienceModal
        open={modalVisible}
        halls={allHalls}
        onCancel={() => setModalVisible(false)}
        onCreate={handleCreateProvenience}
      />
    </div>
  );
};

export default CrearNotificacion;
