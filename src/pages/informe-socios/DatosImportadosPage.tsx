import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Tabs, Input, Tag, Typography, message, Button } from 'antd';
import {
  FileSearchOutlined, UsergroupAddOutlined, UserOutlined, ReloadOutlined, SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { informeSociosApi } from '../../api/informe-socios';
import type {
  InformeCasoRow, InformeClienteRow, InformeSocio,
} from '../../types/informe-socios.types';

const { Title, Paragraph } = Typography;

const fmtFecha = (v?: string) =>
  v ? v.slice(0, 10).split('-').reverse().join('/') : '-';

const matches = (search: string, ...fields: (string | number | undefined)[]) =>
  fields.some((f) =>
    String(f ?? '').toLowerCase().includes(search.toLowerCase()),
  );

const DatosImportadosPage: React.FC = () => {
  const [casos, setCasos] = useState<InformeCasoRow[]>([]);
  const [clientes, setClientes] = useState<InformeClienteRow[]>([]);
  const [socios, setSocios] = useState<InformeSocio[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, cl, s] = await Promise.all([
        informeSociosApi.getCasos(),
        informeSociosApi.getClientes(),
        informeSociosApi.getSocios(),
      ]);
      setCasos(c.data);
      setClientes(cl.data);
      setSocios(s.data);
    } catch {
      message.error('Error al cargar los datos importados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const casosFiltrados = useMemo(
    () =>
      search
        ? casos.filter((c) =>
            matches(search, c.directorio, c.nombre, c.caso, c.descripcion,
              c.encargado, c.coordinador, c.equipo, c.area),
          )
        : casos,
    [casos, search],
  );

  const clientesFiltrados = useMemo(
    () =>
      search
        ? clientes.filter((c) =>
            matches(search, c.cliente, c.razon_social,
              c.socio_encargado_cliente, c.sector_economico, c.origen_cliente),
          )
        : clientes,
    [clientes, search],
  );

  const sociosFiltrados = useMemo(
    () =>
      search
        ? socios.filter((s) => matches(search, s.codigo, s.nombre, s.email))
        : socios,
    [socios, search],
  );

  const casoCols: ColumnsType<InformeCasoRow> = [
    {
      title: 'Directorio', dataIndex: 'directorio', width: 110,
      render: (v: string) => v ? <Tag>{v}</Tag> : '-',
      sorter: (a, b) => (a.directorio ?? '').localeCompare(b.directorio ?? ''),
    },
    { title: 'Cliente', dataIndex: 'nombre', ellipsis: true },
    { title: 'Caso', dataIndex: 'caso', width: 90 },
    { title: 'Descripción', dataIndex: 'descripcion', ellipsis: true },
    {
      title: 'Encargado', dataIndex: 'encargado', width: 110, align: 'center',
      render: (v: string) => v ? <Tag color="blue">{v}</Tag> : '-',
      sorter: (a, b) => (a.encargado ?? '').localeCompare(b.encargado ?? ''),
    },
    {
      title: 'Coordinador', dataIndex: 'coordinador', width: 120, align: 'center',
      render: (v: string) => v ? <Tag color="geekblue">{v}</Tag> : '-',
    },
    { title: 'Equipo', dataIndex: 'equipo', width: 110 },
    { title: 'Área', dataIndex: 'area', width: 170, ellipsis: true },
    {
      title: 'Fecha', dataIndex: 'fecha', width: 110,
      render: fmtFecha,
      sorter: (a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? ''),
      defaultSortOrder: 'descend',
    },
    { title: 'Pacto', dataIndex: 'pacto', width: 130, ellipsis: true },
  ];

  const clienteCols: ColumnsType<InformeClienteRow> = [
    {
      title: 'Cliente', dataIndex: 'cliente', width: 110,
      render: (v: string) => v ? <Tag>{v}</Tag> : '-',
      sorter: (a, b) => (a.cliente ?? '').localeCompare(b.cliente ?? ''),
    },
    { title: 'Razón social', dataIndex: 'razon_social', ellipsis: true },
    {
      title: 'Socio', dataIndex: 'socio_encargado_cliente', width: 100, align: 'center',
      render: (v: string) => v ? <Tag color="blue">{v}</Tag> : '-',
      sorter: (a, b) =>
        (a.socio_encargado_cliente ?? '').localeCompare(b.socio_encargado_cliente ?? ''),
    },
    {
      title: 'Fecha', dataIndex: 'fecha', width: 110,
      render: fmtFecha,
      sorter: (a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? ''),
      defaultSortOrder: 'descend',
    },
    { title: 'Sector económico', dataIndex: 'sector_economico', ellipsis: true },
    { title: 'Origen', dataIndex: 'origen_cliente', ellipsis: true },
    { title: 'Referido por', dataIndex: 'obs_origen_cliente', ellipsis: true },
    { title: 'Registro creación', dataIndex: 'registro_creacion', ellipsis: true },
  ];

  const socioCols: ColumnsType<InformeSocio> = [
    {
      title: 'Código', dataIndex: 'codigo', width: 100,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
      sorter: (a, b) => a.codigo.localeCompare(b.codigo),
    },
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Email', dataIndex: 'email', ellipsis: true },
    {
      title: 'Activo', dataIndex: 'activo', width: 90, align: 'center',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Sí' : 'No'}</Tag>,
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 4 }}>
        Datos Importados
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Consulta los casos y clientes actualmente cargados en el sistema y los
        socios registrados que reciben los informes.
      </Paragraph>

      <Card style={{ borderRadius: 12 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Buscar por código, nombre, socio, equipo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 420, marginBottom: 16 }}
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchAll}
          loading={loading}
          style={{ marginLeft: 12 }}
        >
          Actualizar
        </Button>

        <Tabs
          defaultActiveKey="casos"
          items={[
            {
              key: 'casos',
              label: (
                <span>
                  <FileSearchOutlined /> Casos ({casosFiltrados.length})
                </span>
              ),
              children: (
                <Table<InformeCasoRow>
                  dataSource={casosFiltrados}
                  columns={casoCols}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  scroll={{ x: 1200 }}
                  pagination={{ pageSize: 25, showTotal: (t) => `${t} casos` }}
                />
              ),
            },
            {
              key: 'clientes',
              label: (
                <span>
                  <UsergroupAddOutlined /> Clientes ({clientesFiltrados.length})
                </span>
              ),
              children: (
                <Table<InformeClienteRow>
                  dataSource={clientesFiltrados}
                  columns={clienteCols}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  scroll={{ x: 1200 }}
                  pagination={{ pageSize: 25, showTotal: (t) => `${t} clientes` }}
                />
              ),
            },
            {
              key: 'socios',
              label: (
                <span>
                  <UserOutlined /> Socios ({sociosFiltrados.length})
                </span>
              ),
              children: (
                <Table<InformeSocio>
                  dataSource={sociosFiltrados}
                  columns={socioCols}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  pagination={{ pageSize: 25, showTotal: (t) => `${t} socios` }}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default DatosImportadosPage;
