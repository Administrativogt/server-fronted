import React, { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  InputNumber,
  Row,
  Col,
  message,
  Typography,
} from "antd";
import {
  UserOutlined,
  FileTextOutlined,
  SendOutlined,
  NumberOutlined,
  InboxOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import {
  fetchUsers,
  fetchDocumentReceivers,
  updateDocument,
  type DocumentDto,
  DOCUMENT_STATES,
} from "../../api/documents";
import { fetchPlaces, type PlaceDto } from "../../api/notifications";
import type { User } from "../../types/user.types";
import { buildReceiverOptions } from "./receiverOptions";

const { Text } = Typography;

const DOCUMENT_TYPES = ["Sobre", "Folder", "Cheque", "Revista"];

interface Props {
  document: DocumentDto | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditDocumentModal: React.FC<Props> = ({ document, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState<User[]>([]);
  const [receivers, setReceivers] = useState<User[]>([]);
  const [places, setPlaces] = useState<PlaceDto[]>([]);
  const [otroEntregadoPor, setOtroEntregadoPor] = useState(false);
  const [otroTipoDoc, setOtroTipoDoc] = useState(false);
  const [otroEntregadoA, setOtroEntregadoA] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // En documentos ya entregados, deliverTo guarda quién lo recibió realmente
  // (ID de usuario o texto libre) y se edita aparte; en pendientes sigue
  // espejando submitTo.
  const isDelivered = !!document && document.state !== DOCUMENT_STATES.PENDING;

  useEffect(() => {
    fetchUsers().then(setUsers).catch(() => {});
    fetchDocumentReceivers().then(setReceivers).catch(() => {});
    fetchPlaces().then(setPlaces).catch(() => {});
  }, []);

  useEffect(() => {
    if (!document) return;

    const deliverByIsId = !!document.documentDeliverBy && /^\d+$/.test(document.documentDeliverBy);
    const typeInList = DOCUMENT_TYPES.includes(document.documentType);
    const deliverToIsId = !!document.deliverTo && /^\d+$/.test(document.deliverTo);

    setOtroEntregadoPor(!deliverByIsId);
    setOtroTipoDoc(!typeInList);
    setOtroEntregadoA(!deliverToIsId);

    form.setFieldsValue({
      documentDeliverBy: deliverByIsId ? Number(document.documentDeliverBy) : undefined,
      documentDeliverByOther: deliverByIsId ? undefined : document.documentDeliverBy,
      documentType: typeInList ? document.documentType : undefined,
      documentTypeOther: typeInList ? undefined : document.documentType,
      submitTo: document.submitTo,
      amount: document.amount,
      receivedBy: document.receivedBy?.id,
      creationPlace: document.creationPlace?.id,
      deliverTo: deliverToIsId ? Number(document.deliverTo) : undefined,
      deliverToOther: deliverToIsId ? undefined : document.deliverTo,
    });
  }, [document, form]);

  const handleOk = async () => {
    if (!document) return;
    try {
      const values = await form.validateFields();

      const documentDeliverBy = otroEntregadoPor
        ? String(values.documentDeliverByOther)
        : String(values.documentDeliverBy);
      const documentType = otroTipoDoc
        ? String(values.documentTypeOther)
        : String(values.documentType);

      const deliverTo = isDelivered
        ? otroEntregadoA
          ? String(values.deliverToOther)
          : String(values.deliverTo)
        : values.submitTo;

      setSubmitting(true);
      await updateDocument(document.id, {
        documentDeliverBy,
        documentType,
        submitTo: values.submitTo,
        deliverTo,
        amount: Number(values.amount),
        receivedBy: values.receivedBy,
        creationPlace: values.creationPlace,
      } as Partial<DocumentDto>);
      message.success("Documento actualizado");
      onSuccess();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errorFields" in err) return; // validación
      message.error("Error al actualizar documento");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Editar documento #${document?.id ?? ""}`}
      open={!!document}
      onOk={handleOk}
      onCancel={onClose}
      okText="Guardar cambios"
      cancelText="Cancelar"
      confirmLoading={submitting}
      width={720}
      destroyOnClose
    >
      <Form layout="vertical" form={form} requiredMark="optional">
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Documentos entregados por"
              name="documentDeliverBy"
              rules={[
                { required: !otroEntregadoPor, message: "Selecciona quien entrega" },
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
              rules={[
                { required: !otroTipoDoc, message: "Selecciona tipo de documento" },
              ]}
            >
              <Select
                placeholder="Escribe para buscar..."
                disabled={otroTipoDoc}
                showSearch
                optionFilterProp="label"
                suffixIcon={<FileTextOutlined />}
                options={DOCUMENT_TYPES.map((t) => ({ value: t, label: t }))}
              />
            </Form.Item>
            {otroTipoDoc && (
              <Form.Item
                name="documentTypeOther"
                rules={[{ required: true, message: "Ingresa tipo de documento" }]}
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

        <Row gutter={[16, 0]} style={{ marginTop: 8 }}>
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

        <Row gutter={[16, 0]}>
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
                options={buildReceiverOptions(receivers, users)}
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
                options={places.map((p) => ({ value: p.id, label: p.name }))}
              />
            </Form.Item>
          </Col>
        </Row>

        {isDelivered && (
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Entregado a"
                name="deliverTo"
                rules={[
                  { required: !otroEntregadoA, message: "Selecciona quien recibió" },
                ]}
              >
                <Select
                  placeholder="Escribe para buscar..."
                  disabled={otroEntregadoA}
                  showSearch
                  optionFilterProp="label"
                  suffixIcon={<UserOutlined />}
                  options={users.map((u) => ({
                    value: u.id,
                    label: `${u.first_name} ${u.last_name}`,
                  }))}
                />
              </Form.Item>
              {otroEntregadoA && (
                <Form.Item
                  name="deliverToOther"
                  rules={[{ required: true, message: "Ingresa nombre" }]}
                >
                  <Input
                    placeholder="Nombre de quien recibió"
                    prefix={<UserOutlined style={{ color: "#94a3b8" }} />}
                  />
                </Form.Item>
              )}
              <Checkbox
                checked={otroEntregadoA}
                onChange={(e) => setOtroEntregadoA(e.target.checked)}
                style={{ marginTop: -8 }}
              >
                <Text type="secondary">No está en la lista (otro)</Text>
              </Checkbox>
            </Col>
          </Row>
        )}
      </Form>
    </Modal>
  );
};

export default EditDocumentModal;
