import React, { useEffect, useState } from 'react';
import { Button, Card, DatePicker, message, Select, Space, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { contrasenaApi } from '../../api/accounting';
import type { ContrasenaDeago } from '../../types/accounting.types';

const ESTADO_LABELS: Record<number, string> = { 1: 'Pagada', 2: 'Pendiente', 3: 'Anulada' };
const ESTADO_COLORS: Record<number, string> = { 1: 'green', 2: 'orange', 3: 'red' };

export default function ContrasenasPendientes() {
  const [data, setData] = useState<ContrasenaDeago[]>([]);
  const [loading, setLoading] = useState(false);
  const [start, setStart] = useState<string | undefined>();
  const [end, setEnd] = useState<string | undefined>();

  const load = async () => {
    try {
      setLoading(true);
      const res = await contrasenaApi.getPendientes(start, end);
      setData(res.data);
    } catch {
      message.error('Error al cargar contraseñas pendientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [start, end]);

  const handleEstadoChange = async (id: number, estado: number) => {
    try {
      await contrasenaApi.update(id, { estado: estado as 1 | 2 | 3 });
      message.success('Estado actualizado');
      load();
    } catch {
      message.error('Error al actualizar estado');
    }
  };

  const columns: ColumnsType<ContrasenaDeago> = [
    { title: 'Código', dataIndex: 'codigo_unico', width: 100 },
    { title: 'Cliente', dataIndex: 'cliente' },
    { title: 'Correo', dataIndex: 'cliente_correo' },
    { title: 'Fecha Cancelación', dataIndex: 'fecha_cancelacion', width: 150 },
    {
      title: 'Estado',
      dataIndex: 'estado',
      width: 130,
      render: (val: number, record) => (
        <Select
          value={val}
          onChange={(v) => handleEstadoChange(record.id, v)}
          size="small"
          style={{ width: 110 }}
          options={[
            { label: 'Pagada', value: 1 },
            { label: 'Pendiente', value: 2 },
            { label: 'Anulada', value: 3 },
          ]}
        />
      ),
    },
  ];

  return (
    <Card title="Contraseñas Pendientes">
      <Space style={{ marginBottom: 16 }}>
        <DatePicker
          placeholder="Fecha inicio (creación)"
          onChange={(_, dateStr) =>
            setStart(typeof dateStr === 'string' && dateStr ? dateStr : undefined)
          }
          format="YYYY-MM-DD"
          value={start ? dayjs(start) : null}
        />
        <DatePicker
          placeholder="Fecha fin (creación)"
          onChange={(_, dateStr) =>
            setEnd(typeof dateStr === 'string' && dateStr ? dateStr : undefined)
          }
          format="YYYY-MM-DD"
          value={end ? dayjs(end) : null}
        />
        <Button onClick={load}>Actualizar</Button>
      </Space>

      <Table
        rowKey="id"
        dataSource={data}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 15 }}
      />
    </Card>
  );
}
