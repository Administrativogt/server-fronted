import React, { useCallback, useEffect, useState } from 'react';
import { App as AntdApp, Button, Card, Popconfirm, Space, Switch, Table, Tag } from 'antd';
import { PlusOutlined, ReloadOutlined, DeleteOutlined, SyncOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { changeYearOfHolidays, deleteHoliday, getHolidays } from '../../api/agendador';
import type { Holiday } from '../../types/agendador.types';

const SchedulerHolidaysList: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [changingYear, setChangingYear] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHolidays();
      setRows(data);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'No se pudo cargar feriados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: number) => {
    try {
      const res = await deleteHoliday(id);
      message.success(res.message || 'Feriado eliminado');
      fetchData();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'No se pudo eliminar feriado');
    }
  };

  const handleChangeYear = async () => {
    setChangingYear(true);
    try {
      const res = await changeYearOfHolidays();
      message.success(`${res.message}. Actualizados: ${res.updated}, eliminados: ${res.deleted}`);
      fetchData();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'No se pudo actualizar el año de feriados');
    } finally {
      setChangingYear(false);
    }
  };

  return (
    <Card
      title="Lista de feriados"
      extra={(
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData} />
          <Button icon={<SyncOutlined />} loading={changingYear} onClick={handleChangeYear}>
            Cambiar año
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/dashboard/agendador/feriados/crear')}>
            Crear feriado
          </Button>
        </Space>
      )}
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={{ pageSize: 15 }}
        columns={[
          {
            title: 'Fecha',
            dataIndex: 'date',
            key: 'date',
            width: 180,
            render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
          },
          {
            title: 'Nombre',
            dataIndex: 'name',
            key: 'name',
          },
          {
            title: 'Repetitivo',
            dataIndex: 'is_repetitive',
            key: 'is_repetitive',
            width: 140,
            render: (v: boolean) => (v ? <Tag color="green">SI</Tag> : <Tag>NO</Tag>),
          },
          {
            title: 'Activo',
            key: 'switch',
            width: 100,
            render: (_, r: Holiday) => <Switch checked={r.is_repetitive} disabled />,
          },
          {
            title: 'Acciones',
            key: 'actions',
            width: 120,
            render: (_, r: Holiday) => (
              <Popconfirm
                title="¿Eliminar feriado?"
                okText="Eliminar"
                cancelText="Cancelar"
                onConfirm={() => handleDelete(r.id)}
              >
                <Button danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]}
      />
    </Card>
  );
};

export default SchedulerHolidaysList;
