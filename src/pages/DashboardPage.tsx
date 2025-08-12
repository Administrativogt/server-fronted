import { Card, Col, Row, Typography } from 'antd';
import { Bar } from '@ant-design/charts';

const { Title } = Typography;

function DashboardPage() {
  // Datos quemados para tarjetas
  const resumen = [
    { title: 'Encargos totales', value: 124 },
    { title: 'Pendientes', value: 18 },
    { title: 'Completados', value: 92 },
    { title: 'Cancelados', value: 14 },
  ];

  // Datos quemados para gráfica
  const data = [
    { usuario: 'BAR001', encargos: 25 },
    { usuario: 'BAR002', encargos: 18 },
    { usuario: 'BAR003', encargos: 32 },
    { usuario: 'BAR004', encargos: 11 },
    { usuario: 'BAR005', encargos: 22 },
  ];

  const config = {
    data,
    xField: 'encargos',
    yField: 'usuario',
    seriesField: 'usuario',
    legend: false,
    barWidthRatio: 0.5,
    colorField: 'usuario',
    height: 300,
    xAxis: {
      title: { text: 'Cantidad de encargos' },
    },
    yAxis: {
      title: { text: 'Usuarios' },
    },
  };

  return (
    <div>
      <Title level={2}>Encargos por usuario</Title>

      {/* Tarjetas de resumen */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {resumen.map((item, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card>
              <Title level={4}>{item.title}</Title>
              <Title level={2} style={{ color: '#1677ff' }}>{item.value}</Title>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Gráfico de barras */}
      <Card title="Distribución de encargos por usuario">
        <Bar {...config} />
      </Card>
    </div>
  );
}

export default DashboardPage;
