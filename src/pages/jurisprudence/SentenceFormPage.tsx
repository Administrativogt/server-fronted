import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  FileAddOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import useThemeStore from '../../hooks/useThemeStore';
import {
  createSentence,
  fetchCatalogs,
  getSentence,
  listSentences,
  updateSentence,
} from '../../api/jurisprudence';
import type {
  AllCatalogs,
  Sentence,
  SentenceFormPayload,
} from '../../types/jurisprudence.types';
import JurisprudenceHero from './JurisprudenceHero';
import './jurisprudence.css';

interface FormShape {
  is_intern?: boolean;
  expedient?: string;
  signers?: string;
  client?: string;
  init_date?: Dayjs | null;
  end_date?: Dayjs | null;
  specific_theme?: string;
  sub_theme?: string;
  law?: string;
  article?: string;
  subsection?: string;
  tax_credit_refund?: string;
  tax_period?: string;
  jurisprudential_criterion?: string;
  jurisprudential_line?: string;
  sentence_link?: string;
  link?: string;
  failure_type?: number;
  tribunal?: number;
  sense_of_failure?: number;
  general_theme?: number;
  state?: number;
  related_expedient?: number[];
}

const SentenceFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const themeMode = useThemeStore((s) => s.mode);
  const isDark = themeMode === 'dark';
  const [form] = Form.useForm<FormShape>();

  const [catalogs, setCatalogs] = useState<AllCatalogs | null>(null);
  const [allSentences, setAllSentences] = useState<Sentence[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchCatalogs(), listSentences(1, 200)])
      .then(([c, list]) => {
        if (!mounted) return;
        setCatalogs(c);
        setAllSentences(list.results);
      })
      .catch(() => message.error('No se pudieron cargar los catálogos'));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!editing || !id) return;
    let mounted = true;
    getSentence(Number(id))
      .then((s) => {
        if (!mounted) return;
        form.setFieldsValue({
          is_intern: s.is_intern,
          expedient: s.expedient,
          signers: s.signers,
          client: s.client,
          init_date: s.init_date ? dayjs(s.init_date) : null,
          end_date: s.end_date ? dayjs(s.end_date) : null,
          specific_theme: s.specific_theme,
          sub_theme: s.sub_theme,
          law: s.law,
          article: s.article,
          subsection: s.subsection,
          tax_credit_refund: s.tax_credit_refund,
          tax_period: s.tax_period,
          jurisprudential_criterion: s.jurisprudential_criterion,
          jurisprudential_line: s.jurisprudential_line,
          sentence_link: s.sentence_link,
          link: s.link,
          failure_type: s.failure_type?.id,
          tribunal: s.tribunal?.id,
          sense_of_failure: s.sense_of_failure?.id,
          general_theme: s.general_theme?.id,
          state: s.state?.id,
          related_expedient: (s.related_expedient ?? []).map((r) => r.id),
        });
      })
      .catch(() => message.error('No se pudo cargar la sentencia'));
    return () => {
      mounted = false;
    };
  }, [editing, id, form]);

  const sentenceOptions = useMemo(
    () =>
      allSentences
        .filter((s) => !editing || s.id !== Number(id))
        .map((s) => ({
          value: s.id,
          label: `${s.expedient || `#${s.id}`} — ${s.specific_theme || s.law || 'Sin tema'}`,
        })),
    [allSentences, editing, id],
  );

  const onSubmit = async (values: FormShape) => {
    setSubmitting(true);
    try {
      const payload: SentenceFormPayload = {
        is_intern: values.is_intern,
        expedient: values.expedient,
        signers: values.signers,
        client: values.client,
        init_date: values.init_date ? values.init_date.format('YYYY-MM-DD') : null,
        end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
        specific_theme: values.specific_theme,
        sub_theme: values.sub_theme,
        law: values.law,
        article: values.article,
        subsection: values.subsection,
        tax_credit_refund: values.tax_credit_refund,
        tax_period: values.tax_period,
        jurisprudential_criterion: values.jurisprudential_criterion,
        jurisprudential_line: values.jurisprudential_line,
        sentence_link: values.sentence_link,
        link: values.link,
        failure_type: values.failure_type!,
        tribunal: values.tribunal!,
        sense_of_failure: values.sense_of_failure!,
        general_theme: values.general_theme!,
        state: values.state!,
        related_expedient: values.related_expedient,
      };
      const file = fileList[0]?.originFileObj as File | undefined;
      const saved = editing
        ? await updateSentence(Number(id), payload, file ?? null)
        : await createSentence(payload, file ?? null);
      message.success(editing ? 'Sentencia actualizada' : 'Sentencia creada');
      navigate(`/dashboard/jurisprudencia/${saved.id}`);
    } catch {
      message.error('Error al guardar la sentencia');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-juris-theme={isDark ? 'dark' : 'light'}>
      <JurisprudenceHero
        title={editing ? 'Editar sentencia' : 'Registrar nueva sentencia'}
        subtitle="Completa los campos jurisprudenciales y adjunta el archivo PDF."
        actions={
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dashboard/jurisprudencia')}
            ghost
            style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#f4f1ea' }}
          >
            Volver
          </Button>
        }
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={{ is_intern: false }}
      >
        <Card variant="borderless" style={{ marginBottom: 20 }}>
          <div className="juris-form-section">
            <h3>Clasificación</h3>
            <Row gutter={[16, 0]}>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Tribunal"
                  name="tribunal"
                  rules={[{ required: true, message: 'Selecciona un tribunal' }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="children"
                    placeholder="Selecciona"
                    options={catalogs?.tribunals.map((t) => ({ value: t.id, label: t.name }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Tema general"
                  name="general_theme"
                  rules={[{ required: true, message: 'Selecciona un tema' }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="children"
                    placeholder="Selecciona"
                    options={catalogs?.general_themes.map((t) => ({
                      value: t.id,
                      label: t.name,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Tipo de fallo"
                  name="failure_type"
                  rules={[{ required: true, message: 'Selecciona un tipo' }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="children"
                    placeholder="Selecciona"
                    options={catalogs?.failure_types.map((t) => ({
                      value: t.id,
                      label: t.name,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Sentido del fallo"
                  name="sense_of_failure"
                  rules={[{ required: true, message: 'Selecciona el sentido' }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="children"
                    placeholder="Selecciona"
                    options={catalogs?.senses_of_failure.map((t) => ({
                      value: t.id,
                      label: t.name,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Estado"
                  name="state"
                  rules={[{ required: true, message: 'Selecciona un estado' }]}
                >
                  <Select
                    placeholder="Selecciona"
                    options={catalogs?.states.map((t) => ({ value: t.id, label: t.name }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Cliente interno o externo" name="is_intern" valuePropName="checked">
                  <Switch checkedChildren="Interno" unCheckedChildren="Externo" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="juris-form-section">
            <h3>Datos del expediente</h3>
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item label="Expediente" name="expedient">
                  <Input placeholder="Ej. 1095-2022" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Cliente" name="client">
                  <Input placeholder="Ej. Empresa Guatemala S.A." />
                </Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item label="Fecha fallo" name="end_date">
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Tema específico (crédito fiscal, gastos deducibles, etc.)" name="specific_theme">
                  <Input placeholder="Ej. Crédito fiscal, prescripción tributaria, gastos deducibles" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="juris-form-section">
            <h3>Marco legal</h3>
            <Row gutter={[16, 0]}>
              <Col xs={24} md={8}>
                <Form.Item label="Ley" name="law">
                  <Input placeholder="Ej. Ley del IVA, Código Tributario" />
                </Form.Item>
              </Col>
              <Col xs={12} md={4}>
                <Form.Item label="Artículo" name="article">
                  <Input placeholder="Ej. 16" />
                </Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item label="Inciso/Numeral" name="subsection">
                  <Input placeholder="Ej. a), numeral 1" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Periodo fiscal" name="tax_period">
                  <Input placeholder="Ej. 2021, Enero-Diciembre 2022" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="juris-form-section">
            <h3>Análisis jurisprudencial</h3>
            <Form.Item label="Resumen de lo resuelto relacionado con el tema específico" name="jurisprudential_criterion">
              <Input.TextArea rows={4} placeholder="Describe brevemente lo que resolvió el tribunal respecto al tema específico. Ej.: El tribunal determinó que el contribuyente tiene derecho a la devolución del crédito fiscal cuando…" />
            </Form.Item>
            <Form.Item label="Cita jurisprudencial relevante (transcripción general de lo que se dijo en la sentencia)" name="jurisprudential_line">
              <Input.TextArea rows={4} placeholder="Transcribe el fragmento más relevante de la sentencia. Ej.: '…esta Sala considera que conforme al artículo 16 de la Ley del IVA, el contribuyente tiene derecho a…'" />
            </Form.Item>
          </div>

          <div className="juris-form-section">
            <h3>Vinculación y archivo</h3>
            <Form.Item
              label="Expedientes relacionados"
              name="related_expedient"
              tooltip="Vincula otras sentencias de este archivo"
            >
              <Select
                mode="multiple"
                showSearch
                optionFilterProp="label"
                placeholder="Buscar por expediente o tema"
                options={sentenceOptions}
              />
            </Form.Item>

            <Form.Item label="Link" name="link">
              <Input placeholder="https://..." />
            </Form.Item>

            <Form.Item label="Archivo PDF de la sentencia">
              <Upload.Dragger
                accept="application/pdf"
                maxCount={1}
                beforeUpload={() => false}
                fileList={fileList}
                onChange={({ fileList: list }) => setFileList(list.slice(-1))}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  Arrastra el PDF aquí o haz clic para seleccionar
                </p>
                <p className="ant-upload-hint">Solo se procesará el último archivo</p>
              </Upload.Dragger>
            </Form.Item>
          </div>

          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={editing ? <CheckOutlined /> : <FileAddOutlined />}
              size="large"
            >
              {editing ? 'Guardar cambios' : 'Crear sentencia'}
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/dashboard/jurisprudencia')}
            >
              Cancelar
            </Button>
          </Space>
        </Card>
      </Form>
    </div>
  );
};

export default SentenceFormPage;
