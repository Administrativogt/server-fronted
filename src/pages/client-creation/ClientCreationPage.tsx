import React, { useEffect, useMemo, useState } from 'react';
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
  Checkbox,
  InputNumber,
  DatePicker,
  Steps,
} from 'antd';
import {
  getCountries,
  getEconomicSectors,
  getLanguages,
  getPartners,
  getOrigins,
  createClientWithContacts,
} from '../../api/clientCreation';
import type {
  CatalogItem,
  PartnerItem,
  OriginItem,
  CreateClientPayload,
} from '../../api/clientCreation';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

const GUATEMALA_ID = 11;

const ClientCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<CreateClientPayload>();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [countries, setCountries] = useState<CatalogItem[]>([]);
  const [sectors, setSectors] = useState<CatalogItem[]>([]);
  const [languages, setLanguages] = useState<CatalogItem[]>([]);
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [origins, setOrigins] = useState<OriginItem[]>([]);

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
    const loadCatalogs = async () => {
      try {
        const [countriesRes, sectorsRes, languagesRes, partnersRes, originsRes] =
          await Promise.all([
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
      } catch (error: any) {
        console.error('Error cargando catálogos', error);
        message.error('Error cargando catálogos');
      }
    };
    loadCatalogs();
  }, []);


  const next = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['nationality', 'type_of_taxpayer']);
      } else if (currentStep === 1) {
        const fields: (keyof CreateClientPayload)[] = ['full_name', 'country_of_origin_id', 'address'];
        await form.validateFields(fields as any);
      }
      setCurrentStep(prev => prev + 1);
    } catch {
      // validation failed
    }
  };

  const prev = () => setCurrentStep(prev => prev - 1);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const contacts = values.contacts?.map((c: any) => ({
        ...c,
        birth_date: c.birth_date ? c.birth_date.format('YYYY-MM-DD') : undefined,
      }));

      const payload: CreateClientPayload = {
        ...values,
        nit: values.nit || 'CF',
        contacts,
      };

      setLoading(true);
      const res = await createClientWithContacts(payload);
      message.success(res?.message || 'Cliente creado exitosamente');
      form.resetFields();
      setCurrentStep(0);
      navigate('/dashboard/clientes');
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || 'No se pudo crear el cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Card title="Creación de Cliente">
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          <Steps.Step title="Información inicial" />
          <Steps.Step title="Datos del cliente" />
          <Steps.Step title="Contactos" />
        </Steps>

        <Form
          form={form}
          layout="vertical"
          initialValues={{ is_exempt_iva: false, type_of_taxpayer: 'Juridica', nationality: 'Nacional' }}
        >
          {/* ============ PASO 1: Información inicial ============ */}
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item name="internal_code" label="Código interno del sistema">
                  <Input placeholder="Código interno" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="nationality" label="Nacionalidad" rules={[{ required: true }]}>
                  <Select placeholder="Seleccione">
                    <Option value="Nacional">Nacional</Option>
                    <Option value="Extranjero">Extranjero</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="type_of_taxpayer" label="Tipo" rules={[{ required: true }]}>
                  <Select placeholder="Seleccione">
                    <Option value="Juridica">Persona Jurídica</Option>
                    <Option value="Fisica">Persona Natural</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* ============ PASO 2: Datos del cliente ============ */}
          <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
            {taxpayerType === 'Juridica' ? (
              /* ---------- Persona Jurídica ---------- */
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="full_name" label="Razón social" rules={[{ required: true }, { max: 150 }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="commercial_name" label="Nombre comercial">
                    <Input />
                  </Form.Item>
                  <Form.Item name="address" label="Dirección de la empresa" rules={[{ required: true }, { max: 150 }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="business_group" label="Grupo empresarial">
                    <Input />
                  </Form.Item>
                  <Form.Item name="economic_sector_id" label="Sector económico">
                    <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                      {sectors.map(s => (
                        <Option key={s.id} value={s.id}>{s.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="tax_document_type" label="Tipo de documento tributario">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="nit" label="Número de identificación tributaria" tooltip="Si se deja vacío se guardará como CF">
                    <Input disabled={isNitReadonly} />
                  </Form.Item>
                  <Form.Item name="is_exempt_iva" valuePropName="checked">
                    <Checkbox>¿Se encuentra exento de IVA?</Checkbox>
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
                  <Form.Item name="country_of_origin_id" label="País sede" rules={[{ required: true }]}>
                    <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                      {countries.map(c => (
                        <Option key={c.id} value={c.id}>{c.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="website" label="Página web">
                    <Input />
                  </Form.Item>
                  <Form.Item name="responsible_partner_id" label="Socio responsable">
                    <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                      {partners.map(p => (
                        <Option key={p.id} value={p.id}>{p.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="origin_id" label="Origen del cliente">
                    <Select placeholder="Seleccione" allowClear>
                      {origins.map(o => (
                        <Option key={o.id} value={o.id}>{o.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            ) : (
              /* ---------- Persona Natural ---------- */
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="full_name" label="Nombre completo" rules={[{ required: true }, { max: 150 }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="nit" label="Número de identificación tributaria (NIT)" tooltip="Si se deja vacío se guardará como CF">
                    <Input disabled={isNitReadonly} />
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
                </Col>
                <Col xs={24} sm={12}>
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
                  <Form.Item name="responsible_partner_id" label="Socio responsable">
                    <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                      {partners.map(p => (
                        <Option key={p.id} value={p.id}>{p.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="origin_id" label="Origen del cliente">
                    <Select placeholder="Seleccione" allowClear>
                      {origins.map(o => (
                        <Option key={o.id} value={o.id}>{o.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            )}
          </div>

          {/* ============ PASO 3: Contactos ============ */}
          <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
            <Card size="small" title="Contactos del cliente">
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
          </div>

          {/* ============ Navegación ============ */}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {currentStep > 0 && (
                <Button onClick={prev}>Anterior</Button>
              )}
            </div>
            <Space>
              {currentStep < 2 && (
                <Button type="primary" onClick={next}>Siguiente</Button>
              )}
              {currentStep === 2 && (
                <Button type="primary" onClick={handleSubmit} loading={loading}>
                  Crear cliente
                </Button>
              )}
              <Button onClick={() => navigate('/dashboard/clientes')}>Cancelar</Button>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default ClientCreationPage;
