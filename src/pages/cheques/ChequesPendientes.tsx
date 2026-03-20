import { useEffect, useMemo, useState } from 'react';
import { Button, Card, InputNumber, message, Select, Space, Table, Typography } from 'antd';
import { downloadPendingLiquidationReport, getPendingLiquidation } from '../../api/checks';
import type { CheckRequest } from '../../types/checks.types';
import { fetchUsers, fullName, type UserLite } from '../../api/users';
import useAuthStore from '../../auth/useAuthStore';

const { Title } = Typography;

function ChequesPendientes() {
  const userId = useAuthStore((s) => s.userId);
  const tipoUsuario = useAuthStore((s) => s.tipo_usuario);
  const isSuperuser = useAuthStore((s) => s.is_superuser);
  const canViewAll = isSuperuser || [1, 2, 10].includes(tipoUsuario || 0);

  const [rows, setRows] = useState<CheckRequest[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [responsibleId, setResponsibleId] = useState<number | undefined>(
    canViewAll ? undefined : (userId ?? undefined),
  );
  const [requestId, setRequestId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!canViewAll && userId) {
      setResponsibleId(userId);
    }
  }, [canViewAll, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await getPendingLiquidation({
        page: 1,
        per_page: 300,
        responsible_id: canViewAll ? responsibleId || undefined : userId || undefined,
        request_id: requestId || undefined,
      });
      setRows(response.data);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al cargar cheques pendientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const oldestByResponsible = useMemo(() => {
    const grouped = new Map<number, CheckRequest[]>();
    rows.forEach((row) => {
      const id = row.responsible?.id || 0;
      const list = grouped.get(id) || [];
      list.push(row);
      grouped.set(id, list);
    });
    const output: (CheckRequest & { pending_count: number })[] = [];
    grouped.forEach((list) => {
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      output.push({
        ...list[0],
        pending_count: list.length,
      });
    });
    return output;
  }, [rows]);

  return (
    <Card>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <Title level={4} style={{ margin: 0 }}>
          Cheques pendientes antiguos por usuario
        </Title>
        <Space>
          <Button onClick={() => loadData()} loading={loading}>
            Recargar
          </Button>
          <Button onClick={() => downloadPendingLiquidationReport(responsibleId)}>
            Descargar reporte
          </Button>
        </Space>
      </Space>

      <Space style={{ marginBottom: 12 }} wrap>
        {canViewAll ? (
          <Select<number>
            allowClear
            showSearch
            style={{ width: 320 }}
            placeholder="Responsable"
            value={responsibleId}
            onChange={setResponsibleId}
            options={users.map((user) => ({
              label: `${fullName(user)} (${user.username})`,
              value: user.id,
            }))}
            optionFilterProp="label"
          />
        ) : null}
        <InputNumber
          placeholder="Request ID"
          value={requestId}
          onChange={(value) => setRequestId(value || undefined)}
        />
        <Button type="primary" onClick={loadData}>
          Buscar
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={oldestByResponsible}
        pagination={{ pageSize: 20 }}
        columns={[
          {
            title: 'Responsable',
            render: (row: CheckRequest) =>
              row.responsible
                ? `${row.responsible.first_name} ${row.responsible.last_name} (${row.responsible.username})`
                : 'Sin responsable',
          },
          { title: 'Cheque más antiguo (request)', dataIndex: 'request_id', width: 200 },
          { title: 'Fecha más antigua', dataIndex: 'date', width: 140 },
          { title: 'Pendientes', dataIndex: 'pending_count', width: 120 },
          { title: 'Cliente', dataIndex: 'client', width: 120 },
          { title: 'Descripción', dataIndex: 'description', ellipsis: true },
        ]}
      />
    </Card>
  );
}

export default ChequesPendientes;
