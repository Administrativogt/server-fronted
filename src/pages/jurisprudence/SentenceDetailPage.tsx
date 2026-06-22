import React, { useEffect, useState } from 'react';
import {
  Button,
  Descriptions,
  Empty,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  BankOutlined,
  CalendarOutlined,
  CopyOutlined,
  EditOutlined,
  FilePdfOutlined,
  LinkOutlined,
  TagsOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import useThemeStore from '../../hooks/useThemeStore';
import { getSentence, getSentenceFileUrl } from '../../api/jurisprudence';
import type { Sentence } from '../../types/jurisprudence.types';
import JurisprudenceHero from './JurisprudenceHero';
import './jurisprudence.css';

const { Paragraph, Text, Link: AntLink } = Typography;

const fmtDate = (v: string | null | undefined) =>
  v ? dayjs(v).format('DD MMM YYYY') : '—';

const SentenceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const themeMode = useThemeStore((s) => s.mode);
  const isDark = themeMode === 'dark';
  const [sentence, setSentence] = useState<Sentence | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    getSentence(Number(id))
      .then((s) => {
        if (!mounted) return;
        setSentence(s);
      })
      .catch(() => message.error('No se pudo cargar la sentencia'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!sentence?.sentence_file) {
      setFileUrl(null);
      return;
    }
    let mounted = true;
    setLoadingFile(true);
    getSentenceFileUrl(sentence.id)
      .then((u) => mounted && setFileUrl(u))
      .catch(() => mounted && setFileUrl(null))
      .finally(() => mounted && setLoadingFile(false));
    return () => {
      mounted = false;
    };
  }, [sentence?.id, sentence?.sentence_file]);

  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (!sentence) return <Empty description="Sentencia no encontrada" />;

  const creatorName = sentence.creator
    ? `${sentence.creator.first_name ?? ''} ${sentence.creator.last_name ?? ''}`.trim() ||
      sentence.creator.username
    : '—';

  return (
    <div data-juris-theme={isDark ? 'dark' : 'light'}>
      <JurisprudenceHero
        title={sentence.expedient || `Sentencia #${sentence.id}`}
        subtitle={sentence.specific_theme || sentence.sub_theme || 'Sentencia jurisprudencial'}
        stats={[
          { label: 'Tribunal', value: sentence.tribunal?.name ?? '—' },
          { label: 'Fecha fallo', value: fmtDate(sentence.end_date) },
          { label: 'Estado', value: sentence.state?.name ?? '—' },
        ]}
        actions={
          <>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/dashboard/jurisprudencia')}
              ghost
              style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#f4f1ea' }}
            >
              Volver
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/dashboard/jurisprudencia/${sentence.id}/editar`)}
            >
              Editar
            </Button>
          </>
        }
      />

      <div className="juris-detail-grid">
        <div>
          <section className="juris-form-section">
            <h3>
              <TagsOutlined /> Clasificación
            </h3>
            <Space wrap>
              <Tag icon={<BankOutlined />} color="geekblue">
                {sentence.tribunal?.name}
              </Tag>
              <Tag color="purple">{sentence.general_theme?.name}</Tag>
              <Tag color="cyan">{sentence.failure_type?.name}</Tag>
              <Tag color="gold">{sentence.sense_of_failure?.name}</Tag>
              <Tag>{sentence.state?.name}</Tag>
              {sentence.is_intern && <Tag color="red">Interno</Tag>}
            </Space>
          </section>

          <section className="juris-form-section">
            <h3>Datos del expediente</h3>
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="Expediente">
                {sentence.expedient || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Parte que lo promueve">
                {sentence.client || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Parte contraria">
                {sentence.opposing_party || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Magistrados" span={2}>
                {sentence.signers || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Inicio">
                <CalendarOutlined /> {fmtDate(sentence.init_date)}
              </Descriptions.Item>
              <Descriptions.Item label="Fallo">
                <CalendarOutlined /> {fmtDate(sentence.end_date)}
              </Descriptions.Item>
              <Descriptions.Item label="Tema específico" span={2}>
                {sentence.specific_theme || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Subtemas" span={2}>
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {sentence.sub_theme || '—'}
                </Paragraph>
              </Descriptions.Item>
            </Descriptions>
          </section>

          <section className="juris-form-section">
            <h3>Marco legal</h3>
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="Ley">{sentence.law || '—'}</Descriptions.Item>
              <Descriptions.Item label="Artículo">
                {sentence.article || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Inciso/Numeral" span={2}>
                {sentence.subsection || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Reintegro de crédito fiscal">
                {sentence.tax_credit_refund || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Periodo fiscal">
                {sentence.tax_period || '—'}
              </Descriptions.Item>
            </Descriptions>
          </section>

          <section className="juris-form-section">
            <h3>Análisis jurisprudencial</h3>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text strong>Resumen de lo resuelto relacionado con el tema específico:</Text>
                {sentence.jurisprudential_criterion && (
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    style={{ color: '#64748b', padding: '0 4px' }}
                    onClick={() => {
                      navigator.clipboard.writeText(sentence.jurisprudential_criterion).then(
                        () => message.success('Criterio copiado al portapapeles'),
                        () => message.error('No se pudo copiar'),
                      );
                    }}
                  >
                    Copiar
                  </Button>
                )}
              </div>
              <Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 0 }}>
                {sentence.jurisprudential_criterion || '—'}
              </Paragraph>
            </div>
            <div>
              <Text strong>Cita jurisprudencial relevante (transcripción general de lo que se dijo en la sentencia):</Text>
              <Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                {sentence.jurisprudential_line || '—'}
              </Paragraph>
            </div>
          </section>

          {(sentence.sentence_link || sentence.link) && (
            <section className="juris-form-section">
              <h3>
                <LinkOutlined /> Enlaces
              </h3>
              <Descriptions column={1} bordered size="small">
                {sentence.link && (
                  <Descriptions.Item label="Link">
                    <AntLink href={sentence.link} target="_blank" rel="noreferrer">
                      {sentence.link}
                    </AntLink>
                  </Descriptions.Item>
                )}
                {sentence.sentence_link && (
                  <Descriptions.Item label="Enlace sentencia">
                    <AntLink href={sentence.sentence_link} target="_blank" rel="noreferrer">
                      {sentence.sentence_link}
                    </AntLink>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </section>
          )}
        </div>

        <aside>
          <section className="juris-form-section">
            <h3>
              <FilePdfOutlined /> Sentencia (PDF)
            </h3>
            {!sentence.sentence_file ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Sin archivo adjunto"
              />
            ) : loadingFile ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : fileUrl ? (
              <>
                <iframe
                  className="juris-pdf-frame"
                  src={fileUrl}
                  title="Sentencia"
                />
                <Button
                  block
                  type="link"
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  icon={<FilePdfOutlined />}
                  style={{ marginTop: 8 }}
                >
                  Abrir en pestaña nueva
                </Button>
              </>
            ) : (
              <Empty description="No se pudo obtener el archivo" />
            )}
          </section>

          <section className="juris-form-section">
            <h3>Expedientes relacionados</h3>
            {!sentence.related_expedient || sentence.related_expedient.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Sin expedientes vinculados"
              />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {sentence.related_expedient.map((rel) => (
                  <div
                    key={rel.id}
                    className="juris-card"
                    style={{ minHeight: 'auto', padding: 14 }}
                    onClick={() => navigate(`/dashboard/jurisprudencia/${rel.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')
                        navigate(`/dashboard/jurisprudencia/${rel.id}`);
                    }}
                  >
                    <div className="juris-card-expedient" style={{ fontSize: 15 }}>
                      {rel.expedient || `Sentencia #${rel.id}`}
                    </div>
                    <div className="juris-card-theme" style={{ marginBottom: 0 }}>
                      {rel.specific_theme || rel.law}
                    </div>
                  </div>
                ))}
              </Space>
            )}
          </section>

          <section className="juris-form-section">
            <h3>Auditoría</h3>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Creado por">
                <UserOutlined /> {creatorName}
              </Descriptions.Item>
              <Descriptions.Item label="ID interno">#{sentence.id}</Descriptions.Item>
            </Descriptions>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default SentenceDetailPage;
