// src/pages/documents/DocumentFilters.tsx
import React, { useEffect, useState } from 'react';
import { Table, Form,  Select, DatePicker, Button, Row, Col, Tag, Space, message } from 'antd';
import api from '../../api/axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const DocumentFilters: React.FC = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterValues, setFilterValues] = useState<any>({});

  const fetchFilters = async () => {
    try {
      const res = await api.get('/documents/meta/filter-values');
      setFilterValues(res.data);
    } catch {
      message.error('Error cargando valores de filtro');
    }
  };

  const fetchFilteredDocs = async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.get('/documents/filter', { params });
      setData(res.data);
    } catch {
      message.error('Error cargando documentos entregados');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = (values: any) => {
    const params: any = { ...values };

    if (values.range) {
      if (values.range[0]) params.receptionDate = values.range[0].format('YYYY-MM-DD');
      if (values.range[1]) params.deliveryDate = values.range[1].format('YYYY-MM-DD');
    }

    delete params.range;
    fetchFilteredDocs(params);
  };

  useEffect(() => {
    fetchFilters();
    fetchFilteredDocs();
  }, []);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: 'Entregado por',
      dataIndex: 'documentDeliverBy',
    },
    {
      title: 'Tipo',
      dataIndex: 'documentType',
      render: (val: string) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: 'Cantidad',
      dataIndex: 'amount',
    },
    {
      title: 'Dirigido a',
      dataIndex: 'submitTo',
    },
    {
      title: 'Receptor',
      dataIndex: ['receivedBy'],
      render: (val: any) => val ? `${val.first_name} ${val.last_name}` : '',
    },
    {
      title: 'Entregado a',
      dataIndex: 'deliverTo',
    },
    {
      title: 'Fecha entrega',
      dataIndex: 'deliverDatetime',
      render: (val: string) =>
        val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '',
    },
    {
      title: 'Estado',
      dataIndex: 'state',
      render: (val: number) => {
        if (val === 2) return <Tag color="orange">Entregado</Tag>;
        if (val === 4) return <Tag color="green">Finalizado</Tag>;
        if (val === 5) return <Tag color="red">Rechazado</Tag>;
        return <Tag>{val}</Tag>;
      },
    },
  ];

  return (
    <>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="Rango de fechas" name="range">
              <RangePicker format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Tipo" name="documentType">
              <Select allowClear>
                {filterValues?.documentTypes?.map((d: string) => (
                  <Option key={d} value={d}>{d}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Entregado por" name="documentDeliverBy">
              <Select allowClear showSearch>
                {filterValues?.documentDelivers?.map((d: string) => (
                  <Option key={d} value={d}>{d}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Dirigido a" name="submitTo">
              <Select allowClear showSearch>
                {filterValues?.submitTo?.map((s: string) => (
                  <Option key={s} value={s}>{s}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row justify="end">
          <Col>
            <Space>
              <Button type="primary" htmlType="submit">Buscar</Button>
              <Button onClick={() => {
                form.resetFields();
                fetchFilteredDocs();
              }}>Resetear</Button>
            </Space>
          </Col>
        </Row>
      </Form>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        style={{ marginTop: 24 }}
        pagination={{ pageSize: 10 }}
      />
    </>
  );
};

export default DocumentFilters;