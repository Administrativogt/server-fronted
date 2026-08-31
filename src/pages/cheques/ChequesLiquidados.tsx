import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import type { CheckRequest } from '../../types/checks.types';
import {
  downloadLiquidatedReport,
  downloadMergedLiquidationDocuments,
  getLiquidatedChecks,
  getLiquidationDocumentUrl,
  revertLiquidation,
} from '../../api/checks';
import { fetchUsers, fullName, type UserLite } from '../../api/users';
import useAuthStore from '../../auth/useAuthStore';

const { Title, Text } = Typography;

// Cheques en estado "No disponible" (7): Sirvo dejó de reportarlos como
// pendientes porque los liquidaron fuera de la app. No hay comprobante,
// historial ni detalle local que mostrar.
const EXTERNAL_LIQUIDATION_MSG =
  'Este cheque fue liquidado en contabilidad o directamente en Sirvo. ' +
  'La aplicación no tiene información de esta liquidación (sin comprobante ni historial).';

function ChequesLiquidados() {
  const tipoUsuario = useAuthStore((s) => s.tipo_usuario);
  const isSuperuser = useAuthStore((s) => s.is_superuser);
  // Elevados y secretarias pueden filtrar por solicitante; el backend limita
  // el alcance real (equipo/códigos) por su cuenta.
  const canFilterResponsible =
    isSuperuser || [1, 2, 6, 9, 10].includes(tipoUsuario || 0);

  const [data, setData] = useState<CheckRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filters, setFilters] = useState({
    request_id: undefined as number | undefined,
    work_note_number: undefined as number | undefined,
    client: '',
    invoice_number: '',
    init_date: '',
    end_date: '',
    responsible_id: undefined as number | undefined,
    page: 1,
    per_page: 20,
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, per_page: 20 });

  const selectedCheckIds = data
    .filter((row) => selectedRowKeys.includes(row.id))
    .map((row) => row.id);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await getLiquidatedChecks({
        ...filters,
        request_id: filters.request_id || undefined,
        work_note_number: filters.work_note_number || undefined,
        client: filters.client.trim() || undefined,
        invoice_number: filters.invoice_number.trim() || undefined,
        init_date: filters.init_date || undefined,
        end_date: filters.end_date || undefined,
        responsible_id: canFilterResponsible
          ? filters.responsible_id || undefined
          : undefined,
      });
      setData(response.data);
      setPagination({
        total: response.total,
        page: response.page,
        per_page: response.per_page,
      });
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al cargar cheques liquidados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.per_page]);

  useEffect(() => {
    if (canFilterResponsible) {
      fetchUsers().then(setUsers).catch(() => setUsers([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFilterResponsible]);

  const handleRevert = async (checkRequestId: number) => {
    let reason = '';
    Modal.confirm({
      title: `Revertir liquidación ${checkRequestId}`,
      content: (
        <Input.TextArea
          rows={3}
          placeholder="Razón de reversión"
          onChange={(e) => {
            reason = e.target.value;
          }}
        />
      ),
      okText: 'Revertir',
      cancelText: 'Cancelar',
      onOk: async () => {
        if (!reason.trim()) {
          message.warning('Debe ingresar razón de reversión');
          return Promise.reject();
        }
        try {
          await revertLiquidation(checkRequestId, reason.trim());
          message.success(`Liquidación del cheque ${checkRequestId} revertida correctamente`);
          await loadData();
        } catch (error: any) {
          const rawMsg: string = error?.response?.data?.message || '';
          if (rawMsg.includes('solicitudes hijas') || rawMsg.includes('hijas')) {
            message.error(
              `El cheque ${checkRequestId} tiene solicitudes hijas activas. Debe anularlas antes de revertir esta liquidación.`,
              6,
            );
          } else if (rawMsg) {
            message.error(rawMsg, 5);
          } else {
            message.error('No se pudo revertir la liquidación. Intente nuevamente.');
          }
          return Promise.reject(error);
        }
      },
    });
  };

  const handleDownloadExcel = async () => {
    if (!selectedCheckIds.length) {
      message.info('Seleccione al menos un registro');
      return;
    }
    try {
      await downloadLiquidatedReport(
        {
          init_date: filters.init_date || undefined,
          end_date: filters.end_date || undefined,
        },
        selectedCheckIds,
      );
      message.success('Reporte descargado');
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al descargar reporte');
    }
  };

  const handleDownloadDocuments = async () => {
    if (!selectedCheckIds.length) {
      message.info('Seleccione al menos un registro');
      return;
    }
    try {
      await downloadMergedLiquidationDocuments(selectedCheckIds);
      message.success('Documentos descargados');
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al descargar documentos');
    }
  };

  return (
    <Card>
      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
        wrap
      >
        <Title level={4} style={{ margin: 0 }}>
          Cheques liquidados
        </Title>
        <Space>
          <Button onClick={() => loadData()} loading={loading}>
            Recargar
          </Button>
          <Button onClick={handleDownloadExcel} disabled={!selectedRowKeys.length}>
            Descargar Excel
          </Button>
          <Button onClick={handleDownloadDocuments} disabled={!selectedRowKeys.length}>
            Descargar comprobantes
          </Button>
        </Space>
      </Space>

      <Space style={{ marginBottom: 12 }} wrap>
        <InputNumber
          placeholder="request_id"
          value={filters.request_id}
          onChange={(value) => setFilters((prev) => ({ ...prev, request_id: value || undefined }))}
        />
        <InputNumber
          placeholder="Nota de trabajo (NT)"
          style={{ width: 170 }}
          value={filters.work_note_number}
          onChange={(value) => setFilters((prev) => ({ ...prev, work_note_number: value || undefined }))}
        />
        <Input
          placeholder="Cliente"
          allowClear
          style={{ width: 180 }}
          value={filters.client}
          onChange={(e) => setFilters((prev) => ({ ...prev, client: e.target.value }))}
        />
        <Input
          placeholder="No. de comprobante"
          allowClear
          style={{ width: 180 }}
          value={filters.invoice_number}
          onChange={(e) => setFilters((prev) => ({ ...prev, invoice_number: e.target.value }))}
        />
        <DatePicker
          placeholder="Fecha inicio"
          value={filters.init_date ? dayjs(filters.init_date) : null}
          onChange={(value) => setFilters((prev) => ({ ...prev, init_date: value ? value.format('YYYY-MM-DD') : '' }))}
        />
        <DatePicker
          placeholder="Fecha fin"
          value={filters.end_date ? dayjs(filters.end_date) : null}
          onChange={(value) => setFilters((prev) => ({ ...prev, end_date: value ? value.format('YYYY-MM-DD') : '' }))}
        />
        {canFilterResponsible ? (
          <Select<number>
            allowClear
            showSearch
            style={{ width: 260 }}
            placeholder="solicitante"
            value={filters.responsible_id}
            onChange={(value) => setFilters((prev) => ({ ...prev, responsible_id: value }))}
            options={users.map((user) => ({
              label: `${fullName(user)} (${user.username})`,
              value: user.id,
            }))}
            optionFilterProp="label"
          />
        ) : null}
        <Button
          type="primary"
          onClick={() => {
            setFilters((prev) => ({ ...prev, page: 1 }));
            loadData();
          }}
        >
          Buscar
        </Button>
      </Space>

      <Table<CheckRequest>
        rowKey="id"
        loading={loading}
        dataSource={data}
        scroll={{ x: 'max-content' }}
        sticky={{ offsetHeader: 64 }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          // Sin liquidación local no hay comprobante ni fila para el Excel.
          getCheckboxProps: (record: any) => ({
            disabled: !!record.liquidated_externally,
          }),
        }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.per_page,
          total: pagination.total,
          onChange: (page, pageSize) => {
            setFilters((prev) => ({ ...prev, page, per_page: pageSize }));
          },
        }}
        columns={[
          { title: 'Request ID', dataIndex: 'request_id', width: 120 },
          { title: 'NT', dataIndex: 'work_note_number', width: 110 },
          { title: 'Cliente', dataIndex: 'client', width: 120 },
          { title: 'Descripción', dataIndex: 'description', width: 260, ellipsis: true },
          {
            title: 'Monto liquidado',
            dataIndex: 'liquidated_amount',
            width: 200,
            render: (_: unknown, record: any) => {
              const liquidated = Number(
                record.liquidated_amount ?? record.total_value ?? 0,
              );
              if (record.liquidated_externally) {
                return (
                  <Space direction="vertical" size={2}>
                    <span>{liquidated.toFixed(2)}</span>
                    <Tooltip title={EXTERNAL_LIQUIDATION_MSG}>
                      <Tag color="purple" style={{ marginInlineEnd: 0 }}>
                        Liquidado en contabilidad / Sirvo
                      </Tag>
                    </Tooltip>
                  </Space>
                );
              }
              if (!record.is_partial_liquidation) {
                return liquidated.toFixed(2);
              }
              const requested = Number(
                record.requested_amount ?? record.total_value ?? 0,
              );
              const remaining = Number(record.remaining_amount ?? 0);
              return (
                <Space direction="vertical" size={2}>
                  <span>{liquidated.toFixed(2)}</span>
                  <Tooltip
                    title={`Monto solicitado: ${requested.toFixed(2)} · Pendiente de liquidar: ${remaining.toFixed(2)}`}
                  >
                    <Tag color="orange" style={{ marginInlineEnd: 0 }}>
                      Parcial · resta {remaining.toFixed(2)}
                    </Tag>
                  </Tooltip>
                </Space>
              );
            },
          },
          {
            title: 'Acciones',
            width: 230,
            fixed: 'right',
            render: (_: unknown, record: any) => {
              if (record.liquidated_externally) {
                return (
                  <Tooltip title={EXTERNAL_LIQUIDATION_MSG}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Sin información en la app
                    </Text>
                  </Tooltip>
                );
              }
              return (
                <Space>
                  {record.liquidation_id && (
                    <Button
                      onClick={async () => {
                        try {
                          const url = await getLiquidationDocumentUrl(record.liquidation_id);
                          window.open(url, '_blank');
                        } catch {
                          message.error('No se pudo obtener el documento');
                        }
                      }}
                    >
                      Ver documento
                    </Button>
                  )}
                  <Button danger onClick={() => handleRevert(record.request_id)}>
                    Revertir
                  </Button>
                </Space>
              );
            },
          },
        ]}
      />
    </Card>
  );
}

export default ChequesLiquidados;
