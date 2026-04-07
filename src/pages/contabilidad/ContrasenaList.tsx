import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  message,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import { EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { contrasenaApi } from '../../api/accounting';
import type { ContrasenaDeago, Factura } from '../../types/accounting.types';

const ESTADO_LABELS: Record<number, string> = {
  1: 'Pagada',
  2: 'Pendiente',
  3: 'Anulada',
};

const ESTADO_COLORS: Record<number, string> = {
  1: 'green',
  2: 'orange',
  3: 'red',
};

export default function ContrasenaList() {
  const navigate = useNavigate();
  const [data, setData] = useState<ContrasenaDeago[]>([]);
  const [loading, setLoading] = useState(false);
  const [startFiltro, setStartFiltro] = useState<string | undefined>();
  const [endFiltro, setEndFiltro] = useState<string | undefined>();
  const [estadoFiltro, setEstadoFiltro] = useState<number | undefined>();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await contrasenaApi.getAll({ start: startFiltro, end: endFiltro, estado: estadoFiltro });
      setData(res.data);
    } catch {
      message.error('Error al cargar contraseñas de pago');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [startFiltro, endFiltro, estadoFiltro]);

  const handleReporte = async () => {
    if (!selectedIds.length) {
      message.warning('Seleccione al menos una contraseña');
      return;
    }
    try {
      const res = await contrasenaApi.getReporte(selectedIds);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toLocaleDateString('es-GT').replace(/\//g, '-');
      link.setAttribute('download', `ReporteContrasenas--${today}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      message.error('Error al generar reporte');
    }
  };

  const columns: ColumnsType<ContrasenaDeago> = [
    { title: 'Código', dataIndex: 'codigo_unico', width: 100 },
    { title: 'Cliente', dataIndex: 'cliente' },
    {
      title: 'Fecha Cancelación',
      dataIndex: 'fecha_cancelacion',
      width: 150,
    },
    {
      title: 'Facturas',
      dataIndex: 'facturas',
      render: (val: string) => {
        try {
          const f: Factura[] = JSON.parse(val);
          return `${f.length} factura(s)`;
        } catch {
          return '—';
        }
      },
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      width: 110,
      render: (val: number) => (
        <Tag color={ESTADO_COLORS[val]}>{ESTADO_LABELS[val] ?? val}</Tag>
      ),
    },
    {
      title: 'Creada por',
      dataIndex: 'usuario_creador',
      render: (u) => u ? `${u.first_name} ${u.last_name}` : '—',
    },
    {
      title: 'Acciones',
      width: 80,
      render: (_, record) => (
        <Tooltip title="Ver detalle">
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/dashboard/contabilidad/contrasenas/${record.id}`)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <Card
      title="Contraseñas de Pago"
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/dashboard/contabilidad/contrasenas/crear')}
          >
            Nueva
          </Button>
          <Button onClick={handleReporte} disabled={!selectedIds.length}>
            Descargar Reporte
          </Button>
        </Space>
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <DatePicker
          placeholder="Fecha inicio (creación)"
          onChange={(_, dateStr) =>
            setStartFiltro(typeof dateStr === 'string' && dateStr ? dateStr : undefined)
          }
          format="YYYY-MM-DD"
          value={startFiltro ? dayjs(startFiltro) : null}
        />
        <DatePicker
          placeholder="Fecha fin (creación)"
          onChange={(_, dateStr) =>
            setEndFiltro(typeof dateStr === 'string' && dateStr ? dateStr : undefined)
          }
          format="YYYY-MM-DD"
          value={endFiltro ? dayjs(endFiltro) : null}
        />
        <Select
          placeholder="Estado"
          allowClear
          style={{ width: 140 }}
          onChange={(val) => setEstadoFiltro(val)}
          options={[
            { label: 'Pagada', value: 1 },
            { label: 'Pendiente', value: 2 },
            { label: 'Anulada', value: 3 },
          ]}
        />
      </Space>

      <Table
        rowKey="id"
        dataSource={data}
        columns={columns}
        loading={loading}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as number[]),
        }}
        pagination={{ pageSize: 15 }}
      />
    </Card>
  );
}
