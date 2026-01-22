import React, { useEffect, useState } from 'react';
import { Card, Table, Typography, Spin, Tag, Statistic, Row, Col, Button } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { cargabilityApi } from '../../api/cargability';
import type { CargabilityReport } from '../../types/cargability.types';

const { Title, Text } = Typography;

const CargabilityReportView: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<CargabilityReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;

    const fetchReport = async () => {
      setLoading(true);
      try {
        const { data } = await cargabilityApi.getReport(username);
        setReport(data);
      } catch (error) {
        console.error('Error al obtener reporte:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [username]);

  const convertToHour = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!report) {
    return <div>No se encontró el reporte</div>;
  }

  const columns = [
    {
      title: 'Tipo de hora',
      dataIndex: 'type',
      key: 'type',
      fixed: 'left' as const,
      width: 150,
    },
    ...report.months.map(month => ({
      title: `Mes ${month}`,
      dataIndex: month,
      key: month,
      width: 100,
    })),
    ...report.weeks.map(week => ({
      title: `Semana ${week}`,
      dataIndex: `week_${week}`,
      key: `week_${week}`,
      width: 100,
    })),
    {
      title: 'Total Semestre',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      fixed: 'right' as const,
    },
  ];

  const dataSource = [
    {
      key: 'billable',
      type: 'Horas Facturables',
      ...report.months.reduce((acc, month, idx) => ({
        ...acc,
        [month]: convertToHour(report.billableHoursPerMonth[idx]?.total || 0),
      }), {}),
      ...report.weeks.reduce((acc, week, idx) => ({
        ...acc,
        [`week_${week}`]: convertToHour(report.billableHoursPerWeek[idx]?.total || 0),
      }), {}),
      total: convertToHour(report.totalsByLine.billableHours),
    },
    {
      key: 'non_billable',
      type: 'Cobrables que no se cobran',
      ...report.months.reduce((acc, month, idx) => ({
        ...acc,
        [month]: convertToHour(report.nonBillableHours.non_billable_hours[idx]?.total || 0),
      }), {}),
      ...report.weeks.reduce((acc, week, idx) => ({
        ...acc,
        [`week_${week}`]: convertToHour(report.nonBillableHoursPerWeek.non_billable_hours[idx]?.total || 0),
      }), {}),
      total: convertToHour(report.totalsByLine.nonBillableHours),
    },
    {
      key: 'consortium',
      type: 'Horas Consortium',
      ...report.months.reduce((acc, month, idx) => ({
        ...acc,
        [month]: convertToHour(report.nonBillableHours.consortium_hours[idx]?.total || 0),
      }), {}),
      ...report.weeks.reduce((acc, week, idx) => ({
        ...acc,
        [`week_${week}`]: convertToHour(report.nonBillableHoursPerWeek.consortium_hours[idx]?.total || 0),
      }), {}),
      total: convertToHour(report.totalsByLine.consortiumHours),
    },
    {
      key: 'total',
      type: 'Totales',
      ...report.totalHoursPerMonth.reduce((acc, monthData) => ({
        ...acc,
        [monthData.month]: convertToHour(monthData.total),
      }), {}),
      ...Object.entries(report.totalHoursPerWeek).reduce((acc, [week, minutes]) => ({
        ...acc,
        [`week_${week}`]: convertToHour(minutes),
      }), {}),
      total: convertToHour(report.semesterTotal),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/dashboard/cargability/users')}
        style={{ marginBottom: 16 }}
      >
        Volver
      </Button>

      <Title level={2}>Reporte de Cargabilidad - {report.username.toUpperCase()}</Title>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="Total Semestre"
              value={convertToHour(report.semesterTotal)}
              suffix="hrs"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Horas Facturables"
              value={convertToHour(report.totalsByLine.billableHours)}
              suffix="hrs"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Horas No Facturables"
              value={convertToHour(report.totalNonBillableHours)}
              suffix="hrs"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
        </Row>

        <div style={{ marginTop: 16 }}>
          <Text strong>Usuario: </Text>
          <Tag color="blue">{report.user.first_name} {report.user.last_name}</Tag>
          <Text strong style={{ marginLeft: 16 }}>Email: </Text>
          <Text>{report.user.email}</Text>
          <Text strong style={{ marginLeft: 16 }}>Tipo: </Text>
          <Tag>{report.user.tipo_usuario}</Tag>
        </div>
      </Card>

      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        scroll={{ x: 1300 }}
        bordered
      />
    </div>
  );
};

export default CargabilityReportView;