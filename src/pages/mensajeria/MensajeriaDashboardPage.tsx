// src/pages/mensajeria/MensajeriaDashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Card, Select, DatePicker, Button, Row, Col, message } from 'antd';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import {
  getChartByMonth,
  getChartByZone,
  getChartByPriority,
  getChartByState,
  getChartByMensajero,
  getUsuarios,
  type ChartData,
} from '../../api/encargos';

const { RangePicker } = DatePicker;
const { Option } = Select;

// Colores para los gráficos
const COLORS = {
  pie: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'],
  priority: ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1'],
  state: ['#00d2d3', '#ff6b6b', '#feca57'],
  zone: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'],
};

const MensajeriaDashboardPage: React.FC = () => {
  const [mensajeros, setMensajeros] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
  const [filters, setFilters] = useState({
    startDate: null as string | null,
    endDate: null as string | null,
    mensajeroId: null as number | null,
  });

  const [chartMonth, setChartMonth] = useState<ChartData>({ labels: [], data: [] });
  const [chartZone, setChartZone] = useState<ChartData>({ labels: [], data: [] });
  const [chartPriority, setChartPriority] = useState<ChartData>({ labels: [], data: [] });
  const [chartState, setChartState] = useState<ChartData>({ labels: [], data: [] });
  const [chartMensajero, setChartMensajero] = useState<ChartData>({ labels: [], data: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMensajeros();
    loadCharts();
  }, []);

  const loadMensajeros = async () => {
    try {
      const res = await getUsuarios();
      const mensajerosData = res.data
        .filter(u => u.tipo_usuario === 8)
        .map(u => ({ id: u.id, first_name: u.first_name, last_name: u.last_name }));
      setMensajeros(mensajerosData);
    } catch {
      message.error('Error al cargar mensajeros');
    }
  };

  const loadCharts = async () => {
    setLoading(true);
    try {
      const params = {
        start: filters.startDate || undefined,
        end: filters.endDate || undefined,
      };

      const [monthRes, zoneRes, priorityRes, stateRes] = await Promise.all([
        getChartByMonth(params),
        getChartByZone(params),
        getChartByPriority(params),
        getChartByState(params),
      ]);

      setChartMonth(monthRes.data);
      setChartZone(zoneRes.data);
      setChartPriority(priorityRes.data);
      setChartState(stateRes.data);
    } catch (err) {
      console.error('Error al cargar gráficas:', err);
      message.error('Error al cargar gráficas');
    } finally {
      setLoading(false);
    }
  };

  const loadMensajeroChart = async () => {
    if (!filters.mensajeroId) {
      message.warning('Seleccione un mensajero');
      return;
    }
    try {
      const res = await getChartByMensajero({
        mensajero_id: filters.mensajeroId,
        start: filters.startDate || undefined,
        end: filters.endDate || undefined,
      });
      setChartMensajero(res.data);
    } catch {
      message.error('Error al cargar gráfica del mensajero');
    }
  };

  const handleDateChange = (dates: any) => {
    if (dates && dates.length === 2) {
      const start = dates[0]?.format('YYYY-MM-DD') || null;
      const end = dates[1]?.format('YYYY-MM-DD') || null;
      setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
    } else {
      setFilters(prev => ({ ...prev, startDate: null, endDate: null }));
    }
  };

  const handleReset = () => {
    setFilters({
      startDate: null,
      endDate: null,
      mensajeroId: null,
    });
    setChartMensajero({ labels: [], data: [] });
  };

  // Convertir datos para Nivo Pie
  const toPieData = (chartData: ChartData, colors: string[]) => {
    return chartData.labels.map((label, index) => ({
      id: label,
      label: label,
      value: chartData.data[index] || 0,
      color: colors[index % colors.length],
    }));
  };

  // Convertir datos para Nivo Bar
  const toBarData = (chartData: ChartData) => {
    return chartData.labels.map((label, index) => ({
      label: label,
      value: chartData.data[index] || 0,
    }));
  };

  const renderPieChart = (title: string, chartData: ChartData, colors: string[]) => {
    const pieData = toPieData(chartData, colors);
    const hasData = pieData.some(d => d.value > 0);

    return (
      <Card title={title} style={{ height: '100%' }} loading={loading}>
        <div style={{ height: 300 }}>
          {hasData ? (
            <ResponsivePie
              data={pieData}
              margin={{ top: 20, right: 80, bottom: 80, left: 80 }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              colors={{ datum: 'data.color' }}
              borderWidth={1}
              borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
              arcLinkLabelsSkipAngle={10}
              arcLinkLabelsTextColor="#333333"
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: 'color' }}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
              legends={[
                {
                  anchor: 'bottom',
                  direction: 'row',
                  justify: false,
                  translateX: 0,
                  translateY: 56,
                  itemsSpacing: 0,
                  itemWidth: 80,
                  itemHeight: 18,
                  itemTextColor: '#999',
                  itemDirection: 'left-to-right',
                  itemOpacity: 1,
                  symbolSize: 12,
                  symbolShape: 'circle',
                },
              ]}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
              Sin datos disponibles
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderBarChart = (title: string, chartData: ChartData, color: string) => {
    const barData = toBarData(chartData);
    const hasData = barData.some(d => d.value > 0);

    return (
      <Card title={title} style={{ height: '100%' }} loading={loading}>
        <div style={{ height: 300 }}>
          {hasData ? (
            <ResponsiveBar
              data={barData}
              keys={['value']}
              indexBy="label"
              margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={[color]}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              animate={true}
              motionConfig="gentle"
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
              Sin datos disponibles
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Dashboard de Mensajería</h2>

      {/* Filtros */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <RangePicker
            onChange={handleDateChange}
            style={{ width: '100%' }}
            placeholder={['Fecha inicio', 'Fecha fin']}
          />
        </Col>
        <Col span={4}>
          <Button onClick={loadCharts} type="primary" loading={loading}>
            Aplicar
          </Button>
        </Col>
        <Col span={4}>
          <Button onClick={handleReset}>Reset</Button>
        </Col>
      </Row>

      {/* Gráficas principales */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          {renderPieChart('Encargos por Prioridad', chartPriority, COLORS.priority)}
        </Col>
        <Col xs={24} lg={12}>
          {renderPieChart('Estado de Encargos', chartState, COLORS.state)}
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          {renderBarChart('Encargos por Mes', chartMonth, '#667eea')}
        </Col>
        <Col xs={24} lg={12}>
          {renderBarChart('Encargos por Zona', chartZone, '#764ba2')}
        </Col>
      </Row>

      {/* Sección de mensajero */}
      <h3 style={{ textAlign: 'center', margin: '32px 0 16px 0' }}>Estadísticas por Mensajero</h3>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Select
            placeholder="Seleccionar mensajero"
            value={filters.mensajeroId || undefined}
            onChange={(value) => setFilters(prev => ({ ...prev, mensajeroId: value }))}
            style={{ width: '100%' }}
            allowClear
          >
            {mensajeros.map(m => (
              <Option key={m.id} value={m.id}>
                {m.first_name} {m.last_name}
              </Option>
            ))}
          </Select>
        </Col>
        <Col span={4}>
          <Button onClick={loadMensajeroChart} type="primary">
            Cargar
          </Button>
        </Col>
      </Row>

      {filters.mensajeroId && chartMensajero.labels.length > 0 && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            {renderBarChart('Encargos del Mensajero por Mes', chartMensajero, '#f5576c')}
          </Col>
          <Col xs={24} lg={12}>
            {renderPieChart('Distribución del Mensajero', chartMensajero, COLORS.pie)}
          </Col>
        </Row>
      )}

      {filters.mensajeroId && chartMensajero.labels.length === 0 && (
        <p style={{ textAlign: 'center', color: '#999' }}>
          No hay datos para el mensajero seleccionado en el rango de fechas.
        </p>
      )}
    </div>
  );
};

export default MensajeriaDashboardPage;
