import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  message,
  Row,
  Col,
  InputNumber,
  Card,
  Typography,
  Divider,
  Space,
} from "antd";
import {
  FileAddOutlined,
  UserOutlined,
  FileTextOutlined,
  SendOutlined,
  NumberOutlined,
  InboxOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  fetchUsers,
  fetchDocumentReceivers,
  createDocument,
} from "../../api/documents";
import { fetchPlaces, type PlaceDto } from "../../api/notifications";
import { fetchDocumentFilterValues } from "../../api/documents";
import type { User } from "../../types/user.types";

const { Title, Text } = Typography;

const CreateDocumentForm: React.FC = () => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState<User[]>([]);
  const [receivers, setReceivers] = useState<User[]>([]);
  const [places, setPlaces] = useState<PlaceDto[]>([]);
  const [documentTypeSuggestions, setDocumentTypeSuggestions] = useState<string[]>([]);
  const [otroEntregadoPor, setOtroEntregadoPor] = useState(false);
  const [otroTipoDoc, setOtroTipoDoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => message.error("Error cargando usuarios"));

    fetchDocumentReceivers()
      .then(setReceivers)
      .catch(() => message.error("Error cargando receptores"));

    fetchPlaces()
      .then(setPlaces)
      .catch(() => message.error("Error cargando lugares"));

    fetchDocumentFilterValues()
      .then((meta) => setDocumentTypeSuggestions(meta.documentTypes || []))
      .catch(() => {});
  }, []);

  const onFinish = async (values: Record<string, unknown>) => {
    const documentDeliverBy = otroEntregadoPor
      ? String(values.documentDeliverByOther)
      : String(values.documentDeliverBy);

    const documentType = otroTipoDoc
      ? String(values.documentTypeOther)
      : String(values.documentType);

    setSubmitting(true);
    try {
      await createDocument({
        documentDeliverBy,
        documentType,
        submitTo: values.submitTo as string,
        deliverTo: values.submitTo as string,
        amount: Number(values.amount),
        receivedBy: values.receivedBy as number,
        creationPlace: values.creationPlace as number,
      });
      message.success("Documento creado exitosamente");
      form.resetFields();
      setOtroEntregadoPor(false);
      setOtroTipoDoc(false);
    } catch (err: unknown) {
      message.error("Error al crear documento");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setOtroEntregadoPor(false);
    setOtroTipoDoc(false);
  };

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "24px 16px",
      }}
    >
      <Card
        bordered={false}
        style={{
          borderRadius: 16,
          boxShadow: "0 4px 24px rgba(15, 23, 42, 0.06)",
        }}
        bodyStyle={{ padding: 32 }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Space align="center" size={12} style={{ marginBottom: 8 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 20,
              }}
            >
              <FileAddOutlined />
            </div>
            <div>
              <Title level={3} style={{ margin: 0, lineHeight: 1.2 }}>
                Crear nuevo documento
              </Title>
              <Text type="secondary">
                Registra la recepción y destino de un documento entregado en oficina
              </Text>
            </div>
          </Space>
        </div>

        <Form
          layout="vertical"
          form={form}
          onFinish={onFinish}
          requiredMark="optional"
          size="large"
        >
          {/* Sección: Información del documento */}
          <Divider orientation="left" orientationMargin={0} style={{ marginTop: 0 }}>
            <Text strong style={{ fontSize: 13, color: "#475569" }}>
              INFORMACIÓN DEL DOCUMENTO
            </Text>
          </Divider>

          <Row gutter={[20, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Documentos entregados por"
                name="documentDeliverBy"
                required={!otroEntregadoPor}
                rules={[
                  {
                    required: !otroEntregadoPor,
                    message: "Selecciona quien entrega",
                  },
                ]}
              >
                <Select
                  placeholder="Escribe para buscar..."
                  disabled={otroEntregadoPor}
                  showSearch
                  optionFilterProp="label"
                  suffixIcon={<UserOutlined />}
                  options={users.map((u) => ({
                    value: u.id,
                    label: `${u.first_name} ${u.last_name}`,
                  }))}
                />
              </Form.Item>
              {otroEntregadoPor && (
                <Form.Item
                  name="documentDeliverByOther"
                  rules={[{ required: true, message: "Ingresa nombre" }]}
                >
                  <Input
                    placeholder="Nombre de la persona externa"
                    prefix={<UserOutlined style={{ color: "#94a3b8" }} />}
                  />
                </Form.Item>
              )}
              <Checkbox
                checked={otroEntregadoPor}
                onChange={(e) => setOtroEntregadoPor(e.target.checked)}
                style={{ marginTop: -8 }}
              >
                <Text type="secondary">No está en la lista (otro)</Text>
              </Checkbox>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Tipo de documento"
                name="documentType"
                required={!otroTipoDoc}
                rules={[
                  {
                    required: !otroTipoDoc,
                    message: "Selecciona tipo de documento",
                  },
                ]}
              >
                <Select
                  placeholder="Escribe para buscar..."
                  disabled={otroTipoDoc}
                  showSearch
                  optionFilterProp="label"
                  suffixIcon={<FileTextOutlined />}
                  options={documentTypeSuggestions.map((t) => ({
                    value: t,
                    label: t,
                  }))}
                />
              </Form.Item>
              {otroTipoDoc && (
                <Form.Item
                  name="documentTypeOther"
                  rules={[
                    { required: true, message: "Ingresa tipo de documento" },
                  ]}
                >
                  <Input
                    placeholder="Escribe el tipo de documento"
                    prefix={<FileTextOutlined style={{ color: "#94a3b8" }} />}
                  />
                </Form.Item>
              )}
              <Checkbox
                checked={otroTipoDoc}
                onChange={(e) => setOtroTipoDoc(e.target.checked)}
                style={{ marginTop: -8 }}
              >
                <Text type="secondary">No está en la lista (otro)</Text>
              </Checkbox>
            </Col>
          </Row>

          <Row gutter={[20, 0]} style={{ marginTop: 16 }}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Para entregar a"
                name="submitTo"
                rules={[{ required: true, message: "Ingresa destino" }]}
              >
                <Input
                  placeholder="Ej. Gerencia, DHL, etc."
                  prefix={<SendOutlined style={{ color: "#94a3b8" }} />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="No. de documentos"
                name="amount"
                rules={[{ required: true, message: "Ingresa cantidad" }]}
              >
                <InputNumber
                  min={1}
                  placeholder="Ej. 1"
                  prefix={<NumberOutlined style={{ color: "#94a3b8" }} />}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Sección: Recepción */}
          <Divider orientation="left" orientationMargin={0} style={{ marginTop: 16 }}>
            <Text strong style={{ fontSize: 13, color: "#475569" }}>
              RECEPCIÓN
            </Text>
          </Divider>

          <Row gutter={[20, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Recibido por"
                name="receivedBy"
                rules={[{ required: true, message: "Selecciona quien recibe" }]}
              >
                <Select
                  placeholder="Escribe para buscar..."
                  showSearch
                  optionFilterProp="label"
                  suffixIcon={<InboxOutlined />}
                  options={receivers.map((u) => ({
                    value: u.id,
                    label: `${u.first_name} ${u.last_name}`,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Recibido en"
                name="creationPlace"
                rules={[{ required: true, message: "Selecciona lugar" }]}
              >
                <Select
                  placeholder="Selecciona lugar"
                  showSearch
                  optionFilterProp="label"
                  suffixIcon={<EnvironmentOutlined />}
                  options={places.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Footer con botones */}
          <Divider style={{ margin: "8px 0 24px" }} />
          <Row justify="end" gutter={12}>
            <Col>
              <Button
                onClick={handleReset}
                icon={<ReloadOutlined />}
                disabled={submitting}
              >
                Limpiar
              </Button>
            </Col>
            <Col>
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
                loading={submitting}
              >
                Crear documento
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
};

export default CreateDocumentForm;
