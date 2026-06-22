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
  Checkbox,
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
  getReferrerOptions,
  updateClient,
  getClient,
} from '../../api/clientCreation';
import type {
  CatalogItem,
  PartnerItem,
  OriginItem,
  CreateClientPayload,
} from '../../api/clientCreation';

const { Option } = Select;
// Normaliza variantes de "consumidor final" (cf, c.f., c/f, c f…) a "CF".
// Un NIT real (dígitos) se devuelve sin cambios, solo recortado.
const normalizeNit = (raw?: string): string => {
  const value = (raw ?? '').trim();
  if (!value) return '';
  const compact = value.replace(/[\s./\\-]/g, '').toUpperCase();
  return compact === 'CF' ? 'CF' : value;
};

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
  const [referrerOptions, setReferrerOptions] = useState<CatalogItem[]>([]);
  const [loadingReferrers, setLoadingReferrers] = useState(false);

  // El tipo de quien refiere fija el "Origen del cliente" al guardar.
  const ORIGIN_BY_REFERRER_TYPE: Record<string, string> = {
    socio: 'Referido socio',
    asociado: 'Referido asociado',
    oficina: 'Referido oficina Consortium',
    otro: 'Referido asociado',
  };
  const referrerType = Form.useWatch('referrer_type', form) as string | undefined;
  const taxpayerType = Form.useWatch('type_of_taxpayer', form) as 'Juridica' | 'Fisica' | undefined;
  const nationality = Form.useWatch('nationality', form) as string | undefined;

  // Extranjero: el NIT siempre es CF y no se edita. Nacional: queda en blanco
  // para ingresarlo. Comparación case-insensitive por datos heredados.
  const isExtranjero = String(nationality ?? '').toLowerCase() === 'extranjero';

  useEffect(() => {
    if (isExtranjero) {
      form.setFieldsValue({ nit: 'CF' });
    } else if (
      String(nationality ?? '').toLowerCase() === 'nacional' &&
      form.getFieldValue('nit') === 'CF'
    ) {
      form.setFieldsValue({ nit: '' });
    }
  }, [isExtranjero, nationality, form]);

  // Al salir del campo, normaliza variantes de "CF" (cf, c.f., c/f…) a "CF".
  const handleNitBlur = () => {
    const current = form.getFieldValue('nit');
    const normalized = normalizeNit(current);
    if (normalized !== current) form.setFieldsValue({ nit: normalized });
  };

  // "Nombre comercial" siempre se guarda igual a la razón social (full_name).
  const fullNameWatch = Form.useWatch('full_name', form) as string | undefined;
  useEffect(() => {
    form.setFieldsValue({ commercial_name: fullNameWatch ?? '' });
  }, [fullNameWatch, form]);

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

        if (id) {
          const client = await getClient(Number(id));
          form.setFieldsValue({
            full_name: client.full_name,
            type_of_taxpayer: client.type_of_taxpayer,
            nationality: (client.nationality || '').toLowerCase(),
            business_group: client.business_group,
            commercial_name: client.commercial_name,
            nit: client.nit,
            phone: client.phone,
            email: client.email,
            address: client.address,
            website: client.website,
            country_of_origin_id: client.country_of_origin?.id,
            economic_sector_id: client.economic_sector?.id,
            language_id: client.language?.id,
            responsible_partner_id: client.responsible_partner?.id,
            origin_id: client.origin?.id,
            referrer_type: ({
              'referido socio': 'socio',
              'referido asociado': 'asociado',
              'referido oficina consortium': 'oficina',
            } as Record<string, string>)[(client.origin?.name || '').toLowerCase()],
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
              subscribe_to_db: c.subscribe_to_db,
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
    if (!referrerType) {
      setReferrerOptions([]);
      return;
    }
    let mounted = true;
    setLoadingReferrers(true);
    getReferrerOptions(referrerType)
      .then((opts) => {
        if (!mounted) return;
        setReferrerOptions(opts);
        // Preserva el valor cargado si sigue siendo válido; si no, lo limpia.
        const current = form.getFieldValue('referred_by');
        if (current && !opts.some((o) => o.name === current)) {
          form.setFieldsValue({ referred_by: undefined });
        }
      })
      .catch(() => { if (mounted) setReferrerOptions([]); })
      .finally(() => { if (mounted) setLoadingReferrers(false); });
    return () => { mounted = false; };
  }, [referrerType, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const contacts = values.contacts?.map((c: any) => ({
        ...c,
        birth_date: c.birth_date ? c.birth_date.format('YYYY-MM-DD') : undefined,
      }));
      const normalizedReferred =
        Array.isArray(values.referred_by) ? (values.referred_by[0] ?? undefined) : values.referred_by;
      // El tipo de quien refiere fija el origen (Otro -> Referido asociado).
      const referrerTypeVal = (values as any).referrer_type as string | undefined;
      const mappedOriginId = referrerTypeVal
        ? origins.find(o => o.name === ORIGIN_BY_REFERRER_TYPE[referrerTypeVal])?.id
        : undefined;
      const payload: Partial<CreateClientPayload> = {
        ...values,
        ...(mappedOriginId ? { origin_id: mappedOriginId } : {}),
        // Nombre comercial siempre igual a la razón social (full_name).
        commercial_name: values.full_name,
        // Tipo de documento tributario ya no se pide; va fijo en NIT.
        tax_document_type: 'NIT',
        nit: isExtranjero ? 'CF' : (normalizeNit(values.nit) || 'CF'),
        // IVA ya no se pide en el formulario; va fijo para que la ficha del
        // correo muestre "Exención IVA: No" y porcentaje 0.
        is_exempt_iva: false,
        iva_percentage: 0,
        referred_by: normalizedReferred,
        contacts,
      };
      delete (payload as any).referrer_type;

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
                  <Option value="nacional">Nacional</Option>
                  <Option value="extranjero">Extranjero</Option>
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
                  <Form.Item
                    name="commercial_name"
                    label="Nombre comercial"
                    tooltip="Se copia automáticamente de la razón social y se guarda igual."
                  >
                    <Input disabled placeholder="Se copia de la razón social" />
                  </Form.Item>
                </>
              )}
              <Form.Item
                name="nit"
                label="NIT"
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
              <Form.Item name="responsible_partner_id" label="Socio responsable">
                <Select showSearch placeholder="Seleccione" optionFilterProp="children" allowClear>
                  {partners.map(p => (
                    <Option key={p.id} value={p.id}>{p.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="origin_id" label="Origen">
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
