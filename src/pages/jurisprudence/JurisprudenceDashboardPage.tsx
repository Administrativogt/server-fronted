import React, { useEffect, useMemo, useState } from 'react';
import { Button, Col, Empty, List, Modal, Row, Tag, message } from 'antd';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import {
  BankOutlined,
  BookOutlined,
  ClockCircleOutlined,
  FilePdfOutlined,
  PlusOutlined,
  ReadOutlined,
  ReloadOutlined,
  RiseOutlined,
  SafetyOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import useThemeStore from '../../hooks/useThemeStore';
import { fetchDashboardStats, filterSentences } from '../../api/jurisprudence';
import type { DashboardStats, Sentence } from '../../types/jurisprudence.types';
import JurisprudenceHero from './JurisprudenceHero';
import AnimatedNumber from './AnimatedNumber';
import './jurisprudence.css';

type Variant = 'indigo' | 'gold' | 'emerald' | 'rose' | 'cyan' | 'slate';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant: Variant;
  hint?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, variant, hint, onClick }) => (
  <div
    className={`juris-stat juris-stat--${variant} juris-fade-in`}
    onClick={onClick}
    style={onClick ? { cursor: 'pointer' } : undefined}
  >
    <div className="juris-stat-row">
      <div>
        <div className="juris-stat-label">{label}</div>
        <div className="juris-stat-value">
          <AnimatedNumber value={value} />
        </div>
        {hint && <div className="juris-stat-trend">{hint}</div>}
      </div>
      <div className="juris-stat-icon">{icon}</div>
    </div>
  </div>
);

const PALETTE_LIGHT = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#f97316'];
const PALETTE_DARK = ['#818cf8', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#22d3ee', '#60a5fa', '#fb923c'];

const JurisprudenceDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const themeMode = useThemeStore((s) => s.mode);
  const isDark = themeMode === 'dark';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ title: string; content: React.ReactNode } | null>(null);
  const [yearModal, setYearModal] = useState<{ year: number; loading: boolean; sentences: Sentence[] } | null>(null);
  const [categoryModal, setCategoryModal] = useState<{
    title: string;
    loading: boolean;
    sentences: Sentence[];
  } | null>(null);

  const openCategoryModal = async (
    title: string,
    filterKey: 'general_theme' | 'sense_of_failure' | 'tribunal' | 'failure_type' | 'state',
    dbId: number | null,
  ) => {
    if (dbId === null) return;
    setCategoryModal({ title, loading: true, sentences: [] });
    try {
      const res = await filterSentences({ [filterKey]: dbId, page: 1, page_size: 100 });
      setCategoryModal((prev) => prev ? { ...prev, loading: false, sentences: res.results } : null);
    } catch {
      message.error('No se pudieron cargar las sentencias');
      setCategoryModal(null);
    }
  };

  const openYearModal = async (year: number) => {
    setYearModal({ year, loading: true, sentences: [] });
    try {
      const res = await filterSentences({
        init_date: `${year}-01-01`,
        end_date: `${year}-12-31`,
        page: 1,
        page_size: 100,
      });
      setYearModal({ year, loading: false, sentences: res.results });
    } catch {
      message.error('No se pudieron cargar las sentencias');
      setYearModal(null);
    }
  };

  const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;

  const load = () => {
    setLoading(true);
    fetchDashboardStats()
      .then(setStats)
      .catch(() => message.error('No se pudieron cargar las estadísticas'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const nivoTheme = useMemo(
    () => ({
      background: 'transparent',
      text: { fill: isDark ? '#cdd0db' : '#475569', fontSize: 12 },
      axis: {
        domain: { line: { stroke: isDark ? '#2c2f40' : '#e5e7eb' } },
        ticks: {
          line: { stroke: isDark ? '#2c2f40' : '#e5e7eb' },
          text: { fill: isDark ? '#a0a4b3' : '#64748b', fontSize: 11 },
        },
        legend: {
          text: { fill: isDark ? '#cdd0db' : '#475569', fontSize: 12 },
        },
      },
      grid: { line: { stroke: isDark ? '#2c2f40' : '#f1f5f9', strokeDasharray: '3 3' } },
      tooltip: {
        container: {
          background: isDark ? '#1d1f2b' : '#ffffff',
          color: isDark ? '#ecedf2' : '#1f2640',
          border: `1px solid ${isDark ? '#2c2f40' : '#e5e7eb'}`,
          fontSize: 12,
        },
      },
      legends: {
        text: { fill: isDark ? '#cdd0db' : '#475569', fontSize: 12 },
      },
    }),
    [isDark],
  );

  const yearsBarData = useMemo(
    () =>
      (stats?.by_year ?? []).map((b) => ({
        year: String(b.year),
        Sentencias: b.count,
      })),
    [stats?.by_year],
  );

  const themePieData = useMemo(
    () =>
      (stats?.by_general_theme ?? [])
        .filter((b) => b.count > 0)
        .map((b, i) => ({
          id: b.name,
          label: b.name,
          value: b.count,
          color: palette[i % palette.length],
          dbId: b.id,
        })),
    [stats?.by_general_theme, palette],
  );

  const sensePieData = useMemo(
    () =>
      (stats?.by_sense_of_failure ?? [])
        .filter((b) => b.count > 0)
        .map((b, i) => ({
          id: b.name,
          label: b.name,
          value: b.count,
          color: palette[i % palette.length],
          dbId: b.id,
        })),
    [stats?.by_sense_of_failure, palette],
  );

  const tribunalBarData = useMemo(
    () =>
      (stats?.by_tribunal ?? [])
        .filter((b) => b.count > 0)
        .slice(0, 8)
        .map((b) => ({
          tribunal: b.name.length > 28 ? `${b.name.slice(0, 26)}…` : b.name,
          Sentencias: b.count,
          dbId: b.id,
        })),
    [stats?.by_tribunal],
  );

  const failureTypeBarData = useMemo(
    () =>
      (stats?.by_failure_type ?? [])
        .filter((b) => b.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((b) => ({
          tipo: b.name.length > 32 ? `${b.name.slice(0, 30)}…` : b.name,
          Sentencias: b.count,
          dbId: b.id,
        })),
    [stats?.by_failure_type],
  );

  const statePieData = useMemo(
    () =>
      (stats?.by_state ?? [])
        .filter((b) => b.count > 0)
        .map((b, i) => ({
          id: b.name,
          label: b.name,
          value: b.count,
          color: palette[i % palette.length],
          dbId: b.id,
        })),
    [stats?.by_state, palette],
  );

  const themeTotal = useMemo(() => themePieData.reduce((s, d) => s + d.value, 0), [themePieData]);
  const senseTotal = useMemo(() => sensePieData.reduce((s, d) => s + d.value, 0), [sensePieData]);
  const stateTotal = useMemo(() => statePieData.reduce((s, d) => s + d.value, 0), [statePieData]);

  if (loading && !stats) {
    return (
      <div className="juris-loader">
        <div className="juris-loader-ring" />
      </div>
    );
  }

  if (!stats) return <Empty description="Sin datos" />;

  const t = stats.totals;

  return (
    <div data-juris-theme={isDark ? 'dark' : 'light'}>
      <JurisprudenceHero
        title="Panel de Jurisprudencia"
        subtitle="Resumen ejecutivo del archivo jurisprudencial. Métricas, distribución y actividad reciente."
        stats={[
          { label: 'Sentencias totales', value: t.total },
          { label: 'Con archivo', value: t.with_file },
          { label: 'Tribunales registrados', value: t.distinct_tribunals },
        ]}
        actions={
          <>
            <Button
              icon={<ReloadOutlined />}
              onClick={load}
              ghost
              style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#f4f1ea' }}
            >
              Actualizar
            </Button>
            <Button
              icon={<BookOutlined />}
              onClick={() => navigate('/dashboard/jurisprudencia')}
              ghost
              style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#f4f1ea' }}
            >
              Archivo
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/dashboard/jurisprudencia/crear')}
            >
              Nueva
            </Button>
          </>
        }
      />

      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            label="Sentencias totales"
            value={t.total}
            icon={<ReadOutlined />}
            variant="indigo"
            hint={`${t.this_year} este año`}
            onClick={() => navigate('/dashboard/jurisprudencia')}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            label="Archivos PDF"
            value={t.with_file}
            icon={<FilePdfOutlined />}
            variant="rose"
            hint={`${t.total > 0 ? Math.round((t.with_file / t.total) * 100) : 0}% del total`}
            onClick={() =>
              setModal({
                title: 'Sentencias con archivo PDF',
                content: (
                  <List
                    size="small"
                    dataSource={stats.recent.filter((r) => r.sentence_file)}
                    locale={{ emptyText: 'Sin datos disponibles' }}
                    renderItem={(r) => (
                      <List.Item
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setModal(null);
                          navigate(`/dashboard/jurisprudencia/${r.id}`);
                        }}
                      >
                        <List.Item.Meta
                          title={r.expedient || `Sentencia #${r.id}`}
                          description={r.specific_theme || r.tribunal || '—'}
                        />
                        <Tag color="red">PDF</Tag>
                      </List.Item>
                    )}
                  />
                ),
              })
            }
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            label="Tribunales registrados"
            value={t.distinct_tribunals}
            icon={<BankOutlined />}
            variant="cyan"
            onClick={() =>
              setModal({
                title: 'Tribunales registrados',
                content: (
                  <List
                    size="small"
                    dataSource={[...stats.by_tribunal].sort((a, b) => b.count - a.count)}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta title={item.name} />
                        <Tag color="cyan">{item.count} sentencia{item.count !== 1 ? 's' : ''}</Tag>
                      </List.Item>
                    )}
                  />
                ),
              })
            }
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            label="Clientes únicos"
            value={t.distinct_clients}
            icon={<TeamOutlined />}
            variant="emerald"
            onClick={() => {
              const deduped = Array.from(
                stats.top_clients
                  .reduce((map, c) => {
                    const key = c.name.trim().toLowerCase().slice(0, 45);
                    const ex = map.get(key);
                    if (ex) ex.count += c.count;
                    else map.set(key, { name: c.name.trim(), count: c.count });
                    return map;
                  }, new Map<string, { name: string; count: number }>())
                  .values(),
              ).sort((a, b) => b.count - a.count);
              setModal({
                title: `Clientes (top ${deduped.length})`,
                content: (
                  <List
                    size="small"
                    dataSource={deduped}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta title={item.name} />
                        <Tag color="green">{item.count}</Tag>
                      </List.Item>
                    )}
                  />
                ),
              });
            }}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            label="Últimos 30 días"
            value={t.last_30_days}
            icon={<ThunderboltOutlined />}
            variant="gold"
            hint="Actividad reciente"
            onClick={() =>
              setModal({
                title: 'Sentencias — últimos 30 días',
                content: (
                  <List
                    size="small"
                    dataSource={stats.recent.filter((r) => {
                      const date = r.end_date || r.init_date;
                      return date && dayjs(date).isAfter(dayjs().subtract(30, 'day'));
                    })}
                    locale={{ emptyText: 'Sin actividad en los últimos 30 días' }}
                    renderItem={(r) => (
                      <List.Item
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setModal(null);
                          navigate(`/dashboard/jurisprudencia/${r.id}`);
                        }}
                      >
                        <List.Item.Meta
                          title={r.expedient || `Sentencia #${r.id}`}
                          description={r.specific_theme || '—'}
                        />
                        <Tag>{r.end_date ? dayjs(r.end_date).format('DD MMM YYYY') : '—'}</Tag>
                      </List.Item>
                    )}
                  />
                ),
              })
            }
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            label="Este año"
            value={t.this_year}
            icon={<RiseOutlined />}
            variant="indigo"
            onClick={() =>
              setModal({
                title: `Sentencias ${dayjs().year()}`,
                content: (
                  <List
                    size="small"
                    dataSource={stats.recent.filter((r) => {
                      const date = r.end_date || r.init_date;
                      return date && dayjs(date).year() === dayjs().year();
                    })}
                    locale={{ emptyText: `Sin sentencias en ${dayjs().year()}` }}
                    renderItem={(r) => (
                      <List.Item
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setModal(null);
                          navigate(`/dashboard/jurisprudencia/${r.id}`);
                        }}
                      >
                        <List.Item.Meta
                          title={r.expedient || `Sentencia #${r.id}`}
                          description={r.specific_theme || '—'}
                        />
                        <Tag color="blue">{r.end_date ? dayjs(r.end_date).format('DD MMM') : '—'}</Tag>
                      </List.Item>
                    )}
                  />
                ),
              })
            }
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            label="Internas"
            value={t.interns}
            icon={<SafetyOutlined />}
            variant="slate"
            hint="Uso interno"
            onClick={() => navigate('/dashboard/jurisprudencia', { state: { filter: { is_intern: true } } })}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            label="Promedio anual"
            value={
              stats.by_year.length
                ? Math.round(
                    stats.by_year.reduce((a, b) => a + b.count, 0) /
                      stats.by_year.length,
                  )
                : 0
            }
            icon={<ClockCircleOutlined />}
            variant="emerald"
            hint={`En ${stats.by_year.length} año(s)`}
            onClick={() =>
              setModal({
                title: 'Sentencias por año',
                content: (
                  <List
                    size="small"
                    dataSource={[...stats.by_year].sort((a, b) => b.year - a.year)}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta title={String(item.year)} />
                        <Tag color="green">{item.count} sentencia{item.count !== 1 ? 's' : ''}</Tag>
                      </List.Item>
                    )}
                  />
                ),
              })
            }
          />
        </Col>
      </Row>

      {/* Charts row 1 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={16}>
          <div className="juris-panel">
            <div className="juris-panel-header">
              <div>
                <h3 className="juris-panel-title">
                  <RiseOutlined /> Sentencias por año
                </h3>
                <div className="juris-panel-subtitle">
                  Evolución del volumen jurisprudencial
                </div>
              </div>
            </div>
            <div className="juris-chart-frame juris-chart-frame--tall">
              {yearsBarData.length === 0 ? (
                <Empty description="Sin datos" />
              ) : (
                <ResponsiveBar
                  data={yearsBarData}
                  keys={['Sentencias']}
                  indexBy="year"
                  margin={{ top: 16, right: 24, bottom: 50, left: 50 }}
                  padding={0.35}
                  colors={[palette[0]]}
                  borderRadius={6}
                  enableLabel
                  labelTextColor="#ffffff"
                  labelSkipHeight={18}
                  axisBottom={{ legend: 'Año', legendPosition: 'middle', legendOffset: 38 }}
                  axisLeft={{ legend: 'Cantidad', legendPosition: 'middle', legendOffset: -40 }}
                  theme={nivoTheme}
                  defs={[
                    {
                      id: 'gradient-bar',
                      type: 'linearGradient',
                      colors: [
                        { offset: 0, color: palette[0] },
                        { offset: 100, color: palette[1] },
                      ],
                    },
                  ]}
                  fill={[{ match: '*', id: 'gradient-bar' }]}
                  animate
                  onClick={(bar) => void openYearModal(Number(bar.indexValue))}
                  role="button"
                  cursor="pointer"
                />
              )}
            </div>
          </div>
        </Col>

        <Col xs={24} lg={8}>
          <div className="juris-panel">
            <div className="juris-panel-header">
              <div>
                <h3 className="juris-panel-title">
                  <BookOutlined /> Tema general
                </h3>
                <div className="juris-panel-subtitle">Distribución temática · <span style={{ opacity: 0.75 }}>click en un segmento para ver sentencias</span></div>
              </div>
            </div>
            <div className="juris-chart-frame juris-chart-frame--tall">
              {themePieData.length === 0 ? (
                <Empty description="Sin datos" />
              ) : (
                <ResponsivePie
                  data={themePieData}
                  margin={{ top: 12, right: 12, bottom: 60, left: 12 }}
                  innerRadius={0.6}
                  padAngle={1.5}
                  cornerRadius={4}
                  activeOuterRadiusOffset={6}
                  colors={{ datum: 'data.color' }}
                  borderWidth={2}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
                  arcLinkLabelsSkipAngle={12}
                  arcLinkLabelsThickness={1.5}
                  arcLinkLabelsTextColor={isDark ? '#cdd0db' : '#475569'}
                  arcLabelsSkipAngle={14}
                  arcLabelsTextColor="#ffffff"
                  theme={nivoTheme}
                  onClick={(datum) => {
                    const d = datum.data as { dbId: number | null; label: string; value: number };
                    void openCategoryModal(`${d.label} — ${d.value} sentencia${d.value !== 1 ? 's' : ''}`, 'general_theme', d.dbId);
                  }}
                  tooltip={({ datum }) => (
                    <div style={{ background: isDark ? '#1d1f2b' : '#fff', border: `1px solid ${isDark ? '#2c2f40' : '#e5e7eb'}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, color: isDark ? '#ecedf2' : '#1f2640' }}>
                      <span style={{ color: datum.color, marginRight: 6 }}>■</span>
                      <strong>{datum.label}</strong>: {datum.value} ({themeTotal > 0 ? Math.round((datum.value / themeTotal) * 100) : 0}%)
                    </div>
                  )}
                  legends={[
                    {
                      anchor: 'bottom',
                      direction: 'row',
                      translateY: 50,
                      itemWidth: 90,
                      itemHeight: 16,
                      itemTextColor: isDark ? '#cdd0db' : '#475569',
                      symbolShape: 'circle',
                      symbolSize: 10,
                    },
                  ]}
                />
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Charts row 2 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <div className="juris-panel">
            <div className="juris-panel-header">
              <div>
                <h3 className="juris-panel-title">
                  <BankOutlined /> Tribunales con más actividad
                </h3>
                <div className="juris-panel-subtitle">Top 8 por cantidad · <span style={{ opacity: 0.75 }}>click en una barra para ver sentencias</span></div>
              </div>
            </div>
            <div className="juris-chart-frame juris-chart-frame--tall">
              {tribunalBarData.length === 0 ? (
                <Empty description="Sin datos" />
              ) : (
                <ResponsiveBar
                  data={tribunalBarData}
                  keys={['Sentencias']}
                  indexBy="tribunal"
                  layout="horizontal"
                  margin={{ top: 8, right: 24, bottom: 40, left: 200 }}
                  padding={0.3}
                  colors={[palette[2]]}
                  borderRadius={6}
                  enableLabel
                  labelTextColor="#ffffff"
                  axisBottom={{ legend: 'Cantidad', legendPosition: 'middle', legendOffset: 32 }}
                  theme={nivoTheme}
                  defs={[
                    {
                      id: 'gradient-tribunal',
                      type: 'linearGradient',
                      colors: [
                        { offset: 0, color: palette[2] },
                        { offset: 100, color: palette[1] },
                      ],
                    },
                  ]}
                  fill={[{ match: '*', id: 'gradient-tribunal' }]}
                  animate
                  onClick={(bar) => {
                    const dbId = (bar.data as { dbId: number | null }).dbId;
                    void openCategoryModal(
                      `${bar.indexValue} — ${bar.value} sentencia${Number(bar.value) !== 1 ? 's' : ''}`,
                      'tribunal',
                      dbId,
                    );
                  }}
                  role="button"
                  cursor="pointer"
                />
              )}
            </div>
          </div>
        </Col>

        <Col xs={24} lg={12}>
          <div className="juris-panel">
            <div className="juris-panel-header">
              <div>
                <h3 className="juris-panel-title">
                  <SafetyOutlined /> Sentido del fallo
                </h3>
                <div className="juris-panel-subtitle">Resultados de las sentencias · <span style={{ opacity: 0.75 }}>click en un segmento para ver sentencias</span></div>
              </div>
            </div>
            <div className="juris-chart-frame juris-chart-frame--tall">
              {sensePieData.length === 0 ? (
                <Empty description="Sin datos" />
              ) : (
                <ResponsivePie
                  data={sensePieData}
                  margin={{ top: 12, right: 12, bottom: 60, left: 12 }}
                  innerRadius={0.55}
                  padAngle={1.5}
                  cornerRadius={4}
                  activeOuterRadiusOffset={6}
                  colors={{ datum: 'data.color' }}
                  borderWidth={2}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
                  arcLinkLabelsSkipAngle={12}
                  arcLinkLabelsTextColor={isDark ? '#cdd0db' : '#475569'}
                  arcLabelsSkipAngle={14}
                  arcLabelsTextColor="#ffffff"
                  theme={nivoTheme}
                  onClick={(datum) => {
                    const d = datum.data as { dbId: number | null; label: string; value: number };
                    void openCategoryModal(`${d.label} — ${d.value} sentencia${d.value !== 1 ? 's' : ''}`, 'sense_of_failure', d.dbId);
                  }}
                  tooltip={({ datum }) => (
                    <div style={{ background: isDark ? '#1d1f2b' : '#fff', border: `1px solid ${isDark ? '#2c2f40' : '#e5e7eb'}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, color: isDark ? '#ecedf2' : '#1f2640' }}>
                      <span style={{ color: datum.color, marginRight: 6 }}>■</span>
                      <strong>{datum.label}</strong>: {datum.value} ({senseTotal > 0 ? Math.round((datum.value / senseTotal) * 100) : 0}%)
                    </div>
                  )}
                  legends={[
                    {
                      anchor: 'bottom',
                      direction: 'row',
                      translateY: 50,
                      itemWidth: 100,
                      itemHeight: 16,
                      itemTextColor: isDark ? '#cdd0db' : '#475569',
                      symbolShape: 'circle',
                      symbolSize: 10,
                    },
                  ]}
                />
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Charts row 3 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <div className="juris-panel">
            <div className="juris-panel-header">
              <div>
                <h3 className="juris-panel-title">
                  <SafetyOutlined /> Tipo de fallo
                </h3>
                <div className="juris-panel-subtitle">Top 10 por cantidad · <span style={{ opacity: 0.75 }}>click en una barra para ver sentencias</span></div>
              </div>
            </div>
            <div className="juris-chart-frame juris-chart-frame--tall">
              {failureTypeBarData.length === 0 ? (
                <Empty description="Sin datos" />
              ) : (
                <ResponsiveBar
                  data={failureTypeBarData}
                  keys={['Sentencias']}
                  indexBy="tipo"
                  layout="horizontal"
                  margin={{ top: 8, right: 50, bottom: 40, left: 200 }}
                  padding={0.3}
                  colors={[palette[3]]}
                  borderRadius={6}
                  enableLabel
                  labelTextColor="#ffffff"
                  labelSkipWidth={20}
                  axisBottom={{ legend: 'Cantidad', legendPosition: 'middle', legendOffset: 32 }}
                  theme={nivoTheme}
                  defs={[
                    {
                      id: 'gradient-failure',
                      type: 'linearGradient',
                      colors: [
                        { offset: 0, color: palette[3] },
                        { offset: 100, color: palette[4] },
                      ],
                    },
                  ]}
                  fill={[{ match: '*', id: 'gradient-failure' }]}
                  animate
                  onClick={(bar) => {
                    const dbId = (bar.data as { dbId: number | null }).dbId;
                    void openCategoryModal(
                      `${bar.indexValue} — ${bar.value} sentencia${Number(bar.value) !== 1 ? 's' : ''}`,
                      'failure_type',
                      dbId,
                    );
                  }}
                  role="button"
                  cursor="pointer"
                />
              )}
            </div>
          </div>
        </Col>

        <Col xs={24} lg={12}>
          <div className="juris-panel">
            <div className="juris-panel-header">
              <div>
                <h3 className="juris-panel-title">
                  <BookOutlined /> Estado de sentencias
                </h3>
                <div className="juris-panel-subtitle">Vigentes, derogadas y otros · <span style={{ opacity: 0.75 }}>click en un segmento para ver sentencias</span></div>
              </div>
            </div>
            <div className="juris-chart-frame juris-chart-frame--tall">
              {statePieData.length === 0 ? (
                <Empty description="Sin datos" />
              ) : (
                <ResponsivePie
                  data={statePieData}
                  margin={{ top: 12, right: 12, bottom: 60, left: 12 }}
                  innerRadius={0.55}
                  padAngle={1.5}
                  cornerRadius={4}
                  activeOuterRadiusOffset={6}
                  colors={{ datum: 'data.color' }}
                  borderWidth={2}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
                  arcLinkLabelsSkipAngle={12}
                  arcLinkLabelsTextColor={isDark ? '#cdd0db' : '#475569'}
                  arcLabelsSkipAngle={14}
                  arcLabelsTextColor="#ffffff"
                  theme={nivoTheme}
                  onClick={(datum) => {
                    const d = datum.data as { dbId: number | null; label: string; value: number };
                    void openCategoryModal(`${d.label} — ${d.value} sentencia${d.value !== 1 ? 's' : ''}`, 'state', d.dbId);
                  }}
                  tooltip={({ datum }) => (
                    <div style={{ background: isDark ? '#1d1f2b' : '#fff', border: `1px solid ${isDark ? '#2c2f40' : '#e5e7eb'}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, color: isDark ? '#ecedf2' : '#1f2640' }}>
                      <span style={{ color: datum.color, marginRight: 6 }}>■</span>
                      <strong>{datum.label}</strong>: {datum.value} ({stateTotal > 0 ? Math.round((datum.value / stateTotal) * 100) : 0}%)
                    </div>
                  )}
                  legends={[
                    {
                      anchor: 'bottom',
                      direction: 'row',
                      translateY: 50,
                      itemWidth: 110,
                      itemHeight: 16,
                      itemTextColor: isDark ? '#cdd0db' : '#475569',
                      symbolShape: 'circle',
                      symbolSize: 10,
                    },
                  ]}
                />
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Recent + top clients */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <div className="juris-panel">
            <div className="juris-panel-header">
              <div>
                <h3 className="juris-panel-title">
                  <ClockCircleOutlined /> Sentencias más recientes
                </h3>
                <div className="juris-panel-subtitle">Últimas registradas en el archivo</div>
              </div>
              <Button type="link" onClick={() => navigate('/dashboard/jurisprudencia')}>
                Ver todas →
              </Button>
            </div>
            {stats.recent.length === 0 ? (
              <Empty description="Sin sentencias" />
            ) : (
              <div className="juris-feed">
                {stats.recent.map((r) => (
                  <div
                    key={r.id}
                    className="juris-feed-item"
                    onClick={() => navigate(`/dashboard/jurisprudencia/${r.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(`/dashboard/jurisprudencia/${r.id}`);
                    }}
                  >
                    <span className="juris-feed-marker" />
                    <div className="juris-feed-body">
                      <div className="juris-feed-title">
                        {r.expedient || `Sentencia #${r.id}`} — {r.specific_theme || 'Sin tema'}
                      </div>
                      <div className="juris-feed-meta">
                        {[r.tribunal, r.sense_of_failure, r.end_date && dayjs(r.end_date).format('DD MMM YYYY')]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Col>

        <Col xs={24} lg={10}>
          <div className="juris-panel">
            <div className="juris-panel-header">
              <div>
                <h3 className="juris-panel-title">
                  <TeamOutlined /> Clientes más representados
                </h3>
                <div className="juris-panel-subtitle">Top por cantidad de sentencias</div>
              </div>
            </div>
            {stats.top_clients.length === 0 ? (
              <Empty description="Sin datos" />
            ) : (
              <div>
                {Array.from(
                  stats.top_clients
                    .reduce((map, c) => {
                      const key = c.name.trim().toLowerCase().slice(0, 45);
                      const existing = map.get(key);
                      if (existing) {
                        existing.count += c.count;
                      } else {
                        map.set(key, { name: c.name.trim(), count: c.count });
                      }
                      return map;
                    }, new Map<string, { name: string; count: number }>())
                    .values(),
                )
                  .sort((a, b) => b.count - a.count)
                  .map((c, i) => {
                  const max = stats.top_clients[0]?.count || 1;
                  const pct = (c.count / max) * 100;
                  return (
                    <div key={c.name} style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 13,
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 500,
                            color: isDark ? '#ecedf2' : '#1f2640',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 240,
                          }}
                        >
                          {c.name}
                        </span>
                        <span style={{ color: isDark ? '#a0a4b3' : '#64748b' }}>{c.count}</span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 4,
                          background: isDark ? '#2c2f40' : '#eef0f5',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, ${palette[i % palette.length]}, ${
                              palette[(i + 1) % palette.length]
                            })`,
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Col>
      </Row>

      <Modal
        title={modal?.title}
        open={Boolean(modal)}
        onCancel={() => setModal(null)}
        footer={null}
        width={560}
      >
        {modal?.content}
      </Modal>

      <Modal
        title={categoryModal?.title}
        open={Boolean(categoryModal)}
        onCancel={() => setCategoryModal(null)}
        footer={null}
        width={620}
      >
        {categoryModal?.loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div className="juris-loader-ring" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <List
            size="small"
            dataSource={categoryModal?.sentences ?? []}
            locale={{ emptyText: 'Sin sentencias para esta categoría' }}
            renderItem={(s) => (
              <List.Item
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setCategoryModal(null);
                  navigate(`/dashboard/jurisprudencia/${s.id}`);
                }}
              >
                <List.Item.Meta
                  title={s.expedient || `Sentencia #${s.id}`}
                  description={[s.specific_theme, s.tribunal?.name].filter(Boolean).join(' · ') || '—'}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {s.sense_of_failure?.name && <Tag color="blue">{s.sense_of_failure.name}</Tag>}
                  {s.end_date && (
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {dayjs(s.end_date).format('DD MMM YYYY')}
                    </span>
                  )}
                </div>
              </List.Item>
            )}
          />
        )}
      </Modal>

      <Modal
        title={yearModal ? `Sentencias del año ${yearModal.year} (${yearModal.sentences.length})` : ''}
        open={Boolean(yearModal)}
        onCancel={() => setYearModal(null)}
        footer={null}
        width={620}
      >
        {yearModal?.loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div className="juris-loader-ring" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <List
            size="small"
            dataSource={yearModal?.sentences ?? []}
            locale={{ emptyText: `Sin sentencias en ${yearModal?.year}` }}
            renderItem={(s) => (
              <List.Item
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setYearModal(null);
                  navigate(`/dashboard/jurisprudencia/${s.id}`);
                }}
              >
                <List.Item.Meta
                  title={s.expedient || `Sentencia #${s.id}`}
                  description={[s.specific_theme, s.tribunal?.name].filter(Boolean).join(' · ') || '—'}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {s.sense_of_failure?.name && <Tag color="blue">{s.sense_of_failure.name}</Tag>}
                  {s.end_date && <span style={{ fontSize: 11, color: '#94a3b8' }}>{dayjs(s.end_date).format('DD MMM YYYY')}</span>}
                </div>
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  );
};

export default JurisprudenceDashboardPage;
