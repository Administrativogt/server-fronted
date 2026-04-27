import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Drawer,
  Form,
  Input,
  Pagination,
  Select,
  Space,
  Spin,
  Tooltip,
  message,
} from 'antd';
import useThemeStore from '../../hooks/useThemeStore';
import {
  BookOutlined,
  DashboardOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilePdfOutlined,
  CalendarOutlined,
  BankOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  fetchCatalogs,
  filterSentences,
  listSentences,
  searchSentences,
} from '../../api/jurisprudence';
import type {
  AllCatalogs,
  PaginatedSentences,
  Sentence,
  SentenceFilter,
} from '../../types/jurisprudence.types';
import JurisprudenceHero from './JurisprudenceHero';
import './jurisprudence.css';

const PAGE_SIZE = 12;

type Mode = 'list' | 'search' | 'filter';

const JurisprudenceListPage: React.FC = () => {
  const navigate = useNavigate();
  const themeMode = useThemeStore((s) => s.mode);
  const isDark = themeMode === 'dark';
  const [data, setData] = useState<PaginatedSentences | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<Mode>('list');
  const [activeFilter, setActiveFilter] = useState<SentenceFilter>({});
  const [filterDrawer, setFilterDrawer] = useState(false);
  const [catalogs, setCatalogs] = useState<AllCatalogs | null>(null);
  const [filterForm] = Form.useForm<SentenceFilter>();

  useEffect(() => {
    let mounted = true;
    fetchCatalogs()
      .then((c) => {
        if (mounted) setCatalogs(c);
      })
      .catch(() => message.error('No se pudieron cargar los catálogos'));
    return () => {
      mounted = false;
    };
  }, []);

  const load = useMemo(
    () =>
      async (currentPage: number, currentMode: Mode) => {
        setLoading(true);
        try {
          let res: PaginatedSentences;
          if (currentMode === 'search') {
            res = await searchSentences(search.trim(), currentPage, PAGE_SIZE);
          } else if (currentMode === 'filter') {
            res = await filterSentences({
              ...activeFilter,
              page: currentPage,
              page_size: PAGE_SIZE,
            });
          } else {
            res = await listSentences(currentPage, PAGE_SIZE);
          }
          setData(res);
        } catch {
          message.error('Error al cargar las sentencias');
        } finally {
          setLoading(false);
        }
      },
    [search, activeFilter],
  );

  useEffect(() => {
    void load(page, mode);
  }, [page, mode, load]);

  const onSearch = () => {
    if (search.trim()) {
      setMode('search');
      setPage(1);
    } else {
      setMode('list');
      setPage(1);
    }
  };

  const onApplyFilter = (values: SentenceFilter) => {
    const cleaned = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== undefined && v !== ''),
    ) as SentenceFilter;
    setActiveFilter(cleaned);
    setMode(Object.keys(cleaned).length ? 'filter' : 'list');
    setPage(1);
    setFilterDrawer(false);
  };

  const onClearFilter = () => {
    filterForm.resetFields();
    setActiveFilter({});
    setMode('list');
    setPage(1);
    setSearch('');
  };

  const activeFiltersCount = Object.keys(activeFilter).filter(
    (k) => k !== 'page' && k !== 'page_size',
  ).length;

  const items = data?.results ?? [];

  return (
    <div data-juris-theme={isDark ? 'dark' : 'light'}>
      <JurisprudenceHero
        title="Archivo Jurisprudencial"
        subtitle="Consulta, registra y vincula sentencias relevantes para fortalecer la práctica jurídica."
        stats={[
          { label: 'Sentencias', value: data?.count ?? '—' },
          { label: 'Página', value: data ? `${data.page} / ${data.total_pages || 1}` : '—' },
        ]}
        actions={
          <>
            <Button
              icon={<DashboardOutlined />}
              onClick={() => navigate('/dashboard/jurisprudencia/panel')}
              ghost
              style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#f4f1ea' }}
            >
              Panel
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => load(page, mode)}
              ghost
              style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#f4f1ea' }}
            >
              Refrescar
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/dashboard/jurisprudencia/crear')}
            >
              Nueva sentencia
            </Button>
          </>
        }
      />

      <div className="juris-toolbar">
        <Input
          allowClear
          size="large"
          className="juris-search"
          placeholder="Buscar por expediente, tema, ley, criterio…"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onPressEnter={onSearch}
        />
        <Button size="large" type="primary" icon={<SearchOutlined />} onClick={onSearch}>
          Buscar
        </Button>
        <Button
          size="large"
          icon={<FilterOutlined />}
          onClick={() => setFilterDrawer(true)}
        >
          Filtros{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
        </Button>
        {(mode !== 'list' || search) && (
          <Button size="large" onClick={onClearFilter}>
            Limpiar
          </Button>
        )}
      </div>

      <Spin spinning={loading}>
        {items.length === 0 && !loading ? (
          <div className="juris-empty">
            <BookOutlined />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Sin sentencias
            </div>
            <div>
              No hay resultados para tu búsqueda. Prueba ajustar los filtros o registra una nueva sentencia.
            </div>
          </div>
        ) : (
          <div className="juris-grid">
            {items.map((s) => (
              <SentenceCard
                key={s.id}
                sentence={s}
                onClick={() => navigate(`/dashboard/jurisprudencia/${s.id}`)}
              />
            ))}
          </div>
        )}
      </Spin>

      {data && data.count > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={data.count}
            showSizeChanger={false}
            onChange={(p) => setPage(p)}
          />
        </div>
      )}

      <Drawer
        title="Filtros avanzados"
        placement="right"
        width={420}
        open={filterDrawer}
        onClose={() => setFilterDrawer(false)}
        extra={
          <Space>
            <Button onClick={onClearFilter}>Limpiar</Button>
            <Button type="primary" onClick={() => filterForm.submit()}>
              Aplicar
            </Button>
          </Space>
        }
      >
        <Form
          form={filterForm}
          layout="vertical"
          initialValues={activeFilter}
          onFinish={onApplyFilter}
        >
          <Form.Item label="Expediente" name="expedient">
            <Input placeholder="Ej. 1095-2022" />
          </Form.Item>
          <Form.Item label="Tribunal" name="tribunal">
            <Select allowClear placeholder="Todos">
              {catalogs?.tribunals.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Tema general" name="general_theme">
            <Select allowClear placeholder="Todos">
              {catalogs?.general_themes.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Tipo de fallo" name="failure_type">
            <Select allowClear placeholder="Todos">
              {catalogs?.failure_types.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Sentido del fallo" name="sense_of_failure">
            <Select allowClear placeholder="Todos">
              {catalogs?.senses_of_failure.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Cliente" name="client">
            <Input placeholder="Nombre del cliente" />
          </Form.Item>
          <Form.Item label="Tema específico" name="specific_theme">
            <Input />
          </Form.Item>
          <Form.Item label="Ley" name="law">
            <Input />
          </Form.Item>
          <Form.Item label="Criterio jurisprudencial" name="jurisprudential_criterion">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Línea jurisprudencial" name="jurisprudential_line">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Periodo fiscal" name="tax_period">
            <Input />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

interface SentenceCardProps {
  sentence: Sentence;
  onClick: () => void;
}

function getSenseVariant(name?: string): string {
  if (!name) return 'juris-card--neutral';
  const n = name.toLowerCase();
  if (n.includes('otorga') || (n.includes('con lugar') && !n.includes('parcial'))) {
    return 'juris-card--favorable';
  }
  if (n.includes('deniega') || n.includes('sin lugar')) {
    return 'juris-card--unfavorable';
  }
  if (n.includes('parcial')) {
    return 'juris-card--partial';
  }
  if (n.includes('archiv') || n.includes('inadmis')) {
    return 'juris-card--info';
  }
  return 'juris-card--neutral';
}

function tribunalInitials(name?: string): string {
  if (!name) return 'J';
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return name.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const SentenceCard: React.FC<SentenceCardProps> = ({ sentence, onClick }) => {
  const dateText = sentence.end_date
    ? dayjs(sentence.end_date).format('DD MMM YYYY')
    : sentence.init_date
      ? dayjs(sentence.init_date).format('DD MMM YYYY')
      : '—';

  const variant = getSenseVariant(sentence.sense_of_failure?.name);
  const initials = tribunalInitials(sentence.tribunal?.name);

  return (
    <div
      className={`juris-card juris-fade-in ${variant}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
    >
      <div className="juris-card-header">
        <div className="juris-card-seal" aria-hidden="true">
          {initials}
        </div>
        <div className="juris-card-headinfo">
          <div className="juris-card-id">Expediente</div>
          <div className="juris-card-expedient">
            {sentence.expedient || `Sentencia #${sentence.id}`}
          </div>
        </div>
        {sentence.sentence_file && (
          <Tooltip title="Archivo PDF disponible">
            <span className="juris-card-pdf-badge">
              <FilePdfOutlined />
            </span>
          </Tooltip>
        )}
      </div>

      <div className="juris-card-theme">
        {sentence.specific_theme || sentence.sub_theme || sentence.law || 'Sin tema asignado'}
      </div>

      <div className="juris-card-meta">
        {sentence.tribunal?.name && (
          <span className="juris-tag juris-tag--tribunal">
            <BankOutlined />
            {sentence.tribunal.name}
          </span>
        )}
        {sentence.general_theme?.name && (
          <span className="juris-tag juris-tag--theme">
            <TagsOutlined />
            {sentence.general_theme.name}
          </span>
        )}
        {sentence.sense_of_failure?.name && (
          <span className="juris-tag juris-tag--sense">
            {sentence.sense_of_failure.name}
          </span>
        )}
      </div>

      <div className="juris-card-footer">
        <span className="juris-card-footer-item">
          <CalendarOutlined />
          {dateText}
        </span>
        <span className="juris-card-footer-item client">
          {sentence.client || sentence.failure_type?.name || '—'}
        </span>
      </div>
    </div>
  );
};

export default JurisprudenceListPage;
