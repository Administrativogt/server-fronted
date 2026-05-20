import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  DatePicker,
  Input,
  Pagination,
  Popover,
  Select,
  Spin,
  Tag,
  Tooltip,
  message,
} from 'antd';
import type { Dayjs } from 'dayjs';
import useThemeStore from '../../hooks/useThemeStore';
import {
  BankOutlined,
  BookOutlined,
  CalendarOutlined,
  CloseOutlined,
  DashboardOutlined,
  DownOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  LoadingOutlined,
  LockOutlined,
  PlusOutlined,
  ReadOutlined,
  ReloadOutlined,
  SafetyOutlined,
  SearchOutlined,
  TagsOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  fetchCatalogs,
  filterSentences,
  getSentenceFileUrl,
  listSentences,
  searchSentences,
} from '../../api/jurisprudence';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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

/* ─── FilterChip ─────────────────────────────────────────────────── */
interface FilterChipProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  activeLabel?: string;
  children: React.ReactNode;
  onClear: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({
  label, icon, active, activeLabel, children, onClear,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      overlayInnerStyle={{ padding: '14px 16px', borderRadius: 10, boxShadow: '0 8px 30px rgba(30,58,138,0.12)' }}
      content={
        <div className="juris-popover-content">
          {children}
          {active && (
            <div className="juris-popover-clear">
              <Button
                size="small"
                type="text"
                danger
                icon={<CloseOutlined />}
                onClick={() => { onClear(); setOpen(false); }}
                style={{ padding: '0 4px', fontSize: 12 }}
              >
                Quitar filtro
              </Button>
            </div>
          )}
        </div>
      }
      title={
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>
          {label}
        </span>
      }
    >
      <button
        type="button"
        title={active && activeLabel ? `${label}: ${activeLabel}` : label}
        className={`juris-chip${active ? ' active' : ''}`}
      >
        <span className="juris-chip-icon">{icon}</span>
        <span className="juris-chip-text">
          {active && activeLabel ? activeLabel : label}
        </span>
        <DownOutlined className="juris-chip-arrow" />
      </button>
    </Popover>
  );
};

/* ─── Page ───────────────────────────────────────────────────────── */
const JurisprudenceListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const themeMode = useThemeStore((s) => s.mode);
  const isDark = themeMode === 'dark';
  const [data, setData] = useState<PaginatedSentences | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const initialFilter: SentenceFilter = (location.state as { filter?: SentenceFilter } | null)?.filter ?? {};
  const [mode, setMode] = useState<Mode>(Object.keys(initialFilter).length ? 'filter' : 'list');
  const [activeFilter, setActiveFilter] = useState<SentenceFilter>(initialFilter);
  const [catalogs, setCatalogs] = useState<AllCatalogs | null>(null);
  const [themeTags, setThemeTags] = useState<string[]>([]);

  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const clientDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lawDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expedientDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchCatalogs()
      .then((c) => { if (mounted) setCatalogs(c); })
      .catch(() => message.error('No se pudieron cargar los catálogos'));
    return () => { mounted = false; };
  }, []);

  const load = useMemo(
    () => async (currentPage: number, currentMode: Mode) => {
      setLoading(true);
      try {
        let res: PaginatedSentences;
        if (currentMode === 'search') {
          res = await searchSentences(search.trim(), currentPage, PAGE_SIZE);
        } else if (currentMode === 'filter') {
          res = await filterSentences({ ...activeFilter, page: currentPage, page_size: PAGE_SIZE });
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

  useEffect(() => { void load(page, mode); }, [page, mode, load]);

  /* ── filter helpers ── */
  const setField = (key: keyof SentenceFilter, value: unknown) => {
    const next = { ...activeFilter };
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && !(value as unknown[]).length)) {
      delete (next as Record<string, unknown>)[key];
    } else {
      (next as Record<string, unknown>)[key] = value;
    }
    setActiveFilter(next);
    setMode(Object.keys(next).length ? 'filter' : 'list');
    setPage(1);
  };

  const clearField = (key: keyof SentenceFilter) => setField(key, undefined);

  const clearAll = () => {
    setActiveFilter({});
    setThemeTags([]);
    setDateRange(null);
    setMode('list');
    setPage(1);
    setSearch('');
  };

  const onSearch = () => {
    if (search.trim()) { setMode('search'); setPage(1); }
    else { setMode('list'); setPage(1); }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const res = await (mode === 'filter'
        ? filterSentences({ ...activeFilter, page: 1, page_size: 500 })
        : mode === 'search'
          ? searchSentences(search.trim(), 1, 500)
          : listSentences(1, 500));

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Sentencias');
      ws.columns = [
        { header: 'ID', key: 'id', width: 6 },
        { header: 'Expediente', key: 'expedient', width: 18 },
        { header: 'Cliente', key: 'client', width: 30 },
        { header: 'Tribunal', key: 'tribunal', width: 35 },
        { header: 'Tema específico', key: 'specific_theme', width: 35 },
        { header: 'Tipo de fallo', key: 'failure_type', width: 20 },
        { header: 'Sentido del fallo', key: 'sense_of_failure', width: 20 },
        { header: 'Fecha fallo', key: 'end_date', width: 14 },
        { header: 'Ley', key: 'law', width: 25 },
        { header: 'Artículo', key: 'article', width: 10 },
        { header: 'Periodo fiscal', key: 'tax_period', width: 15 },
        { header: 'Resumen de lo resuelto', key: 'criterion', width: 50 },
        { header: 'Interno', key: 'is_intern', width: 10 },
      ];
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      res.results.forEach((s) => {
        ws.addRow({
          id: s.id,
          expedient: s.expedient,
          client: s.client,
          tribunal: s.tribunal?.name ?? '',
          specific_theme: s.specific_theme,
          failure_type: s.failure_type?.name ?? '',
          sense_of_failure: s.sense_of_failure?.name ?? '',
          end_date: s.end_date ? dayjs(s.end_date).format('DD/MM/YYYY') : '',
          law: s.law,
          article: s.article,
          tax_period: s.tax_period,
          criterion: s.jurisprudential_criterion,
          is_intern: s.is_intern ? 'Sí' : 'No',
        });
      });

      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf]), `sentencias_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      message.success(`${res.results.length} sentencias exportadas`);
    } catch {
      message.error('Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  const activeCount = Object.keys(activeFilter).filter(k => k !== 'page' && k !== 'page_size').length;
  const tribunalName = catalogs?.tribunals.find(t => t.id === activeFilter.tribunal)?.name ?? '';
  const failureName = catalogs?.failure_types.find(t => t.id === activeFilter.failure_type)?.name ?? '';
  const senseName = catalogs?.senses_of_failure.find(t => t.id === activeFilter.sense_of_failure)?.name ?? '';
  const generalThemeName = catalogs?.general_themes.find(t => t.id === activeFilter.general_theme)?.name ?? '';

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

      {/* ── Unified search + filter card ── */}
      <div className="juris-filter-card">

        {/* Search row */}
        <div className="juris-toolbar" style={{ marginBottom: 14 }}>
          <Input
            allowClear
            size="large"
            className="juris-search"
            placeholder="Buscar por expediente, tema, ley, criterio…"
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={onSearch}
          />
          <Button size="large" type="primary" icon={<SearchOutlined />} onClick={onSearch}>
            Buscar
          </Button>
          <Tooltip title="Exportar resultados a Excel (máx. 500)">
            <Button
              size="large"
              icon={exporting ? <LoadingOutlined /> : <DownloadOutlined />}
              onClick={exportToExcel}
              disabled={exporting}
            >
              Exportar
            </Button>
          </Tooltip>
        </div>

        {/* Filter chips row */}
        <div className="juris-filter-row">
          <span className="juris-filter-label">Filtrar:</span>

          <FilterChip
            label="Tribunal"
            icon={<BankOutlined />}
            active={!!activeFilter.tribunal}
            activeLabel={tribunalName.length > 20 ? `${tribunalName.slice(0, 18)}…` : tribunalName}
            onClear={() => clearField('tribunal')}
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="children"
              placeholder="Todos los tribunales"
              style={{ width: '100%' }}
              value={activeFilter.tribunal}
              onChange={(val) => setField('tribunal', val)}
            >
              {catalogs?.tribunals.map((t) => (
                <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
              ))}
            </Select>
          </FilterChip>

          <FilterChip
            label="Tipo de fallo"
            icon={<ThunderboltOutlined />}
            active={!!activeFilter.failure_type}
            activeLabel={failureName}
            onClear={() => clearField('failure_type')}
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="children"
              placeholder="Todos"
              style={{ width: '100%' }}
              value={activeFilter.failure_type}
              onChange={(val) => setField('failure_type', val)}
            >
              {catalogs?.failure_types.map((t) => (
                <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
              ))}
            </Select>
          </FilterChip>

          <FilterChip
            label="Sentido del fallo"
            icon={<SafetyOutlined />}
            active={!!activeFilter.sense_of_failure}
            activeLabel={senseName}
            onClear={() => clearField('sense_of_failure')}
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="children"
              placeholder="Todos los sentidos"
              style={{ width: '100%' }}
              value={activeFilter.sense_of_failure}
              onChange={(val) => setField('sense_of_failure', val)}
            >
              {catalogs?.senses_of_failure.map((t) => (
                <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
              ))}
            </Select>
          </FilterChip>

          <FilterChip
            label="Tema general"
            icon={<ReadOutlined />}
            active={!!activeFilter.general_theme}
            activeLabel={generalThemeName.length > 18 ? `${generalThemeName.slice(0, 16)}…` : generalThemeName}
            onClear={() => clearField('general_theme')}
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="children"
              placeholder="Todas las materias"
              style={{ width: '100%' }}
              value={activeFilter.general_theme}
              onChange={(val) => setField('general_theme', val)}
            >
              {catalogs?.general_themes.map((t) => (
                <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
              ))}
            </Select>
          </FilterChip>

          <FilterChip
            label="Cliente"
            icon={<TeamOutlined />}
            active={!!activeFilter.client}
            activeLabel={activeFilter.client}
            onClear={() => clearField('client')}
          >
            <Input
              allowClear
              placeholder="Nombre del cliente"
              defaultValue={activeFilter.client}
              onChange={(e) => {
                if (clientDebounce.current) clearTimeout(clientDebounce.current);
                clientDebounce.current = setTimeout(() => setField('client', e.target.value), 400);
              }}
            />
          </FilterChip>

          <FilterChip
            label="Tema"
            icon={<TagsOutlined />}
            active={themeTags.length > 0}
            activeLabel={themeTags.length === 1 ? themeTags[0] : `${themeTags.length} temas`}
            onClear={() => { setThemeTags([]); clearField('specific_theme'); }}
          >
            <p className="juris-popover-hint">
              Escribe una palabra y presiona <kbd style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>Enter</kbd> — busca sentencias con cualquiera de los términos.
            </p>
            <Select
              mode="tags"
              placeholder="prescripción, crédito fiscal…"
              tokenSeparators={[',']}
              open={false}
              style={{ width: '100%' }}
              value={themeTags}
              onChange={(tags) => {
                setThemeTags(tags);
                setField('specific_theme', tags.length ? tags.join(',') : undefined);
              }}
            />
          </FilterChip>

          <FilterChip
            label="Ley"
            icon={<FileTextOutlined />}
            active={!!activeFilter.law}
            activeLabel={activeFilter.law}
            onClear={() => clearField('law')}
          >
            <Input
              allowClear
              placeholder="Ej. Ley del IVA, Código Tributario"
              defaultValue={activeFilter.law}
              onChange={(e) => {
                if (lawDebounce.current) clearTimeout(lawDebounce.current);
                lawDebounce.current = setTimeout(() => setField('law', e.target.value), 400);
              }}
            />
          </FilterChip>

          <FilterChip
            label="Expediente"
            icon={<BookOutlined />}
            active={!!activeFilter.expedient}
            activeLabel={activeFilter.expedient}
            onClear={() => clearField('expedient')}
          >
            <Input
              allowClear
              placeholder="Ej. 1095-2022"
              defaultValue={activeFilter.expedient}
              onChange={(e) => {
                if (expedientDebounce.current) clearTimeout(expedientDebounce.current);
                expedientDebounce.current = setTimeout(() => setField('expedient', e.target.value), 400);
              }}
            />
          </FilterChip>

          <FilterChip
            label="Origen"
            icon={<LockOutlined />}
            active={activeFilter.is_intern !== undefined}
            activeLabel={activeFilter.is_intern ? 'Interno' : 'Externo'}
            onClear={() => clearField('is_intern')}
          >
            <Select
              allowClear
              placeholder="Interno o externo"
              style={{ width: '100%' }}
              value={activeFilter.is_intern === undefined ? undefined : activeFilter.is_intern ? 'true' : 'false'}
              onChange={(val) => {
                if (val === undefined || val === null) clearField('is_intern');
                else setField('is_intern', val === 'true');
              }}
            >
              <Select.Option value="true">Interno</Select.Option>
              <Select.Option value="false">Externo</Select.Option>
            </Select>
          </FilterChip>

          <FilterChip
            label="Fecha fallo"
            icon={<CalendarOutlined />}
            active={!!(activeFilter.init_date || activeFilter.end_date)}
            activeLabel={
              activeFilter.init_date && activeFilter.end_date
                ? `${dayjs(activeFilter.init_date).format('DD/MM/YY')} – ${dayjs(activeFilter.end_date).format('DD/MM/YY')}`
                : activeFilter.init_date
                  ? `Desde ${dayjs(activeFilter.init_date).format('DD/MM/YY')}`
                  : `Hasta ${dayjs(activeFilter.end_date).format('DD/MM/YY')}`
            }
            onClear={() => {
              setDateRange(null);
              const next = { ...activeFilter };
              delete (next as Record<string, unknown>).init_date;
              delete (next as Record<string, unknown>).end_date;
              setActiveFilter(next);
              setMode(Object.keys(next).length ? 'filter' : 'list');
              setPage(1);
            }}
          >
            <DatePicker.RangePicker
              style={{ width: 280 }}
              format="DD/MM/YYYY"
              value={dateRange}
              placeholder={['Fecha inicio', 'Fecha fallo']}
              onChange={(vals) => {
                setDateRange(vals as [Dayjs | null, Dayjs | null] | null);
                const next = { ...activeFilter };
                if (vals && vals[0]) {
                  (next as Record<string, unknown>).init_date = vals[0].format('YYYY-MM-DD');
                } else {
                  delete (next as Record<string, unknown>).init_date;
                }
                if (vals && vals[1]) {
                  (next as Record<string, unknown>).end_date = vals[1].format('YYYY-MM-DD');
                } else {
                  delete (next as Record<string, unknown>).end_date;
                }
                setActiveFilter(next);
                setMode(Object.keys(next).length ? 'filter' : 'list');
                setPage(1);
              }}
            />
          </FilterChip>

          {(activeCount > 0 || search) && (
            <Button
              type="text"
              danger
              size="small"
              icon={<CloseOutlined />}
              onClick={clearAll}
              style={{ marginLeft: 4, borderRadius: 8, fontSize: 12, fontWeight: 500 }}
            >
              Limpiar todo
            </Button>
          )}
        </div>

        {/* Active filter tags */}
        {activeCount > 0 && (
          <div className="juris-active-tags">
            <span className="juris-active-label">Activos:</span>
            {activeFilter.tribunal && (
              <Tag closable color="blue" onClose={() => clearField('tribunal')}>
                {tribunalName.length > 30 ? `${tribunalName.slice(0, 28)}…` : tribunalName}
              </Tag>
            )}
            {activeFilter.failure_type && (
              <Tag closable color="orange" onClose={() => clearField('failure_type')}>
                {failureName}
              </Tag>
            )}
            {activeFilter.sense_of_failure && (
              <Tag closable color="gold" onClose={() => clearField('sense_of_failure')}>
                Sentido: {senseName}
              </Tag>
            )}
            {activeFilter.general_theme && (
              <Tag closable color="geekblue" onClose={() => clearField('general_theme')}>
                Materia: {generalThemeName}
              </Tag>
            )}
            {activeFilter.is_intern !== undefined && (
              <Tag closable color="volcano" onClose={() => clearField('is_intern')}>
                {activeFilter.is_intern ? 'Interno' : 'Externo'}
              </Tag>
            )}
            {activeFilter.client && (
              <Tag closable color="green" onClose={() => clearField('client')}>
                Cliente: {activeFilter.client}
              </Tag>
            )}
            {activeFilter.specific_theme &&
              activeFilter.specific_theme.split(',').map((t) => (
                <Tag
                  key={t}
                  closable
                  color="purple"
                  onClose={() => {
                    const remaining = themeTags.filter(x => x !== t.trim());
                    setThemeTags(remaining);
                    setField('specific_theme', remaining.length ? remaining.join(',') : undefined);
                  }}
                >
                  {t.trim()}
                </Tag>
              ))
            }
            {activeFilter.law && (
              <Tag closable color="cyan" onClose={() => clearField('law')}>
                Ley: {activeFilter.law}
              </Tag>
            )}
            {activeFilter.expedient && (
              <Tag closable onClose={() => clearField('expedient')}>
                Exp: {activeFilter.expedient}
              </Tag>
            )}
            {(activeFilter.init_date || activeFilter.end_date) && (
              <Tag
                closable
                color="volcano"
                onClose={() => {
                  setDateRange(null);
                  const next = { ...activeFilter };
                  delete (next as Record<string, unknown>).init_date;
                  delete (next as Record<string, unknown>).end_date;
                  setActiveFilter(next);
                  setMode(Object.keys(next).length ? 'filter' : 'list');
                  setPage(1);
                }}
              >
                <CalendarOutlined />{' '}
                {activeFilter.init_date ? dayjs(activeFilter.init_date).format('DD/MM/YY') : '?'} –{' '}
                {activeFilter.end_date ? dayjs(activeFilter.end_date).format('DD/MM/YY') : '?'}
              </Tag>
            )}
          </div>
        )}
      </div>

      {/* ── Results ── */}
      <Spin spinning={loading}>
        {items.length === 0 && !loading ? (
          <div className="juris-empty">
            <BookOutlined />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Sin sentencias</div>
            <div>No hay resultados. Prueba ajustar los filtros o registra una nueva sentencia.</div>
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
    </div>
  );
};

/* ─── SentenceCard ───────────────────────────────────────────────── */
interface SentenceCardProps {
  sentence: Sentence;
  onClick: () => void;
}

function getSenseVariant(name?: string): string {
  if (!name) return 'juris-card--neutral';
  const n = name.toLowerCase();
  if (n.includes('otorga') || (n.includes('con lugar') && !n.includes('parcial'))) return 'juris-card--favorable';
  if (n.includes('deniega') || n.includes('sin lugar')) return 'juris-card--unfavorable';
  if (n.includes('parcial')) return 'juris-card--partial';
  if (n.includes('archiv') || n.includes('inadmis')) return 'juris-card--info';
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
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    >
      <div className="juris-card-header">
        <div className="juris-card-seal" aria-hidden="true">{initials}</div>
        <div className="juris-card-headinfo">
          <div className="juris-card-id">Expediente</div>
          <div className="juris-card-expedient">
            {sentence.expedient || `Sentencia #${sentence.id}`}
          </div>
        </div>
        {sentence.sentence_file && (
          <Tooltip title="Abrir PDF">
            <span
              className="juris-card-pdf-badge"
              role="button"
              tabIndex={0}
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const url = await getSentenceFileUrl(sentence.id);
                  if (url) window.open(url, '_blank', 'noreferrer');
                  else message.warning('No se pudo obtener el archivo');
                } catch {
                  message.error('Error al abrir el PDF');
                }
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }}
            >
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
            <BankOutlined />{sentence.tribunal.name}
          </span>
        )}
        {sentence.general_theme?.name && (
          <span className="juris-tag juris-tag--theme">
            <TagsOutlined />{sentence.general_theme.name}
          </span>
        )}
        {sentence.sense_of_failure?.name && (
          <span className="juris-tag juris-tag--sense">{sentence.sense_of_failure.name}</span>
        )}
      </div>

      <div className="juris-card-footer">
        <span className="juris-card-footer-item">
          <CalendarOutlined />{dateText}
        </span>
        <span className="juris-card-footer-item client">
          {sentence.client || sentence.failure_type?.name || '—'}
        </span>
      </div>
    </div>
  );
};

export default JurisprudenceListPage;
