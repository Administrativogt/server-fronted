import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  message,
  Modal,
  Space,
  Table,
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

const { Title } = Typography;

function ChequesLiquidados() {
  const [data, setData] = useState<CheckRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filters, setFilters] = useState({
    request_id: undefined as number | undefined,
    init_date: '',
    end_date: '',
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
        init_date: filters.init_date || undefined,
        end_date: filters.end_date || undefined,
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
    try {
      await downloadLiquidatedReport({
        init_date: filters.init_date || undefined,
        end_date: filters.end_date || undefined,
      });
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
          <Button onClick={handleDownloadExcel}>
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
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
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
          { title: 'Cliente', dataIndex: 'client' },
          { title: 'Descripción', dataIndex: 'description', ellipsis: true },
          {
            title: 'Monto',
            dataIndex: 'total_value',
            width: 120,
            render: (value) => Number(value).toFixed(2),
          },
          {
            title: 'Acciones',
            width: 220,
            render: (_: unknown, record: any) => (
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
            ),
          },
        ]}
      />
    </Card>
  );
}

export default ChequesLiquidados;
