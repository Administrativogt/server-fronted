import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Row,
  Select,
  Spin,
  Typography,
  Upload,
  message,
} from 'antd';
import { BarChartOutlined, UploadOutlined } from '@ant-design/icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import dayjs, { Dayjs } from 'dayjs';
import { getTeams } from '../../api/teams';
import { getClients, getUsers } from '../../api/procuration';
import type { Client, User } from '../../types/procuration.types';
import type { Team } from '../../api/teams';
import {
  getMonthChart,
  getTeamChart,
  getPriorityChart,
  getPerApplicantChart,
  getPerProcuratorChart,
  getPriorityPerApplicantChart,
  getPriorityPerProcuratorChart,
  getTimeChart,
  getIndividualPriorityChart,
  getIndividualPriorityApplicantChart,
  getClientChart,
  getProductivityChart,
  uploadClientsCSV,
} from '../../api/procurationCharts';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

const { Title: AntTitle } = Typography;
const { RangePicker } = DatePicker;

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const PRIORITY_LABELS: Record<number, string> = { 1: 'A', 2: 'B', 3: 'C' };
const PRIORITY_COLORS = ['#ff4d4f', '#fa8c16', '#52c41a'];

const BAR_OPTS = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};

const STACKED_OPTS = {
  responsive: true,
  plugins: { legend: { display: true } },
  scales: {
    x: { stacked: true },
    y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
  },
};

function buildBarData(
  labels: string[],
  values: number[],
  color = 'rgba(22, 119, 255, 0.7)',
  borderColor = '#1677ff',
) {
  return {
    labels,
    datasets: [{ label: '', data: values, backgroundColor: color, borderColor, borderWidth: 2 }],
  };
}

const ChartCard: React.FC<{
  title: string;
  loading: boolean;
  children: React.ReactNode;
  extra?: React.ReactNode;
}> = ({ title, loading, children, extra }) => (
  <Card title={title} extra={extra} style={{ height: '100%' }}>
    {loading ? (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin />
      </div>
    ) : (
      children
    )}
  </Card>
);

// ─── Main component ───────────────────────────────────────────────────────────
const ProcurationChartsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [procurators, setProcurators] = useState<User[]>([]);
  const [uploading, setUploading] = useState(false);

  // ── Section 1: General filters ────────────────────────────────────────────
  const [generalTeam, setGeneralTeam] = useState<number | undefined>();
  const [generalDates, setGeneralDates] = useState<[Dayjs, Dayjs] | null>(null);

  // "Ver más / Ver menos" — solicitantes
  const [viewAllApplicants, setViewAllApplicants] = useState(false);

  // Procurador filter for time chart (populated from priority team)
  const [timeFilterProcurator, setTimeFilterProcurator] = useState<number | undefined>();

  // ── Section 2: Priority filters ───────────────────────────────────────────
  const [priorityTeam, setPriorityTeam] = useState<number | undefined>();
  const [priorityDates, setPriorityDates] = useState<[Dayjs, Dayjs] | null>(null);
  // Priority filter A/B/C — shared by per_applicant & per_procurator charts
  const [priorityFilter, setPriorityFilter] = useState<number>(1);

  // ── Section 3: Client filters ─────────────────────────────────────────────
  const [clientId, setClientId] = useState<number | undefined>();
  const [clientTeam, setClientTeam] = useState<number | undefined>();
  const [clientDates, setClientDates] = useState<[Dayjs, Dayjs] | null>(null);

  // ── Chart data ────────────────────────────────────────────────────────────
  const [monthData, setMonthData] = useState<any>(null);
  const [teamData, setTeamData] = useState<any>(null);
  const [applicantData, setApplicantData] = useState<any>(null);
  const [procuratorData, setProcuratorData] = useState<any>(null);
  const [indivProcuratorData, setIndivProcuratorData] = useState<any>(null);
  const [indivApplicantData, setIndivApplicantData] = useState<any>(null);
  const [timeData, setTimeData] = useState<any>(null);

  const [priorityData, setPriorityData] = useState<any>(null);
  const [priorityApplicantData, setPriorityApplicantData] = useState<any>(null);
  const [priorityProcuratorData, setPriorityProcuratorData] = useState<any>(null);

  const [clientChartData, setClientChartData] = useState<any>(null);
  const [productivityData, setProductivityData] = useState<any>(null);

  const [loadingG, setLoadingG] = useState(false);
  const [loadingP, setLoadingP] = useState(false);
  const [loadingTime, setLoadingTime] = useState(false);
  const [loadingC, setLoadingC] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmtDate = (d: Dayjs | null) => d?.format('YYYY-MM-DD');

  const generalParams = useCallback(
    () => ({
      team: generalTeam,
      init_date: fmtDate(generalDates?.[0] ?? null) ?? undefined,
      end_date: fmtDate(generalDates?.[1] ?? null) ?? undefined,
    }),
    [generalTeam, generalDates],
  );

  const priorityParams = useCallback(
    () => ({
      team: priorityTeam,
      init_date: fmtDate(priorityDates?.[0] ?? null) ?? undefined,
      end_date: fmtDate(priorityDates?.[1] ?? null) ?? undefined,
    }),
    [priorityTeam, priorityDates],
  );

  // ── Static data ───────────────────────────────────────────────────────────
  useEffect(() => {
    getTeams().then(setTeams).catch(() => {});
    getClients()
      .then((r) => setClients((r as any).data ?? r))
      .catch(() => {});
    getUsers()
      .then((users) =>
        setProcurators(users.filter((u: User) => u.tipo_usuario === 5 && (u as any).estado === 1)),
      )
      .catch(() => {});
  }, []);

  // When priority team changes, filter procurators for the time chart
  useEffect(() => {
    if (priorityTeam) {
      const filtered = procurators.filter(
        (u) => u.equipo && (u.equipo as any).id === priorityTeam,
      );
      setProcurators(filtered.length ? filtered : procurators);
    }
    setTimeFilterProcurator(undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorityTeam]);

  // ── Section 1: General ────────────────────────────────────────────────────
  const loadApplicants = useCallback(
    async (all = false) => {
      const params = generalParams();
      const applicant = await getPerApplicantChart({ ...params, view_all: all });
      setApplicantData(
        buildBarData(
          applicant.map((a: any) => a.name),
          applicant.map((a: any) => a.total),
          'rgba(128,128,128,0.6)',
          'rgb(128,128,128)',
        ),
      );
    },
    [generalParams],
  );

  const loadGeneral = useCallback(async () => {
    setLoadingG(true);
    try {
      const params = generalParams();
      const [month, team, applicant, procurator, indivProc, indivApp] = await Promise.all([
        getMonthChart(params),
        getTeamChart({ init_date: params.init_date, end_date: params.end_date }),
        getPerApplicantChart({ ...params, view_all: viewAllApplicants }),
        getPerProcuratorChart(params),
        getIndividualPriorityChart(params),
        getIndividualPriorityApplicantChart(params),
      ]);

      setMonthData(
        buildBarData(
          month.map((m: any) => MONTH_NAMES[m.month - 1]),
          month.map((m: any) => m.total),
          'rgba(22,119,255,0.7)',
          '#1677ff',
        ),
      );

      setTeamData(
        buildBarData(
          team.map((t: any) => t.user),
          team.map((t: any) => t.total),
          'rgba(0,191,255,0.6)',
          'rgb(0,191,255)',
        ),
      );

      setApplicantData(
        buildBarData(
          applicant.map((a: any) => a.name),
          applicant.map((a: any) => a.total),
          'rgba(128,128,128,0.6)',
          'rgb(128,128,128)',
        ),
      );

      setProcuratorData(
        buildBarData(
          procurator.map((p: any) => p.name),
          procurator.map((p: any) => p.total),
          'rgba(220,20,60,0.5)',
          'rgb(220,20,60)',
        ),
      );

      setIndivProcuratorData({
        labels: indivProc.map((r: any) => r.user),
        datasets: [
          { label: 'A', data: indivProc.map((r: any) => r.a), backgroundColor: PRIORITY_COLORS[0] },
          { label: 'B', data: indivProc.map((r: any) => r.b), backgroundColor: PRIORITY_COLORS[1] },
          { label: 'C', data: indivProc.map((r: any) => r.c), backgroundColor: PRIORITY_COLORS[2] },
        ],
      });

      setIndivApplicantData({
        labels: indivApp.map((r: any) => r.user),
        datasets: [
          { label: 'A', data: indivApp.map((r: any) => r.a), backgroundColor: PRIORITY_COLORS[0] },
          { label: 'B', data: indivApp.map((r: any) => r.b), backgroundColor: PRIORITY_COLORS[1] },
          { label: 'C', data: indivApp.map((r: any) => r.c), backgroundColor: PRIORITY_COLORS[2] },
        ],
      });
    } catch {
      message.error('Error al cargar gráficas generales');
    } finally {
      setLoadingG(false);
    }
  }, [generalParams, viewAllApplicants]);

  // Time chart — separate load so procurator filter rerenders independently
  const loadTimeChart = useCallback(async () => {
    setLoadingTime(true);
    try {
      const time = await getTimeChart({ team: timeFilterProcurator });
      if (time.length > 0) {
        const t = time[0];
        setTimeData({
          labels: [''],
          datasets: [
            {
              label: 'A tiempo',
              data: [t.on_time],
              backgroundColor: 'rgba(0,204,0,0.2)',
              borderColor: 'rgba(0,204,0,1)',
              borderWidth: 1,
            },
            {
              label: 'Fuera de tiempo',
              data: [t.off_time],
              backgroundColor: 'rgba(54,162,235,0.2)',
              borderColor: 'rgba(54,162,235,1)',
              borderWidth: 1,
            },
          ],
        });
      }
    } catch {
      message.error('Error al cargar gráfica de tiempo');
    } finally {
      setLoadingTime(false);
    }
  }, [timeFilterProcurator]);

  // ── Section 2: Priority ───────────────────────────────────────────────────
  const loadPriorityCharts = useCallback(async () => {
    const params = { ...priorityParams(), priority: priorityFilter };
    const [prioApp, prioProc] = await Promise.all([
      getPriorityPerApplicantChart(params),
      getPriorityPerProcuratorChart(params),
    ]);

    setPriorityApplicantData(
      buildBarData(
        prioApp.map((a: any) => a.name.split(' ')[0]),
        prioApp.map((a: any) => a.total),
        'rgba(0,0,255,0.5)',
        'rgb(0,0,255)',
      ),
    );

    setPriorityProcuratorData(
      buildBarData(
        prioProc.map((p: any) => p.name.split(' ')[0]),
        prioProc.map((p: any) => p.total),
        'rgba(220,20,60,0.5)',
        'rgb(220,20,60)',
      ),
    );
  }, [priorityParams, priorityFilter]);

  const loadPriority = useCallback(async () => {
    setLoadingP(true);
    try {
      const params = priorityParams();
      const priority = await getPriorityChart(params);

      setPriorityData({
        labels: priority.map((p: any) => PRIORITY_LABELS[p.priority] ?? p.priority),
        datasets: [
          {
            data: priority.map((p: any) => p.total),
            backgroundColor: PRIORITY_COLORS.map((c) => c + 'b3'),
            borderColor: PRIORITY_COLORS,
            borderWidth: 2,
          },
        ],
      });

      await loadPriorityCharts();

      // Populate procurators for time chart when team is selected
      if (priorityTeam) {
        getUsers()
          .then((users) => {
            const filtered = users.filter(
              (u: User) =>
                u.tipo_usuario === 5 &&
                (u as any).estado === 1 &&
                u.equipo &&
                (u.equipo as any).id === priorityTeam,
            );
            setProcurators(filtered);
          })
          .catch(() => {});
      }

      await loadTimeChart();
    } catch {
      message.error('Error al cargar gráficas de prioridad');
    } finally {
      setLoadingP(false);
    }
  }, [priorityParams, loadPriorityCharts, loadTimeChart, priorityTeam]);

  // ── Section 3: Client ─────────────────────────────────────────────────────
  const loadClient = useCallback(async () => {
    setLoadingC(true);
    try {
      const params = {
        client: clientId,
        team: clientTeam,
        init_date: fmtDate(clientDates?.[0] ?? null) ?? undefined,
        end_date: fmtDate(clientDates?.[1] ?? null) ?? undefined,
      };

      const [clientChart, productivity] = await Promise.all([
        getClientChart(params),
        getProductivityChart(),
      ]);

      setClientChartData(
        buildBarData(
          clientChart.map((c: any) => c.name),
          clientChart.map((c: any) => c.total),
          'rgba(19,194,194,0.6)',
          '#13c2c2',
        ),
      );

      setProductivityData(
        buildBarData(
          productivity.map((p: any) => p.name),
          productivity.map((p: any) => p.percentage),
          'rgba(250,173,20,0.6)',
          '#faad14',
        ),
      );
    } catch {
      message.error('Error al cargar gráficas de clientes');
    } finally {
      setLoadingC(false);
    }
  }, [clientId, clientTeam, clientDates]);

  // Initial load
  useEffect(() => { loadGeneral(); }, [loadGeneral]);
  useEffect(() => { loadPriority(); }, [loadPriority]);
  useEffect(() => { loadClient(); }, [loadClient]);
  useEffect(() => { loadTimeChart(); }, [loadTimeChart]);

  // Reload priority sub-charts when priority filter (A/B/C) changes
  useEffect(() => { loadPriorityCharts(); }, [loadPriorityCharts]);

  // ── "Ver más / Ver menos" handler ─────────────────────────────────────────
  const handleToggleAllApplicants = async () => {
    const next = !viewAllApplicants;
    setViewAllApplicants(next);
    setLoadingG(true);
    try {
      await loadApplicants(next);
    } finally {
      setLoadingG(false);
    }
  };

  // ── CSV Upload ────────────────────────────────────────────────────────────
  const handleUploadCSV = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadClientsCSV(file);
      if (result.repeated > 0) {
        message.warning(`${result.repeated} registros no se guardaron porque ya existen`);
      } else {
        message.success('Clientes importados con éxito');
      }
    } catch {
      message.error('Error al importar el archivo CSV');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const timeBarOpts = {
    responsive: true,
    plugins: { legend: { display: true } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <AntTitle level={4} style={{ margin: 0 }}>
            <BarChartOutlined style={{ marginRight: 8 }} />
            Gráficas de Procuración
          </AntTitle>
        </Col>
        <Col>
          <Upload accept=".csv" showUploadList={false} beforeUpload={handleUploadCSV}>
            <Button icon={<UploadOutlined />} loading={uploading}>
              Importar clientes CSV
            </Button>
          </Upload>
        </Col>
      </Row>

      {/* ══ SECCIÓN 1: GENERAL ══════════════════════════════════════════════ */}
      <Divider orientation="left">Detalle requerimientos (General)</Divider>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Select
            placeholder="Equipo"
            allowClear
            style={{ width: '100%' }}
            value={generalTeam}
            onChange={(v) => setGeneralTeam(v)}
            options={teams.map((t) => ({ value: t.id, label: t.name }))}
          />
        </Col>
        <Col xs={24} md={10}>
          <RangePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            value={generalDates as any}
            onChange={(v) => setGeneralDates(v as [Dayjs, Dayjs] | null)}
          />
        </Col>
        <Col xs={24} md={6}>
          <Button type="primary" onClick={loadGeneral} block>
            Filtrar
          </Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <ChartCard title="Requerimientos últimos 6 meses (general)" loading={loadingG}>
            {monthData && <Bar data={monthData} options={BAR_OPTS} />}
          </ChartCard>
        </Col>

        <Col xs={24} md={12}>
          <ChartCard title="Desglose requerimientos por equipo" loading={loadingG}>
            {teamData && <Bar data={teamData} options={BAR_OPTS} />}
          </ChartCard>
        </Col>

        {/* Solicitantes — con "Ver más / Ver menos" */}
        <Col xs={24} md={viewAllApplicants ? 24 : 12}>
          <ChartCard
            title={`Desglose requerimientos por solicitantes${viewAllApplicants ? '' : ' (top 10)'}`}
            loading={loadingG}
            extra={
              <Button size="small" type="link" onClick={handleToggleAllApplicants}>
                {viewAllApplicants ? 'Ver menos' : 'Ver más'}
              </Button>
            }
          >
            {applicantData && <Bar data={applicantData} options={BAR_OPTS} />}
          </ChartCard>
        </Col>

        <Col xs={24} md={12}>
          <ChartCard title="Desglose requerimientos por procuradores" loading={loadingG}>
            {procuratorData && <Bar data={procuratorData} options={BAR_OPTS} />}
          </ChartCard>
        </Col>

        <Col xs={24} md={12}>
          <ChartCard title="Requerimientos por prioridad (procurador)" loading={loadingG}>
            {indivProcuratorData && <Bar data={indivProcuratorData} options={STACKED_OPTS} />}
          </ChartCard>
        </Col>

        <Col xs={24} md={12}>
          <ChartCard title="Requerimientos por prioridad (solicitante)" loading={loadingG}>
            {indivApplicantData && <Bar data={indivApplicantData} options={STACKED_OPTS} />}
          </ChartCard>
        </Col>

        {/* Tiempo de entrega — con select de procurador */}
        <Col xs={24} md={12}>
          <ChartCard
            title="Procuración por tiempo de entrega"
            loading={loadingTime}
            extra={
              <Select
                placeholder="Procurador"
                allowClear
                style={{ width: 160 }}
                size="small"
                value={timeFilterProcurator}
                onChange={(v) => setTimeFilterProcurator(v)}
                options={procurators.map((u) => ({
                  value: u.id,
                  label: u.first_name,
                }))}
              />
            }
          >
            {timeData && <Bar data={timeData} options={timeBarOpts} />}
          </ChartCard>
        </Col>
      </Row>

      {/* ══ SECCIÓN 2: POR PRIORIDAD ════════════════════════════════════════ */}
      <Divider orientation="left" style={{ marginTop: 32 }}>
        Detalle requerimientos por prioridad
      </Divider>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}>
          <Select
            placeholder="Equipo"
            allowClear
            style={{ width: '100%' }}
            value={priorityTeam}
            onChange={(v) => setPriorityTeam(v)}
            options={teams.map((t) => ({ value: t.id, label: t.name }))}
          />
        </Col>
        <Col xs={24} md={9}>
          <RangePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            value={priorityDates as any}
            onChange={(v) => setPriorityDates(v as [Dayjs, Dayjs] | null)}
          />
        </Col>
        {/* Prioridad A/B/C — afecta per_applicant y per_procurator */}
        <Col xs={24} md={4}>
          <Select
            style={{ width: '100%' }}
            value={priorityFilter}
            onChange={(v) => setPriorityFilter(v)}
            options={[
              { value: 1, label: 'Prioridad A' },
              { value: 2, label: 'Prioridad B' },
              { value: 3, label: 'Prioridad C' },
            ]}
          />
        </Col>
        <Col xs={24} md={5}>
          <Button type="primary" onClick={loadPriority} block>
            Filtrar
          </Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <ChartCard title="Requerimientos por prioridad (general)" loading={loadingP}>
            {priorityData && <Pie data={priorityData} />}
          </ChartCard>
        </Col>

        <Col xs={24} md={8}>
          <ChartCard title="Requerimientos por prioridad (solicitantes)" loading={loadingP}>
            {priorityApplicantData && <Bar data={priorityApplicantData} options={BAR_OPTS} />}
          </ChartCard>
        </Col>

        <Col xs={24} md={8}>
          <ChartCard title="Requerimientos por prioridad (procuradores)" loading={loadingP}>
            {priorityProcuratorData && <Bar data={priorityProcuratorData} options={BAR_OPTS} />}
          </ChartCard>
        </Col>
      </Row>

      {/* ══ SECCIÓN 3: POR CLIENTE ══════════════════════════════════════════ */}
      <Divider orientation="left" style={{ marginTop: 32 }}>
        Detalle requerimientos por cliente
      </Divider>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={7}>
          <Select
            placeholder="Cliente"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
            value={clientId}
            onChange={(v) => setClientId(v)}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Col>
        <Col xs={24} md={5}>
          <Select
            placeholder="Equipo"
            allowClear
            style={{ width: '100%' }}
            value={clientTeam}
            onChange={(v) => setClientTeam(v)}
            options={teams.map((t) => ({ value: t.id, label: t.name }))}
          />
        </Col>
        <Col xs={24} md={8}>
          <RangePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            value={clientDates as any}
            onChange={(v) => setClientDates(v as [Dayjs, Dayjs] | null)}
          />
        </Col>
        <Col xs={24} md={4}>
          <Button type="primary" onClick={loadClient} block>
            Filtrar
          </Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <ChartCard title="Procuradores por cliente" loading={loadingC}>
            {clientChartData && <Bar data={clientChartData} options={BAR_OPTS} />}
          </ChartCard>
        </Col>
        <Col xs={24} md={12}>
          <ChartCard title="Desglose requerimientos por productividad" loading={loadingC}>
            {productivityData && (
              <Bar
                data={productivityData}
                options={{
                  ...BAR_OPTS,
                  plugins: {
                    ...BAR_OPTS.plugins,
                    tooltip: { callbacks: { label: (ctx: any) => `${ctx.raw}%` } },
                  },
                }}
              />
            )}
          </ChartCard>
        </Col>
      </Row>
    </div>
  );
};

export default ProcurationChartsPage;
