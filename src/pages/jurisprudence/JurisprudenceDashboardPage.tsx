import React, { useEffect, useMemo, useState } from 'react';
import { Button, Col, Empty, Row, message } from 'antd';
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
import { fetchDashboardStats } from '../../api/jurisprudence';
import type { DashboardStats } from '../../types/jurisprudence.types';
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
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, variant, hint }) => (
  <div className={`juris-stat juris-stat--${variant} juris-fade-in`}>
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
        })),
    [stats?.by_tribunal],
  );

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
          { label: 'Tribunales activos', value: t.distinct_tribunals },
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
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            label="Archivos PDF"
            value={t.with_file}
            icon={<FilePdfOutlined />}
            variant="rose"
            hint={`${t.total > 0 ? Math.round((t.with_file / t.total) * 100) : 0}% del total`}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            label="Tribunales activos"
            value={t.distinct_tribunals}
            icon={<BankOutlined />}
            variant="cyan"
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            label="Clientes únicos"
            value={t.distinct_clients}
            icon={<TeamOutlined />}
            variant="emerald"
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            label="Últimos 30 días"
            value={t.last_30_days}
            icon={<ThunderboltOutlined />}
            variant="gold"
            hint="Actividad reciente"
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            label="Este año"
            value={t.this_year}
            icon={<RiseOutlined />}
            variant="indigo"
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            label="Internas"
            value={t.interns}
            icon={<SafetyOutlined />}
            variant="slate"
            hint="Uso interno"
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
                  enableLabel={false}
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
                <div className="juris-panel-subtitle">Distribución temática</div>
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
                <div className="juris-panel-subtitle">Top 8 por cantidad de sentencias</div>
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
                <div className="juris-panel-subtitle">Resultados de las sentencias</div>
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
                {stats.top_clients.map((c, i) => {
                  const max = stats.top_clients[0]?.count || 1;
                  const pct = (c.count / max) * 100;
                  return (
                    <div key={c.name + i} style={{ marginBottom: 14 }}>
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
    </div>
  );
};

export default JurisprudenceDashboardPage;
