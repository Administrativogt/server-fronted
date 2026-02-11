import React, { useEffect, useState } from "react";
import { Form, Input, Select, Checkbox, Button, message, Row, Col, InputNumber } from "antd";
import { fetchUsers, createDocument } from "../../api/documents";
import { fetchPlaces, type PlaceDto } from "../../api/notifications";
import { fetchDocumentFilterValues } from "../../api/documents";
import type { User } from "../../types/user.types";

const CreateDocumentForm: React.FC = () => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState<User[]>([]);
  const [places, setPlaces] = useState<PlaceDto[]>([]);
  const [documentTypeSuggestions, setDocumentTypeSuggestions] = useState<string[]>([]);
  const [otroEntregadoPor, setOtroEntregadoPor] = useState(false);
  const [otroTipoDoc, setOtroTipoDoc] = useState(false);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => message.error("Error cargando usuarios"));

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
    }
  };

  return (
    <Form layout="vertical" form={form} onFinish={onFinish}>
      {/* Fila 1: Entregado por | Tipo de documento */}
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="Documentos entregados por"
            name="documentDeliverBy"
            rules={[{ required: !otroEntregadoPor, message: "Selecciona quien entrega" }]}
          >
            <Select
              placeholder="Escribe para buscar..."
              disabled={otroEntregadoPor}
              showSearch
              optionFilterProp="label"
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
              label="Otro (nombre)"
            >
              <Input placeholder="Nombre de persona" />
            </Form.Item>
          )}
          <Checkbox
            checked={otroEntregadoPor}
            onChange={(e) => setOtroEntregadoPor(e.target.checked)}
          >
            Otro
          </Checkbox>
        </Col>

        <Col span={12}>
          <Form.Item
            label="Tipo de documento"
            name="documentType"
            rules={[{ required: !otroTipoDoc, message: "Selecciona tipo de documento" }]}
          >
            <Select
              placeholder="Escribe para buscar..."
              disabled={otroTipoDoc}
              showSearch
              optionFilterProp="label"
              options={documentTypeSuggestions.map((t) => ({
                value: t,
                label: t,
              }))}
            />
          </Form.Item>
          {otroTipoDoc && (
            <Form.Item
              name="documentTypeOther"
              rules={[{ required: true, message: "Ingresa tipo de documento" }]}
              label="Otro (tipo)"
            >
              <Input placeholder="Escribe el tipo de documento" />
            </Form.Item>
          )}
          <Checkbox
            checked={otroTipoDoc}
            onChange={(e) => setOtroTipoDoc(e.target.checked)}
          >
            Otro
          </Checkbox>
        </Col>
      </Row>

      {/* Fila 2: Para entregar a | No. de documentos */}
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="Para entregar a"
            name="submitTo"
            rules={[{ required: true, message: "Ingresa destino" }]}
          >
            <Input placeholder="Ej. Gerencia, DHL, etc." />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            label="No. de documentos"
            name="amount"
            rules={[{ required: true, message: "Ingresa cantidad" }]}
          >
            <InputNumber min={1} placeholder="Ej. 1" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>

      {/* Fila 3: Recibido por | Recibido en */}
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="Recibido por"
            name="receivedBy"
            rules={[{ required: true, message: "Selecciona quien recibe" }]}
          >
            <Select
              placeholder="Escribe para buscar..."
              showSearch
              optionFilterProp="label"
              options={users.map((u) => ({
                value: u.id,
                label: `${u.first_name} ${u.last_name}`,
              }))}
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            label="Recibido en"
            name="creationPlace"
            rules={[{ required: true, message: "Selecciona lugar" }]}
          >
            <Select
              placeholder="Selecciona lugar"
              showSearch
              optionFilterProp="label"
              options={places.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          Crear documento
        </Button>
      </Form.Item>
    </Form>
  );
};

export default CreateDocumentForm;
