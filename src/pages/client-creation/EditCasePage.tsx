import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Row,
  Col,
  InputNumber,
  Spin,
} from 'antd';
import {
  getCaseAreas,
  getCoordinatingPartners,
  getPartners,
  getBillingTypes,
  getAddressedToUsers,
  getCase,
  updateCase,
} from '../../api/clientCreation';
import type { CatalogItem, PartnerItem, AddressedToUser, CreateCasePayload } from '../../api/clientCreation';

const { Option } = Select;
const { TextArea } = Input;

const EditCasePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [caseAreas, setCaseAreas] = useState<CatalogItem[]>([]);
  const [coordinatingPartners, setCoordinatingPartners] = useState<CatalogItem[]>([]);
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [billingTypes, setBillingTypes] = useState<CatalogItem[]>([]);
  const [addressedToUsers, setAddressedToUsers] = useState<AddressedToUser[]>([]);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [areasRes, coordRes, partnersRes, billingRes, addressedRes] = await Promise.all([
          getCaseAreas().catch(() => []),
          getCoordinatingPartners().catch(() => []),
          getPartners().catch(() => []),
          getBillingTypes().catch(() => []),
          getAddressedToUsers().catch(() => []),
        ]);
        setCaseAreas(areasRes || []);
        setCoordinatingPartners(coordRes || []);
        setPartners(partnersRes || []);
        setBillingTypes(billingRes || []);
        setAddressedToUsers(addressedRes || []);

        if (id) {
          const caseData = await getCase(Number(id));
          form.setFieldsValue({
            client: caseData.client,
            area_id: caseData.area?.id,
            concept: caseData.concept,
            currency: caseData.currency,
            coordinating_partner_id: caseData.coordinating_partner?.id,
            partner_in_charge_id: caseData.partner_in_charge?.id,
            responsible: caseData.responsible,
            addressed_to_id: caseData.addressed_to?.id,
            billing_type_id: caseData.billing_type?.id,
            limit_of_hours: caseData.limit_of_hours,
            amount_of_fees: caseData.amount_of_fees,
            fee_type: caseData.fee_type,
            name_of_contact: caseData.name_of_contact,
            phone: caseData.phone,
            email: caseData.email,
          });
        }
      } catch {
        message.error('Error al cargar datos');
      } finally {
        setInitialLoading(false);
      }
    };
    loadAll();
  }, [id, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await updateCase(Number(id), values as Partial<CreateCasePayload>);
      message.success('Caso actualizado exitosamente');
      navigate('/dashboard/casos/solicitudes');
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || 'No se pudo actualizar el caso');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div style={{ padding: 16 }}>
      <Card title="Editar Solicitud de Caso">
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="client" label="Cliente (nombre)" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="area_id" label="Área del caso" rules={[{ required: true }]}>
                <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                  {caseAreas.map(a => (
                    <Option key={a.id} value={a.id}>{a.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="concept" label="Concepto" rules={[{ required: true }]}>
                <TextArea rows={3} />
              </Form.Item>
              <Form.Item name="currency" label="Moneda" rules={[{ required: true }]}>
                <Select>
                  <Option value="GTQ">GTQ (Quetzales)</Option>
                  <Option value="USD">USD (Dólares)</Option>
                </Select>
              </Form.Item>
              <Form.Item name="amount_of_fees" label="Monto de honorarios">
                <Input />
              </Form.Item>
              <Form.Item name="limit_of_hours" label="Límite de horas">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="fee_type" label="Tipo de honorario">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="coordinating_partner_id" label="Socio coordinador" rules={[{ required: true }]}>
                <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                  {coordinatingPartners.map(cp => (
                    <Option key={cp.id} value={cp.id}>{cp.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="partner_in_charge_id" label="Socio encargado" rules={[{ required: true }]}>
                <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                  {partners.map(p => (
                    <Option key={p.id} value={p.id}>{p.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="responsible" label="Responsable" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="addressed_to_id" label="Dirigido a" rules={[{ required: true }]}>
                <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                  {addressedToUsers.map(u => (
                    <Option key={u.id} value={u.id}>{`${u.first_name} ${u.last_name}`}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="billing_type_id" label="Tipo de facturación">
                <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                  {billingTypes.map(bt => (
                    <Option key={bt.id} value={bt.id}>{bt.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="name_of_contact" label="Nombre del contacto">
                <Input />
              </Form.Item>
              <Form.Item name="phone" label="Teléfono del contacto">
                <Input />
              </Form.Item>
              <Form.Item name="email" label="Email del contacto">
                <Input type="email" />
              </Form.Item>
            </Col>
          </Row>

          <Space style={{ marginTop: 16 }}>
            <Button type="primary" onClick={handleSubmit} loading={loading}>
              Guardar cambios
            </Button>
            <Button onClick={() => navigate('/dashboard/casos/solicitudes')}>Cancelar</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default EditCasePage;
