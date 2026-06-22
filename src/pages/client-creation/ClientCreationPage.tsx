import React, { useEffect, useState } from 'react';
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
  DatePicker,
  Steps,
  Radio,
} from 'antd';
import {
  getCountries,
  getEconomicSectors,
  getLanguages,
  getPartners,
  getOrigins,
  getReferrerOptions,
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

const CONTACT_TYPE_OPTIONS = [
  { label: 'Principal', value: 'principal' },
  { label: 'In-house', value: 'in-house' },
  { label: 'Facturación', value: 'facturacion' },
  { label: 'Representante Legal', value: 'representante_legal' },
];

// Normaliza variantes de "consumidor final" (cf, c.f., c/f, c f…) a "CF".
// Cualquier otro valor (un NIT real) se devuelve sin cambios, solo recortado.
const normalizeNit = (raw?: string): string => {
  const value = (raw ?? '').trim();
  if (!value) return '';
  const compact = value.replace(/[\s./\\-]/g, '').toUpperCase();
  return compact === 'CF' ? 'CF' : value;
};

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
  const nationality = Form.useWatch('nationality', form) as 'nacional' | 'extranjero' | undefined;
  const isExtranjero = nationality === 'extranjero';

  // Extranjero: el NIT siempre es CF y no se edita. Nacional: queda en blanco para ingresarlo.
  useEffect(() => {
    if (isExtranjero) {
      form.setFieldsValue({ nit: 'CF' });
    } else if (nationality === 'nacional' && form.getFieldValue('nit') === 'CF') {
      form.setFieldsValue({ nit: '' });
    }
  }, [isExtranjero, nationality, form]);

  // "Nombre comercial" siempre se guarda igual a la razón social (full_name).
  const fullName = Form.useWatch('full_name', form) as string | undefined;
  useEffect(() => {
    form.setFieldsValue({ commercial_name: fullName ?? '' });
  }, [fullName, form]);

  // Tipo de quien refiere -> lista dinámica de nombres + mapeo a origen.
  // El tipo fija el "Origen del cliente" al guardar (Otro -> Referido asociado).
  const ORIGIN_BY_REFERRER_TYPE: Record<string, string> = {
    socio: 'Referido socio',
    asociado: 'Referido asociado',
    oficina: 'Referido oficina Consortium',
    otro: 'Referido asociado',
  };
  const referrerType = Form.useWatch('referrer_type', form) as string | undefined;
  const [referrerOptions, setReferrerOptions] = useState<CatalogItem[]>([]);
  const [loadingReferrers, setLoadingReferrers] = useState(false);

  useEffect(() => {
    if (!referrerType) {
      setReferrerOptions([]);
      return;
    }
    let mounted = true;
    setLoadingReferrers(true);
    form.setFieldsValue({ referred_by: undefined });
    getReferrerOptions(referrerType)
      .then((opts) => { if (mounted) setReferrerOptions(opts); })
      .catch(() => { if (mounted) setReferrerOptions([]); })
      .finally(() => { if (mounted) setLoadingReferrers(false); });
    return () => { mounted = false; };
  }, [referrerType, form]);

  // Al salir del campo, normaliza variantes de "CF" (cf, c.f., c/f…) a "CF".
  const handleNitBlur = () => {
    const current = form.getFieldValue('nit');
    const normalized = normalizeNit(current);
    if (normalized !== current) form.setFieldsValue({ nit: normalized });
  };

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
        // País sede: Guatemala primero, el resto en orden alfabético.
        setCountries(
          [...(countriesRes || [])].sort((a, b) => {
            const ag = (a.name || '').toLowerCase() === 'guatemala' ? 0 : 1;
            const bg = (b.name || '').toLowerCase() === 'guatemala' ? 0 : 1;
            return ag - bg || (a.name || '').localeCompare(b.name || '', 'es');
          }),
        );
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
        const commonFields = [
          'full_name', 'country_of_origin_id', 'address',
          'economic_sector_id', 'responsible_partner_id', 'origin_id',
        ];
        const juridicaFields = taxpayerType === 'Juridica'
          ? ['commercial_name', 'referred_by']
          : [];
        await form.validateFields([...commonFields, ...juridicaFields] as any);
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

      // El tipo de quien refiere fija el origen del cliente (Otro -> Referido
      // asociado). Si no se eligió tipo, se respeta el "Origen del cliente".
      const referrerType = (values as any).referrer_type as string | undefined;
      const mappedOriginId = referrerType
        ? origins.find(o => o.name === ORIGIN_BY_REFERRER_TYPE[referrerType])?.id
        : undefined;

      const payload: CreateClientPayload = {
        ...values,
        ...(mappedOriginId ? { origin_id: mappedOriginId } : {}),
        // Nombre comercial siempre igual a la razón social (full_name).
        commercial_name: values.full_name,
        // Tipo de documento tributario ya no se pide; va fijo en NIT.
        tax_document_type: 'NIT',
        nit: isExtranjero ? 'CF' : (normalizeNit(values.nit) || 'CF'),
        // Campos de IVA ya no se piden en el formulario; van fijos para que la
        // ficha del correo muestre "Exención IVA: No" y porcentaje 0.
        is_exempt_iva: false,
        iva_percentage: 0,
        contacts,
      };
      delete (payload as any).referrer_type;

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
          <Steps.Step title="Clasificación" />
          <Steps.Step title="Datos del cliente" />
          <Steps.Step title="Contactos" />
        </Steps>

        <Form
          form={form}
          layout="vertical"
          initialValues={{ type_of_taxpayer: 'Juridica', nationality: 'nacional' }}
        >
          {/* ============ PASO 1: Clasificación ============ */}
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="nationality" label="Nacionalidad" rules={[{ required: true }]}>
                  <Select placeholder="Seleccione">
                    <Option value="nacional">Nacional</Option>
                    <Option value="extranjero">Extranjero</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
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
                  <Form.Item
                    name="commercial_name"
                    label="Nombre comercial"
                    tooltip="Se copia automáticamente de la razón social y se guarda igual."
                    rules={[{ required: true, message: 'Ingrese la razón social' }, { max: 150 }]}
                  >
                    <Input disabled placeholder="Se copia de la razón social" />
                  </Form.Item>
                  <Form.Item name="address" label="Dirección de la empresa" rules={[{ required: true }, { max: 150 }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="business_group" label="Grupo empresarial">
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="economic_sector_id"
                    label="Sector económico"
                    rules={[{ required: true, message: 'Seleccione el sector económico' }]}
                  >
                    <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                      {sectors.map(s => (
                        <Option key={s.id} value={s.id}>{s.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="nit"
                    label="Número de identificación tributaria"
                    tooltip={isExtranjero
                      ? 'Cliente extranjero: se guarda automáticamente como CF.'
                      : 'Si se deja vacío se guardará como CF'}
                  >
                    <Input
                      placeholder={isExtranjero ? 'CF' : 'Ej: 12345678 (vacío = CF)'}
                      disabled={isExtranjero}
                      onBlur={handleNitBlur}
                    />
                  </Form.Item>
                  <Form.Item
                    name="country_of_origin_id"
                    label="País sede"
                    rules={[{ required: true, message: 'Seleccione el país' }]}
                  >
                    <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                      {countries.map(c => (
                        <Option key={c.id} value={c.id}>{c.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="website" label="Página web">
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="responsible_partner_id"
                    label="Socio responsable"
                    rules={[{ required: true, message: 'Seleccione el socio responsable' }]}
                  >
                    <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                      {partners.map(p => (
                        <Option key={p.id} value={p.id}>{p.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="origin_id"
                    label="Origen del cliente"
                    rules={referrerType ? [] : [{ required: true, message: 'Seleccione el origen' }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="children"
                      placeholder="Seleccione o escriba para filtrar"
                      allowClear
                    >
                      {origins.map(o => (
                        <Option key={o.id} value={o.id}>{o.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="referrer_type"
                    label="Tipo de quien refiere"
                    tooltip="Define la lista de nombres y fija el origen del cliente al guardar."
                  >
                    <Select placeholder="Seleccione el tipo" allowClear>
                      <Option value="socio">Socio</Option>
                      <Option value="asociado">Asociado</Option>
                      <Option value="oficina">Oficina de Consortium</Option>
                      <Option value="otro">Otro</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="referred_by"
                    label="Nombre de quien refiere (socio, asociado, colaborador en general, cliente, oficina de Consortium, etc)"
                    rules={referrerType ? [{ required: true, message: 'Seleccione quién refiere' }] : []}
                  >
                    <Select
                      showSearch
                      optionFilterProp="children"
                      placeholder={referrerType ? 'Seleccione o escriba para filtrar' : 'Primero elija el tipo'}
                      disabled={!referrerType}
                      loading={loadingReferrers}
                      allowClear
                    >
                      {referrerOptions.map(o => (
                        <Option key={o.id} value={o.name}>{o.name}</Option>
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
                  <Form.Item
                    name="nit"
                    label="Número de identificación tributaria (NIT)"
                    tooltip={isExtranjero
                      ? 'Cliente extranjero: se guarda automáticamente como CF.'
                      : 'Si se deja vacío se guardará como CF'}
                  >
                    <Input
                      placeholder={isExtranjero ? 'CF' : 'Ej: 12345678 (vacío = CF)'}
                      disabled={isExtranjero}
                      onBlur={handleNitBlur}
                    />
                  </Form.Item>
                  <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
                    <Input type="email" />
                  </Form.Item>
                  <Form.Item
                    name="economic_sector_id"
                    label="Sector económico"
                    rules={[{ required: true, message: 'Seleccione el sector económico' }]}
                  >
                    <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                      {sectors.map(s => (
                        <Option key={s.id} value={s.id}>{s.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="country_of_origin_id"
                    label="País"
                    rules={[{ required: true, message: 'Seleccione el país' }]}
                  >
                    <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                      {countries.map(c => (
                        <Option key={c.id} value={c.id}>{c.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="address" label="Dirección" rules={[{ required: true }, { max: 150 }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="responsible_partner_id"
                    label="Socio responsable"
                    rules={[{ required: true, message: 'Seleccione el socio responsable' }]}
                  >
                    <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                      {partners.map(p => (
                        <Option key={p.id} value={p.id}>{p.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="origin_id"
                    label="Origen del cliente"
                    rules={referrerType ? [] : [{ required: true, message: 'Seleccione el origen' }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="children"
                      placeholder="Seleccione o escriba para filtrar"
                      allowClear
                    >
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
            <Card size="small" title="Contactos de la empresa">
              <Form.List name="contacts">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name }) => (
                      <Card
                        key={key}
                        size="small"
                        style={{ marginBottom: 16 }}
                        extra={
                          <Button danger size="small" onClick={() => remove(name)}>Eliminar</Button>
                        }
                      >
                        <Row gutter={12}>
                          <Col xs={24} sm={12} md={6}>
                            <Form.Item
                              name={[name, 'contact_type']}
                              label="Tipo de contacto"
                              rules={[{ required: true, message: 'Seleccione el tipo' }]}
                            >
                              <Radio.Group>
                                {CONTACT_TYPE_OPTIONS.map(opt => (
                                  <Radio key={opt.value} value={opt.value} style={{ display: 'block', marginBottom: 4 }}>
                                    {opt.label}
                                  </Radio>
                                ))}
                              </Radio.Group>
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={18}>
                            <Row gutter={12}>
                              <Col xs={24} sm={12}>
                                <Form.Item
                                  name={[name, 'first_name']}
                                  label="Nombre"
                                  rules={[{ required: true, message: 'Requerido' }]}
                                >
                                  <Input />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item
                                  name={[name, 'last_name']}
                                  label="Apellido"
                                  rules={[{ required: true, message: 'Requerido' }]}
                                >
                                  <Input />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item name={[name, 'position']} label="Cargo">
                                  <Input />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item
                                  name={[name, 'email']}
                                  label="Email"
                                  rules={[{ required: true, message: 'Requerido' }, { type: 'email' }]}
                                >
                                  <Input />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item name={[name, 'birth_date']} label="Fecha de nacimiento">
                                  <DatePicker style={{ width: '100%' }} />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item name={[name, 'country_id']} label="País" rules={[{ required: true, message: 'Seleccione el país' }]}>
                                  <Select placeholder="Seleccione" allowClear showSearch optionFilterProp="children">
                                    {countries.map(c => (
                                      <Option key={c.id} value={c.id}>{c.name}</Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item name={[name, 'city']} label="Ciudad">
                                  <Input />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item name={[name, 'phone']} label="Teléfono">
                                  <Input />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item
                                  name={[name, 'language_id']}
                                  label="Idioma"
                                  rules={[{ required: true, message: 'Seleccione el idioma' }]}
                                >
                                  <Select placeholder="Seleccione" allowClear showSearch optionFilterProp="children">
                                    {languages.map(l => (
                                      <Option key={l.id} value={l.id}>{l.name}</Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item
                                  name={[name, 'subscribe_to_db']}
                                  valuePropName="checked"
                                  label="Suscripción"
                                >
                                  <Checkbox>¿Desea suscribirse a nuestra base de datos?</Checkbox>
                                </Form.Item>
                              </Col>
                            </Row>
                          </Col>
                        </Row>
                      </Card>
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
