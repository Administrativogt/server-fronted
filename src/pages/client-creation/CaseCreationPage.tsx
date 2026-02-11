import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Upload,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  getCaseAreas,
  getCoordinatingPartners,
  getPartners,
  getBillingTypes,
  getAddressedToUsers,
  createCase,
} from '../../api/clientCreation';
import type { CatalogItem, PartnerItem, AddressedToUser } from '../../api/clientCreation';

const { Option } = Select;
const { TextArea } = Input;

const CaseCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const [caseAreas, setCaseAreas] = useState<CatalogItem[]>([]);
  const [coordinatingPartners, setCoordinatingPartners] = useState<CatalogItem[]>([]);
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [billingTypes, setBillingTypes] = useState<CatalogItem[]>([]);
  const [addressedToUsers, setAddressedToUsers] = useState<AddressedToUser[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    const loadCatalogs = async () => {
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
      } catch {
        message.error('Error cargando catálogos');
      }
    };
    loadCatalogs();
  }, []);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const formData = new FormData();
      formData.append('client', values.client);
      formData.append('area_id', String(values.area_id));
      formData.append('concept', values.concept);
      formData.append('currency', values.currency);
      formData.append('coordinating_partner_id', String(values.coordinating_partner_id));
      formData.append('partner_in_charge_id', String(values.partner_in_charge_id));
      formData.append('responsible', values.responsible);
      formData.append('addressed_to_id', String(values.addressed_to_id));

      if (values.billing_type_id) formData.append('billing_type_id', String(values.billing_type_id));
      if (values.limit_of_hours) formData.append('limit_of_hours', String(values.limit_of_hours));
      if (values.amount_of_fees) formData.append('amount_of_fees', values.amount_of_fees);
      if (values.fee_type) formData.append('fee_type', values.fee_type);
      if (values.name_of_contact) formData.append('name_of_contact', values.name_of_contact);
      if (values.phone) formData.append('phone', values.phone);
      if (values.email) formData.append('email', values.email);

      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('fee_files', fileList[0].originFileObj);
      }

      const res = await createCase(formData);
      message.success(res?.message || 'Caso creado exitosamente');
      form.resetFields();
      setFileList([]);
      navigate('/dashboard/casos/solicitudes');
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || 'No se pudo crear el caso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Card title="Creación de Solicitud de Caso">
        <Form form={form} layout="vertical" initialValues={{ currency: 'GTQ' }}>
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
              <Form.Item name="fee_type" label="Tipo de honorario" tooltip="Referencia de honorarios">
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
              <Form.Item label="Propuesta de honorarios (archivo)">
                <Upload
                  fileList={fileList}
                  beforeUpload={() => false}
                  onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
                  maxCount={1}
                >
                  <Button icon={<UploadOutlined />}>Seleccionar archivo</Button>
                </Upload>
              </Form.Item>
            </Col>
          </Row>

          <Space style={{ marginTop: 16 }}>
            <Button type="primary" onClick={handleSubmit} loading={loading}>
              Crear solicitud de caso
            </Button>
            <Button onClick={() => navigate('/dashboard/casos/solicitudes')}>Cancelar</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default CaseCreationPage;
