import React, { useEffect, useMemo, useState } from 'react';
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
  Alert,
  Checkbox,
  InputNumber,
  DatePicker,
  Spin,
} from 'antd';
import dayjs from 'dayjs';
import {
  getCountries,
  getEconomicSectors,
  getLanguages,
  getPartners,
  getOrigins,
  getReferrals,
  updateClient,
  getClient,
} from '../../api/clientCreation';
import type {
  CatalogItem,
  PartnerItem,
  OriginItem,
  ReferralItem,
  ReferralResponse,
  CreateClientPayload,
} from '../../api/clientCreation';

const { Option } = Select;
const GUATEMALA_ID = 69;

const EditClientPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [countries, setCountries] = useState<CatalogItem[]>([]);
  const [sectors, setSectors] = useState<CatalogItem[]>([]);
  const [languages, setLanguages] = useState<CatalogItem[]>([]);
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [origins, setOrigins] = useState<OriginItem[]>([]);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [referralsWarning, setReferralsWarning] = useState<string | undefined>();

  const selectedOrigin = Form.useWatch('origin_id', form) as number | undefined;
  const selectedPartner = Form.useWatch('responsible_partner_id', form) as number | undefined;
  const taxpayerType = Form.useWatch('type_of_taxpayer', form) as 'Juridica' | 'Fisica' | undefined;
  const selectedCountry = Form.useWatch('country_of_origin_id', form) as number | undefined;
  const isExemptIva = Form.useWatch('is_exempt_iva', form) as boolean | undefined;

  const isNitReadonly = useMemo(() => {
    return selectedCountry !== undefined && selectedCountry !== GUATEMALA_ID;
  }, [selectedCountry]);

  useEffect(() => {
    if (isNitReadonly) {
      form.setFieldValue('nit', 'CF');
    }
  }, [isNitReadonly, form]);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [countriesRes, sectorsRes, languagesRes, partnersRes, originsRes] = await Promise.all([
          getCountries().catch(() => []),
          getEconomicSectors().catch(() => []),
          getLanguages().catch(() => []),
          getPartners().catch(() => []),
          getOrigins().catch(() => []),
        ]);
        setCountries(countriesRes || []);
        setSectors(sectorsRes || []);
        setLanguages(languagesRes || []);
        setPartners(partnersRes || []);
        setOrigins(originsRes || []);

        if (id) {
          const client = await getClient(Number(id));
          form.setFieldsValue({
            full_name: client.full_name,
            type_of_taxpayer: client.type_of_taxpayer,
            nationality: client.nationality,
            business_group: client.business_group,
            commercial_name: client.commercial_name,
            nit: client.nit,
            tax_document_type: client.tax_document_type,
            phone: client.phone,
            email: client.email,
            address: client.address,
            website: client.website,
            internal_code: client.internal_code,
            is_exempt_iva: client.is_exempt_iva,
            iva_percentage: client.iva_percentage ? Number(client.iva_percentage) : undefined,
            country_of_origin_id: client.country_of_origin?.id,
            economic_sector_id: client.economic_sector?.id,
            language_id: client.language?.id,
            responsible_partner_id: client.responsible_partner?.id,
            origin_id: client.origin?.id,
            referred_by: client.referred_by,
            contacts: client.contacts?.map(c => ({
              first_name: c.first_name,
              last_name: c.last_name,
              email: c.email,
              phone: c.phone,
              position: c.position,
              city: c.city,
              country_id: c.country?.id,
              language_id: c.language?.id,
              subscribe_to_database: c.subscribe_to_database,
              birth_date: c.birth_date ? dayjs(c.birth_date) : undefined,
            })),
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

  useEffect(() => {
    const fetchReferrals = async () => {
      if (!selectedOrigin) {
        setReferrals([]);
        setReferralsWarning(undefined);
        return;
      }
      try {
        const res: ReferralResponse = await getReferrals(selectedOrigin, selectedPartner);
        setReferrals(res.data || []);
        setReferralsWarning(res.warning);
      } catch {
        setReferrals([]);
        setReferralsWarning(undefined);
      }
    };
    fetchReferrals();
  }, [selectedOrigin, selectedPartner]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const contacts = values.contacts?.map((c: any) => ({
        ...c,
        birth_date: c.birth_date ? c.birth_date.format('YYYY-MM-DD') : undefined,
      }));
      const normalizedReferred =
        Array.isArray(values.referred_by) ? (values.referred_by[0] ?? undefined) : values.referred_by;
      const payload: Partial<CreateClientPayload> = {
        ...values,
        referred_by: normalizedReferred,
        contacts,
      };

      setLoading(true);
      await updateClient(Number(id), payload);
      message.success('Cliente actualizado exitosamente');
      navigate('/dashboard/clientes');
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || 'No se pudo actualizar el cliente');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div style={{ padding: 16 }}>
      <Card title="Editar Cliente">
        {referralsWarning && (
          <Alert type="warning" showIcon message={referralsWarning} style={{ marginBottom: 16 }} />
        )}
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type_of_taxpayer" label="Tipo de contribuyente" rules={[{ required: true }]}>
                <Select placeholder="Seleccione">
                  <Option value="Juridica">Jurídica</Option>
                  <Option value="Fisica">Física</Option>
                </Select>
              </Form.Item>
              <Form.Item name="nationality" label="Nacionalidad" rules={[{ required: true }]}>
                <Select placeholder="Seleccione">
                  <Option value="Nacional">Nacional</Option>
                  <Option value="Extranjero">Extranjero</Option>
                </Select>
              </Form.Item>
              <Form.Item name="full_name" label="Nombre completo" rules={[{ required: true }, { max: 150 }]}>
                <Input />
              </Form.Item>
              {taxpayerType === 'Juridica' && (
                <>
                  <Form.Item name="business_group" label="Grupo empresarial">
                    <Input />
                  </Form.Item>
                  <Form.Item name="commercial_name" label="Nombre comercial">
                    <Input />
                  </Form.Item>
                </>
              )}
              <Form.Item name="nit" label="NIT">
                <Input disabled={isNitReadonly} />
              </Form.Item>
              <Form.Item name="tax_document_type" label="Tipo de documento tributario">
                <Input />
              </Form.Item>
              <Form.Item name="phone" label="Teléfono" rules={[{ required: true }, { max: 120 }]}>
                <Input />
              </Form.Item>
              <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
                <Input type="email" />
              </Form.Item>
              <Form.Item name="economic_sector_id" label="Sector económico">
                <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                  {sectors.map(s => (
                    <Option key={s.id} value={s.id}>{s.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="language_id" label="Idioma" rules={[{ required: true }]}>
                <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                  {languages.map(l => (
                    <Option key={l.id} value={l.id}>{l.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="country_of_origin_id" label="País" rules={[{ required: true }]}>
                <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                  {countries.map(c => (
                    <Option key={c.id} value={c.id}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="address" label="Dirección" rules={[{ required: true }, { max: 150 }]}>
                <Input />
              </Form.Item>
              <Form.Item name="website" label="Sitio web">
                <Input />
              </Form.Item>
              <Form.Item name="internal_code" label="Código interno">
                <Input />
              </Form.Item>
              <Form.Item name="responsible_partner_id" label="Socio responsable">
                <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                  {partners.map(p => (
                    <Option key={p.id} value={p.id}>{p.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="origin_id" label="Origen">
                <Select placeholder="Seleccione" allowClear>
                  {origins.map(o => (
                    <Option key={o.id} value={o.id}>{o.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="referred_by" label="Referido por">
                <Select
                  showSearch
                  placeholder="Seleccione o escriba"
                  optionFilterProp="children"
                  allowClear
                  mode="tags"
                >
                  {referrals.map(r => (
                    <Option key={r.id} value={r.name}>{r.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="is_exempt_iva" valuePropName="checked">
                <Checkbox>Exento de IVA</Checkbox>
              </Form.Item>
              {!isExemptIva && (
                <Form.Item
                  name="iva_percentage"
                  label="Porcentaje IVA"
                  rules={[{ required: true, message: 'Ingrese porcentaje de IVA' }]}
                >
                  <InputNumber min={0} max={100} style={{ width: '100%' }} addonAfter="%" />
                </Form.Item>
              )}
            </Col>
          </Row>

          <Card size="small" title="Contactos" style={{ marginTop: 16 }}>
            <Form.List name="contacts">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name }) => (
                    <Row key={key} gutter={12} style={{ marginBottom: 12 }}>
                      <Col span={4}>
                        <Form.Item name={[name, 'first_name']} label="Nombre" rules={[{ required: true }]}>
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name={[name, 'last_name']} label="Apellido" rules={[{ required: true }]}>
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name={[name, 'email']} label="Email" rules={[{ type: 'email' }]}>
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item name={[name, 'phone']} label="Teléfono">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item name={[name, 'position']} label="Cargo">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item name={[name, 'birth_date']} label="Fecha nac.">
                          <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item name={[name, 'city']} label="Ciudad">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item name={[name, 'country_id']} label="País">
                          <Select placeholder="País" allowClear size="small">
                            {countries.map(c => (
                              <Option key={c.id} value={c.id}>{c.name}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item name={[name, 'language_id']} label="Idioma">
                          <Select placeholder="Idioma" allowClear size="small">
                            {languages.map(l => (
                              <Option key={l.id} value={l.id}>{l.name}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item name={[name, 'subscribe_to_database']} valuePropName="checked" label=" ">
                          <Checkbox>Suscribir BD</Checkbox>
                        </Form.Item>
                      </Col>
                      <Col span={1}>
                        <Form.Item label=" ">
                          <Button danger size="small" onClick={() => remove(name)}>X</Button>
                        </Form.Item>
                      </Col>
                    </Row>
                  ))}
                  <Button type="dashed" onClick={() => add()} block>
                    + Agregar contacto
                  </Button>
                </>
              )}
            </Form.List>
          </Card>

          <Space style={{ marginTop: 16 }}>
            <Button type="primary" onClick={handleSubmit} loading={loading}>
              Guardar cambios
            </Button>
            <Button onClick={() => navigate('/dashboard/clientes')}>Cancelar</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default EditClientPage;
