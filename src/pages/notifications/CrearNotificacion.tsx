import React, { useEffect, useState } from "react";
import { Form, Input, Select, Button, message, Row, Col, Modal, Checkbox } from "antd";
import {
  createNotification,
  fetchProveniences,
  fetchPlaces,
  fetchReceivers,
  createProvenience,
  fetchHallsByProvenience,
} from "../../api/notifications";
import { type ProvenienceDto, type HallDto } from "../../api/notifications";

const { Option } = Select;

interface NotificationFormValues {
  creator: number;
  creationPlace: number;
  provenience: number;
  hall?: number;
  otherProvenience?: string;
  cedule: string;
  expedientNum: string;
  directedTo: string;
  recepReceives: number;
}

const CrearNotificacion: React.FC = () => {
  const [form] = Form.useForm<NotificationFormValues>();
  const [proveniences, setProveniences] = useState<ProvenienceDto[]>([]);
  const [places, setPlaces] = useState<{ id: number; name: string }[]>([]);
  const [receivers, setReceivers] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
  const [halls, setHalls] = useState<HallDto[]>([]);
  const [showOther, setShowOther] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [includeHallInNewProv, setIncludeHallInNewProv] = useState(false);
  const [newProvName, setNewProvName] = useState("");
  const [newHallName, setNewHallName] = useState("");

  useEffect(() => {
    fetchProveniences().then(setProveniences).catch(() => message.error("Error al cargar entidades"));
    fetchPlaces().then(setPlaces).catch(() => message.error("Error al cargar lugares"));
    fetchReceivers().then(setReceivers).catch(() => message.error("Error al cargar receptores"));
  }, []);

  const onProvenienceChange = (val: number) => {
    setShowOther(false);
    fetchHallsByProvenience(val)
      .then(setHalls)
      .catch(() => {
        message.error("Error al cargar salas");
        setHalls([]);
      });
  };

  const handleCreateProvenience = async () => {
    if (!newProvName.trim()) {
      message.error("Debe ingresar nombre de entidad");
      return;
    }
    try {
      const prov = await createProvenience({
        name: newProvName,
        halls: includeHallInNewProv ? [] : undefined,
        hallName: includeHallInNewProv ? newHallName : undefined,
      });
      setProveniences((prev) => [...prev, prov]);
      form.setFieldsValue({ provenience: prov.id });

      if (includeHallInNewProv && prov.halls?.length) {
        setHalls(prov.halls);
        form.setFieldsValue({ hall: prov.halls[0].id });
      }

      setModalVisible(false);
      setShowOther(false);
      setNewProvName("");
      setNewHallName("");
      setIncludeHallInNewProv(false);
    } catch {
      message.error("Error al crear entidad");
    }
  };

  const onFinish = async (values: NotificationFormValues) => {
    const payload = {
      creator: values.recepReceives,
      creationPlace: values.creationPlace,
      provenience: values.provenience,
      hall: values.hall,
      otherProvenience: showOther ? values.otherProvenience : undefined,
      cedule: values.cedule,
      expedientNum: values.expedientNum,
      directedTo: values.directedTo,
      recepReceives: values.recepReceives,
    };

    try {
      await createNotification(payload);
      message.success("Notificación creada exitosamente");
      form.resetFields();
    } catch (err: unknown) {
      console.error("❌ Error al crear notificación:", err);
      message.error("Error al crear notificación");
    }
  };

  const filterOption = (input: string, option?: { children?: React.ReactNode; value?: any }) => {
    const label = option?.children;
    return typeof label === "string" && label.toLowerCase().includes(input.toLowerCase());
  };

  return (
    <div>
      <h2>Crear Nueva Notificación</h2>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Entidad / Proveniencia"
              name="provenience"
              rules={[{ required: true, message: "Selecciona entidad o crea una nueva" }]}
            >
              <Select
                placeholder="Selecciona entidad"
                onChange={onProvenienceChange}
                showSearch
                filterOption={filterOption}
              >
                {proveniences.map((p) => (
                  <Option key={p.id} value={p.id}>
                    {p.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Button
              type="link"
              onClick={() => {
                setModalVisible(true);
                setShowOther(true);
                form.setFieldsValue({ hall: undefined });
                setHalls([]);
              }}
              style={{ paddingLeft: 0 }}
            >
              + Agregar nueva entidad
            </Button>
          </Col>

          <Col span={12}>
            {showOther && (
              <Form.Item
                label="Otra entidad"
                name="otherProvenience"
                rules={[{ required: true, message: "Ingresa nombre de entidad" }]}
              >
                <Input placeholder="Nombre entidad" />
              </Form.Item>
            )}
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Sala / Hall"
              name="hall"
              rules={[
                {
                  required: halls.length > 0 && !showOther,
                  message: "Selecciona sala",
                },
              ]}
            >
              <Select
                placeholder="Selecciona sala"
                disabled={halls.length === 0 && !showOther}
                showSearch
                filterOption={filterOption}
              >
                {halls.map((h) => (
                  <Option key={h.id} value={h.id}>
                    {h.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Lugar de recepción"
              name="creationPlace"
              rules={[{ required: true, message: "Selecciona lugar" }]}
            >
              <Select placeholder="Selecciona lugar" showSearch filterOption={filterOption}>
                {places.map((pl) => (
                  <Option key={pl.id} value={pl.id}>
                    {pl.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Receptor (usuario)"
              name="recepReceives"
              rules={[{ required: true, message: "Selecciona receptor" }]}
            >
              <Select placeholder="Selecciona receptor" showSearch filterOption={filterOption}>
                {receivers.map((u) => (
                  <Option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Cédula"
              name="cedule"
              rules={[{ required: true, message: "Ingresa cédula" }]}
            >
              <Input placeholder="Número cédula" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="No. Expediente"
              name="expedientNum"
              rules={[{ required: true }]}
            >
              <Input placeholder="Número expediente" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="Dirigida a"
              name="directedTo"
              rules={[{ required: true }]}
            >
              <Input placeholder="A quién va dirigido" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button type="primary" htmlType="submit">
            Crear Notificación
          </Button>
        </Form.Item>
      </Form>

      <Modal
        title="Crear nueva entidad"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleCreateProvenience}
        okText="Crear"
        cancelText="Cancelar"
      >
        <Form layout="vertical">
          <Form.Item label="Nombre entidad">
            <Input
              value={newProvName}
              onChange={(e) => setNewProvName(e.target.value)}
              placeholder="Nombre entidad"
            />
          </Form.Item>

          <Form.Item>
            <Checkbox
              checked={includeHallInNewProv}
              onChange={(e) => setIncludeHallInNewProv(e.target.checked)}
            >
              Crear sala para esta entidad
            </Checkbox>
          </Form.Item>

          {includeHallInNewProv && (
            <Form.Item label="Nombre sala">
              <Input
                value={newHallName}
                onChange={(e) => setNewHallName(e.target.value)}
                placeholder="Nombre sala"
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default CrearNotificacion;