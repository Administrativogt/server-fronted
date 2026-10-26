import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Drawer,
  Input,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CATEGORIAS_NF, horasSociosApi, minutosAHoras } from '../../api/horas-socios';
import type {
  CasoNoFacturable,
  CategoriaNF,
  ClienteNoFacturable,
  NoFacturablesResult,
} from '../../types/horas-socios.types';

const { Text } = Typography;

const etiqueta = (c: CategoriaNF | null | undefined) =>
  CATEGORIAS_NF.find((x) => x.value === c)?.label ?? 'CNC';

/** Una regla por cliente en CNC no cambia nada (ya es el defecto). */
const OPCIONES_CLIENTE = CATEGORIAS_NF.filter((c) => c.value !== 'CNC');

interface Props {
  open: boolean;
  importacionId: number | null;
  onClose: () => void;
  /** Se llama tras cada cambio para volver a calcular el reporte. */
  onChanged: () => void;
}

/**
 * Pantalla del jefe para sacar de CNC las horas no facturables que no lo son
 * (p. ej. un caso Pro Bono creado en un cliente normal). Regla al calcular:
 * caso > cliente > CNC por defecto.
 */
const NoFacturablesDrawer: React.FC<Props> = ({ open, importacionId, onClose, onChanged }) => {
  const [data, setData] = useState<NoFacturablesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'cnc' | 'todos'>('cnc');
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    if (!importacionId) return;
    setLoading(true);
    try {
      const { data } = await horasSociosApi.getNoFacturables(importacionId);
      setData(data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'No se pudieron cargar las horas no facturables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, importacionId]);

  const guardar = async (clave: string, accion: () => Promise<unknown>, ok: string) => {
    setGuardando(clave);
    try {
      await accion();
      message.success(ok);
      await cargar();
      onChanged();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'No se pudo guardar la clasificación');
    } finally {
      setGuardando(null);
    }
  };

  const cambiarCliente = (c: ClienteNoFacturable, categoria: CategoriaNF | undefined) => {
    const clave = `cli:${c.idCliente}`;
    if (!categoria) {
      if (!c.reglaClienteId) return;
      Modal.confirm({
        title: `¿Quitar la clasificación de ${c.cliente}?`,
        content: 'Sus horas no facturables vuelven a Cobrables que no se cobran (CNC), salvo los casos con clasificación propia.',
        okText: 'Quitar',
        cancelText: 'Cancelar',
        onOk: () =>
          guardar(
            clave,
            () => horasSociosApi.deleteClienteEspecial(c.reglaClienteId!),
            `${c.cliente}: vuelve a CNC`,
          ),
      });
      return;
    }
    guardar(
      clave,
      () =>
        c.reglaClienteId
          ? horasSociosApi.updateClienteEspecial(c.reglaClienteId, { categoria })
          : horasSociosApi.createClienteEspecial({
              id_cliente: c.idCliente,
              nombre: c.cliente,
              categoria,
            }),
      `${c.cliente}: ${etiqueta(categoria)}`,
    );
  };

  const cambiarCaso = (
    cliente: ClienteNoFacturable,
    caso: CasoNoFacturable,
    categoria: CategoriaNF | undefined,
  ) => {
    const clave = `caso:${caso.numeroCaso}`;
    if (!categoria) {
      if (!caso.reglaCasoId) return;
      const destino = cliente.categoriaCliente
        ? `la clasificación del cliente (${etiqueta(cliente.categoriaCliente)})`
        : 'Cobrables que no se cobran (CNC)';
      Modal.confirm({
        title: `¿Quitar la clasificación del caso ${caso.numeroCaso}?`,
        content: `Sus horas pasan a ${destino}. Si es uno de los casos internos (2984–2988, 5179), esto cambia el Mapa de Horas de todos.`,
        okText: 'Quitar',
        okButtonProps: { danger: true },
        cancelText: 'Cancelar',
        onOk: () =>
          guardar(
            clave,
            () => horasSociosApi.deleteCasoEspecial(caso.reglaCasoId!),
            `Caso ${caso.numeroCaso}: sin clasificación propia`,
          ),
      });
      return;
    }
    guardar(
      clave,
      () =>
        caso.reglaCasoId
          ? horasSociosApi.updateCasoEspecial(caso.reglaCasoId, { categoria })
          : horasSociosApi.createCasoEspecial({
              numero_caso: caso.numeroCaso,
              categoria,
              descripcion: caso.asunto || undefined,
            }),
      `Caso ${caso.numeroCaso}: ${etiqueta(categoria)}`,
    );
  };

  const clientes = useMemo(() => {
    const lista = data?.clientes ?? [];
    const q = busqueda.trim().toLowerCase();
    return lista.filter((c) => {
      if (filtro === 'cnc' && c.minutosCnc === 0) return false;
      if (!q) return true;
      return (
        c.cliente.toLowerCase().includes(q) ||
        c.idCliente.includes(q) ||
        c.casos.some(
          (k) => k.numeroCaso.toLowerCase().includes(q) || k.asunto.toLowerCase().includes(q),
        )
      );
    });
  }, [data, filtro, busqueda]);

  const totalCnc = useMemo(
    () => (data?.clientes ?? []).reduce((s, c) => s + c.minutosCnc, 0),
    [data],
  );

  const colsCasos = (cliente: ClienteNoFacturable): ColumnsType<CasoNoFacturable> => [
    { title: 'Caso', dataIndex: 'numeroCaso', width: 100 },
    { title: 'Asunto', dataIndex: 'asunto', ellipsis: true },
    {
      title: 'Horas',
      dataIndex: 'minutos',
      align: 'right',
      width: 80,
      render: (v: number) => minutosAHoras(v),
    },
    {
      title: 'Clasificación del caso',
      width: 270,
      render: (_, k) => (
        <Select<CategoriaNF>
          size="small"
          style={{ width: 250 }}
          allowClear
          loading={guardando === `caso:${k.numeroCaso}`}
          disabled={guardando !== null}
          value={k.reglaCasoId ? k.categoria : undefined}
          placeholder={
            k.origen === 'cliente'
              ? `Según cliente: ${etiqueta(k.categoria)}`
              : 'CNC (por defecto)'
          }
          options={CATEGORIAS_NF}
          onChange={(v) => cambiarCaso(cliente, k, v)}
        />
      ),
    },
  ];

  const colsClientes: ColumnsType<ClienteNoFacturable> = [
    {
      title: 'Cliente',
      render: (_, c) => (
        <Space direction="vertical" size={0}>
          <Text strong>{c.cliente}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID {c.idCliente} · {c.casos.length} caso(s)
          </Text>
        </Space>
      ),
    },
    {
      title: 'Horas no facturables',
      dataIndex: 'minutos',
      align: 'right',
      width: 110,
      render: (v: number) => minutosAHoras(v),
    },
    {
      title: 'En CNC hoy',
      dataIndex: 'minutosCnc',
      align: 'right',
      width: 100,
      render: (v: number) =>
        v > 0 ? <Text strong>{minutosAHoras(v)}</Text> : <Text type="secondary">0:00</Text>,
    },
    {
      title: 'Clasificación del cliente',
      width: 230,
      render: (_, c) =>
        c.idCliente === '?' ? (
          <Text type="secondary">—</Text>
        ) : (
          <Select<CategoriaNF>
            size="small"
            style={{ width: 210 }}
            allowClear
            loading={guardando === `cli:${c.idCliente}`}
            disabled={guardando !== null}
            value={c.categoriaCliente ?? undefined}
            placeholder="CNC (por defecto)"
            options={OPCIONES_CLIENTE}
            onChange={(v) => cambiarCliente(c, v)}
          />
        ),
    },
  ];

  return (
    <Drawer
      title="Clasificar horas no facturables"
      open={open}
      onClose={onClose}
      width="min(1000px, 100vw)"
      destroyOnHidden
    >
      <Text type="secondary" style={{ display: 'block', maxWidth: '75ch' }}>
        Toda hora no facturable que no esté en un caso clasificado cae en{' '}
        <Text strong>Cobrables que no se cobran (CNC)</Text>. Elige una categoría para el cliente
        completo (aplica también a sus casos nuevos) o abre el cliente y clasifica un caso en
        particular: el caso manda sobre el cliente. El reporte se recalcula al guardar.
      </Text>

      {data && !data.conFilaCruda && (
        <Alert
          style={{ marginTop: 12 }}
          type="warning"
          showIcon
          message="Esta importación no trae el detalle de cliente"
          description="Fue subida antes de que el sistema guardara la fila completa del TM-report. Vuelve a subir el archivo para poder clasificar por cliente."
        />
      )}

      <Space wrap style={{ margin: '16px 0', width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Segmented
            value={filtro}
            onChange={(v) => setFiltro(v as 'cnc' | 'todos')}
            options={[
              { label: 'Con horas en CNC', value: 'cnc' },
              { label: 'Todos los clientes', value: 'todos' },
            ]}
          />
          <Input.Search
            allowClear
            placeholder="Buscar cliente, caso o asunto"
            style={{ width: 280 }}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </Space>
        {data && (
          <Text type="secondary">
            {clientes.length} cliente(s) · {minutosAHoras(totalCnc)} h en CNC en total
          </Text>
        )}
      </Space>

      <Table
        rowKey="idCliente"
        size="small"
        loading={loading}
        columns={colsClientes}
        dataSource={clientes}
        pagination={{ pageSize: 25, showSizeChanger: false }}
        locale={{
          emptyText:
            filtro === 'cnc' ? 'Ningún cliente tiene horas en CNC' : 'Sin horas no facturables',
        }}
        expandable={{
          expandedRowRender: (c) => (
            <Table
              rowKey="numeroCaso"
              size="small"
              columns={colsCasos(c)}
              dataSource={c.casos}
              pagination={false}
            />
          ),
        }}
      />
      <Space size={4} wrap style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Solo cuenta a quien entra al reporte (con equipo).
        </Text>
        <Tag bordered={false}>caso &gt; cliente &gt; CNC</Tag>
      </Space>
    </Drawer>
  );
};

export default NoFacturablesDrawer;
