import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { horasSociosApi } from '../../api/horas-socios';
import type {
  CategoriaNF,
  HorasCasoEspecial,
  HorasDestinatario,
  HorasEquipo,
  HorasTimekeeper,
} from '../../types/horas-socios.types';

const { Title, Text } = Typography;

const CATEGORIAS: { value: CategoriaNF; label: string }[] = [
  { value: 'FORMACION', label: 'Formación' },
  { value: 'CONSORTIUM', label: 'Horas Consortium' },
  { value: 'COBRO_FACTURACION', label: 'Cobro y Facturación' },
  { value: 'PRO_BONO', label: 'Pro Bono' },
  { value: 'GESTION_ADMINISTRATIVA', label: 'Gestión Administrativa' },
  { value: 'CNC', label: 'Cobrables que no se cobran (CNC)' },
];

const HorasCatalogosPage: React.FC = () => {
  const [equipos, setEquipos] = useState<HorasEquipo[]>([]);
  const [timekeepers, setTimekeepers] = useState<HorasTimekeeper[]>([]);
  const [casos, setCasos] = useState<HorasCasoEspecial[]>([]);
  const [destinatarios, setDestinatarios] = useState<HorasDestinatario[]>([]);
  const [loading, setLoading] = useState(false);

  // modal genérico: qué catálogo edita y el registro (null = crear)
  const [modal, setModal] = useState<null | {
    tipo: 'timekeeper' | 'equipo' | 'caso' | 'destinatario';
    registro: any | null;
  }>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const cargar = async () => {
    setLoading(true);
    try {
      const [eq, tk, ce, de] = await Promise.all([
        horasSociosApi.getEquipos(),
        horasSociosApi.getTimekeepers(),
        horasSociosApi.getCasosEspeciales(),
        horasSociosApi.getDestinatarios(),
      ]);
      setEquipos(eq.data);
      setTimekeepers(tk.data);
      setCasos(ce.data);
      setDestinatarios(de.data);
    } catch {
      message.error('No se pudieron cargar los catálogos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirModal = (tipo: NonNullable<typeof modal>['tipo'], registro: any | null) => {
    setModal({ tipo, registro });
    form.resetFields();
    if (registro) {
      form.setFieldsValue(
        tipo === 'timekeeper' ? { ...registro, equipo_id: registro.equipo?.id } : registro,
      );
    } else {
      form.setFieldsValue({ activo: true });
    }
  };

  const guardar = async () => {
    const valores = await form.validateFields();
    if (!modal) return;
    setGuardando(true);
    try {
      const { tipo, registro } = modal;
      if (tipo === 'timekeeper') {
        registro
          ? await horasSociosApi.updateTimekeeper(registro.id, valores)
          : await horasSociosApi.createTimekeeper(valores);
      } else if (tipo === 'equipo') {
        registro
          ? await horasSociosApi.updateEquipo(registro.id, valores)
          : await horasSociosApi.createEquipo(valores);
      } else if (tipo === 'caso') {
        registro
          ? await horasSociosApi.updateCasoEspecial(registro.id, valores)
          : await horasSociosApi.createCasoEspecial(valores);
      } else {
        registro
          ? await horasSociosApi.updateDestinatario(registro.id, valores)
          : await horasSociosApi.createDestinatario(valores);
      }
      message.success('Guardado');
      setModal(null);
      await cargar();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (tipo: NonNullable<typeof modal>['tipo'], id: number) => {
    try {
      if (tipo === 'timekeeper') await horasSociosApi.deleteTimekeeper(id);
      else if (tipo === 'equipo') await horasSociosApi.deleteEquipo(id);
      else if (tipo === 'caso') await horasSociosApi.deleteCasoEspecial(id);
      else await horasSociosApi.deleteDestinatario(id);
      message.success('Eliminado');
      await cargar();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const accionesCol = (tipo: NonNullable<typeof modal>['tipo']): ColumnsType<any>[number] => ({
    title: 'Acciones',
    width: 110,
    render: (_, r) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => abrirModal(tipo, r)} />
        <Popconfirm title="¿Eliminar?" onConfirm={() => eliminar(tipo, r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    ),
  });

  const activoCol: ColumnsType<any>[number] = {
    title: 'Activo',
    dataIndex: 'activo',
    width: 80,
    render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Sí' : 'No'}</Tag>,
  };

  const colsTimekeepers: ColumnsType<HorasTimekeeper> = [
    { title: 'Usuario (nombre en Time Manager)', dataIndex: 'nombre', sorter: (a, b) => a.nombre.localeCompare(b.nombre) },
    {
      title: 'Equipo',
      render: (_, r) => r.equipo?.nombre ?? '—',
      sorter: (a, b) => (a.equipo?.nombre ?? '').localeCompare(b.equipo?.nombre ?? ''),
      filters: equipos.map((e) => ({ text: e.nombre, value: e.id })),
      onFilter: (v, r) => r.equipo?.id === v,
    },
    { title: 'Socio', width: 80, render: (_, r) => <Tag>{r.equipo?.socio_codigo ?? '?'}</Tag> },
    activoCol,
    accionesCol('timekeeper'),
  ];

  const colsEquipos: ColumnsType<HorasEquipo> = [
    { title: 'Nombre (columna EQUIPO del reporte)', dataIndex: 'nombre' },
    { title: 'Socio (hoja/correo)', dataIndex: 'socio_codigo', width: 140, render: (v: string) => <Tag color="blue">{v}</Tag> },
    activoCol,
    accionesCol('equipo'),
  ];

  const colsCasos: ColumnsType<HorasCasoEspecial> = [
    { title: 'Número de caso', dataIndex: 'numero_caso', width: 130 },
    {
      title: 'Categoría',
      dataIndex: 'categoria',
      render: (v: CategoriaNF) => CATEGORIAS.find((c) => c.value === v)?.label ?? v,
    },
    { title: 'Descripción', dataIndex: 'descripcion', ellipsis: true },
    accionesCol('caso'),
  ];

  const colsDestinatarios: ColumnsType<HorasDestinatario> = [
    { title: 'Socio', dataIndex: 'socio_codigo', width: 80, render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Nombre', dataIndex: 'nombre_socio' },
    { title: 'Para', dataIndex: 'email_para', ellipsis: true },
    { title: 'CC', dataIndex: 'emails_cc', ellipsis: true },
    activoCol,
    accionesCol('destinatario'),
  ];

  const tablaProps = { size: 'small' as const, rowKey: 'id', loading, pagination: { pageSize: 20 } };

  const nuevoBtn = (tipo: NonNullable<typeof modal>['tipo'], texto: string) => (
    <Button type="primary" icon={<PlusOutlined />} onClick={() => abrirModal(tipo, null)}>
      {texto}
    </Button>
  );

  const titulos: Record<string, string> = {
    timekeeper: 'usuario → equipo',
    equipo: 'equipo',
    caso: 'caso especial NF',
    destinatario: 'destinatario',
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>
        <SettingOutlined /> Horas Socios — Catálogos
      </Title>
      <Text type="secondary">
        Mapeos que usa el sistema para clasificar el TM-report. Corregir aquí y regenerar el
        reporte — no hace falta re-importar.
      </Text>

      <Card style={{ marginTop: 16 }}>
        <Tabs
          items={[
            {
              key: 'timekeepers',
              label: `Usuarios → equipo (${timekeepers.length})`,
              children: (
                <>
                  <div style={{ marginBottom: 12 }}>{nuevoBtn('timekeeper', 'Nuevo usuario')}</div>
                  <Table {...tablaProps} columns={colsTimekeepers} dataSource={timekeepers} />
                </>
              ),
            },
            {
              key: 'equipos',
              label: `Equipos (${equipos.length})`,
              children: (
                <>
                  <div style={{ marginBottom: 12 }}>{nuevoBtn('equipo', 'Nuevo equipo')}</div>
                  <Table {...tablaProps} columns={colsEquipos} dataSource={equipos} />
                </>
              ),
            },
            {
              key: 'destinatarios',
              label: `Destinatarios (${destinatarios.length})`,
              children: (
                <>
                  <div style={{ marginBottom: 12 }}>{nuevoBtn('destinatario', 'Nuevo destinatario')}</div>
                  <Table {...tablaProps} columns={colsDestinatarios} dataSource={destinatarios} />
                </>
              ),
            },
            {
              key: 'casos',
              label: `Casos especiales NF (${casos.length})`,
              children: (
                <>
                  <div style={{ marginBottom: 12 }}>{nuevoBtn('caso', 'Nuevo caso')}</div>
                  <Table {...tablaProps} columns={colsCasos} dataSource={casos} />
                </>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={`${modal?.registro ? 'Editar' : 'Nuevo'} ${titulos[modal?.tipo ?? 'timekeeper']}`}
        open={!!modal}
        onCancel={() => setModal(null)}
        onOk={guardar}
        confirmLoading={guardando}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {modal?.tipo === 'timekeeper' && (
            <>
              <Form.Item
                name="nombre"
                label="Nombre EXACTO del Usuario en Time Manager"
                rules={[{ required: true }]}
              >
                <Input placeholder="SANDRA DE ZEDAN" />
              </Form.Item>
              <Form.Item name="equipo_id" label="Equipo" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={equipos.map((e) => ({ value: e.id, label: `${e.nombre} (${e.socio_codigo})` }))}
                />
              </Form.Item>
            </>
          )}
          {modal?.tipo === 'equipo' && (
            <>
              <Form.Item name="nombre" label="Nombre (columna EQUIPO)" rules={[{ required: true }]}>
                <Input placeholder="ARM - Inmobiliario" />
              </Form.Item>
              <Form.Item
                name="socio_codigo"
                label="Código de socio (hoja/correo que agrupa)"
                rules={[{ required: true }]}
              >
                <Input placeholder="ARM" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </>
          )}
          {modal?.tipo === 'caso' && (
            <>
              <Form.Item name="numero_caso" label="Número de caso" rules={[{ required: true }]}>
                <Input placeholder="2984" />
              </Form.Item>
              <Form.Item name="categoria" label="Categoría" rules={[{ required: true }]}>
                <Select options={CATEGORIAS} />
              </Form.Item>
              <Form.Item name="descripcion" label="Descripción">
                <Input />
              </Form.Item>
            </>
          )}
          {modal?.tipo === 'destinatario' && (
            <>
              <Form.Item name="socio_codigo" label="Código de socio" rules={[{ required: true }]}>
                <Input placeholder="ARM" />
              </Form.Item>
              <Form.Item name="nombre_socio" label="Nombre del socio">
                <Input />
              </Form.Item>
              <Form.Item
                name="email_para"
                label="Correos destino (separados por coma)"
                rules={[{ required: true }]}
              >
                <Input placeholder="arodriguez@consortiumlegal.com" />
              </Form.Item>
              <Form.Item name="emails_cc" label="Correos en copia (separados por coma)">
                <Input placeholder="fguerra@consortiumlegal.com" />
              </Form.Item>
            </>
          )}
          {modal?.tipo !== 'caso' && (
            <Form.Item name="activo" label="Activo" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default HorasCatalogosPage;
