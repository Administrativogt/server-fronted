import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Modal,
  Input,
  Select,
  DatePicker,
  Switch,
  Form,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  MailOutlined,
  ReloadOutlined,
  RollbackOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { CashReceipt, CashReceiptFilters } from '../../api/cashReceipts';
import cashReceiptsApi from '../../api/cashReceipts';
import { useNavigate } from 'react-router-dom';
import EditarRecibo from './EditarRecibo';

const ListarRecibos: React.FC = () => {
  const [data, setData] = useState<CashReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDeletedView, setIsDeletedView] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState<number>(1);
  const [filterData, setFilterData] = useState('');
  const [initDate, setInitDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterForm] = Form.useForm();

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailToSend, setEmailToSend] = useState('');

  const [editingReciboId, setEditingReciboId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const navigate = useNavigate();

  const buildFilters = (): CashReceiptFilters => {
    const params: CashReceiptFilters = {
      is_active: isDeletedView ? '0' : '1',
    };

    if (filterType === 1 && filterData) {
      params.filter = 1;
      params.data = filterData;
    } else if (filterType === 2 && initDate) {
      params.filter = 2;
      params.data = initDate;
    } else if (filterType === 3 && initDate && endDate) {
      params.filter = 3;
      params.init_date = initDate;
      params.end_date = endDate;
    } else if (filterType === 4 && filterData) {
      params.filter = 4;
      params.data = filterData;
    } else if (filterType === 5 && filterData) {
      params.filter = 5;
      params.data = filterData;
    }

    return params;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await cashReceiptsApi.getAll(buildFilters());
      setData(data);
    } catch {
      message.error('Error al cargar los recibos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: number) => {
    let reason = '';

    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: 'Anular recibo',
        content: (
          <Input.TextArea
            rows={4}
            placeholder="Agregue razón de eliminación"
            onChange={(e) => {
              reason = e.target.value;
            }}
          />
        ),
        okText: 'Anular',
        cancelText: 'Cancelar',
        onOk: () => {
          if (!reason.trim()) {
            message.warning('Debe ingresar una razón de eliminación');
            return Promise.reject();
          }
          resolve(true);
          return Promise.resolve();
        },
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;

    try {
      await cashReceiptsApi.delete(id, reason.trim());
      message.success('Recibo anulado correctamente');
      fetchData();
    } catch {
      message.error('Error al anular recibo');
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await cashReceiptsApi.restore(id);
      message.success('Recibo restaurado correctamente');
      fetchData();
    } catch {
      message.error('Error al restaurar recibo');
    }
  };

  const handleDownloadPdf = async (id: number) => {
    try {
      const response = await cashReceiptsApi.getPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      const stamp = dayjs().format('YYYYMMDD_HHmmss');
      link.href = url;
      link.setAttribute('download', `recibo_${id}_${stamp}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      message.error('Error al generar PDF');
    }
  };

  const handleSendEmail = async (id: number) => {
    let recipient = '';
    Modal.confirm({
      title: 'Enviar recibo por correo',
      content: (
        <Input
          placeholder="Correo del destinatario"
          onChange={(e) => {
            recipient = e.target.value;
          }}
        />
      ),
      okText: 'Enviar',
      cancelText: 'Cancelar',
      onOk: async () => {
        if (!recipient) {
          message.warning('Debe ingresar un correo válido');
          return;
        }
        try {
          await cashReceiptsApi.sendPdfByEmail(id, recipient);
          message.success('Recibo enviado correctamente');
        } catch {
          message.error('Error al enviar el recibo');
        }
      },
    });
  };

  const handleSendMultiple = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Seleccione al menos un recibo');
      return;
    }
    setEmailModalOpen(true);
  };

  const confirmSendMultiple = async () => {
    if (!emailToSend) {
      message.warning('Debe ingresar un correo válido');
      return;
    }

    try {
      await cashReceiptsApi.sendMultiple(
        selectedRowKeys.map((k) => Number(k)),
        emailToSend,
      );
      message.success('Recibos enviados correctamente');
      setSelectedRowKeys([]);
      setEmailToSend('');
      setEmailModalOpen(false);
    } catch {
      message.error('Error al enviar los recibos');
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  const serieToLetter = (serie?: string | number) => {
    const value = Number(serie);
    if (value === 1) return 'A';
    if (value === 2) return 'B';
    if (value === 3) return 'C';
    if (value === 4) return 'D';
    if (value === 5) return 'E';
    return serie ?? '-';
  };

  const applyFilters = () => {
    fetchData();
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setFilterType(1);
    setFilterData('');
    setInitDate('');
    setEndDate('');
    filterForm.resetFields();
    fetchData();
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/dashboard/recibos/crear')}
        >
          Agregar recibo
        </Button>

        <Button
          icon={<ReloadOutlined />}
          onClick={fetchData}
          disabled={loading}
        >
          Actualizar
        </Button>

        <Button
          icon={<MailOutlined />}
          disabled={selectedRowKeys.length === 0}
          onClick={handleSendMultiple}
        >
          Enviar seleccionados
        </Button>

        <Button icon={<FilterOutlined />} onClick={() => setFilterOpen(true)}>
          Filtrar
        </Button>

        <Space>
          <span>Ver anulados</span>
          <Switch
            checked={isDeletedView}
            onChange={(checked) => {
              setIsDeletedView(checked);
              setTimeout(fetchData, 0);
            }}
          />
        </Space>
      </Space>

      <Table<CashReceipt>
        rowKey="id"
        dataSource={data}
        loading={loading}
        rowSelection={rowSelection}
        columns={[
          {
            title: 'Serie',
            dataIndex: 'serie',
            width: 80,
            render: (val: string | number) => serieToLetter(val),
          },
          { title: 'Correlativo', dataIndex: 'correlative', width: 100 },
          { title: 'Recibimos de', dataIndex: 'received_from' },
          { title: 'Concepto', dataIndex: 'concept' },
          {
            title: 'Cantidad',
            dataIndex: 'amount',
            render: (val: number) => `Q. ${Number(val).toLocaleString()}`,
          },
          { title: 'Factura', dataIndex: 'bill_number', width: 120 },
          ...(isDeletedView
            ? [
                {
                  title: 'Razón de anulación',
                  dataIndex: 'delete_reason',
                  render: (val: string) => val || '—',
                },
              ]
            : []),
          {
            title: 'Opciones',
            align: 'center',
            render: (record: CashReceipt) => (
              <Space>
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() =>
                    navigate(`/dashboard/recibos/${record.id ?? ''}`)
                  }
                />
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownloadPdf(record.id!)}
                />
                <Button
                  type="link"
                  icon={<MailOutlined />}
                  onClick={() => handleSendEmail(record.id!)}
                />
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  disabled={record.active === false}
                  onClick={() => {
                    setEditingReciboId(record.id ?? null);
                    setEditOpen(true);
                  }}
                />
                {record.active === false ? (
                  <Tooltip title="Restaurar recibo">
                    <Button
                      type="link"
                      icon={<RollbackOutlined />}
                      onClick={() => handleRestore(record.id!)}
                    />
                  </Tooltip>
                ) : (
                  <Popconfirm
                    title="¿Seguro de anular este recibo?"
                    onConfirm={() => handleDelete(record.id!)}
                  >
                    <Button type="link" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="Filtros de recibos"
        open={filterOpen}
        onCancel={() => setFilterOpen(false)}
        onOk={applyFilters}
        okText="Aplicar"
        cancelText="Cancelar"
        footer={[
          <Button key="clear" onClick={clearFilters}>
            Limpiar
          </Button>,
          <Button key="cancel" onClick={() => setFilterOpen(false)}>
            Cerrar
          </Button>,
          <Button key="ok" type="primary" onClick={applyFilters}>
            Aplicar
          </Button>,
        ]}
      >
        <Form form={filterForm} layout="vertical">
          <Form.Item label="Filtrar por">
            <Select
              value={filterType}
              onChange={(value) => {
                setFilterType(value);
                setFilterData('');
                setInitDate('');
                setEndDate('');
                filterForm.resetFields();
              }}
              options={[
                { label: 'Correlativo', value: 1 },
                { label: 'Fecha', value: 2 },
                { label: 'Rango de fechas', value: 3 },
                { label: 'Usuario (ID)', value: 4 },
                { label: 'Serie', value: 5 },
              ]}
            />
          </Form.Item>

          {(filterType === 1 || filterType === 4 || filterType === 5) && (
            <Form.Item label="Dato">
              <Input
                value={filterData}
                onChange={(e) => setFilterData(e.target.value)}
                placeholder={
                  filterType === 1
                    ? 'Correlativo'
                    : filterType === 4
                    ? 'ID de usuario'
                    : 'Serie (1-5)'
                }
              />
            </Form.Item>
          )}

          {filterType === 2 && (
            <Form.Item label="Fecha">
              <DatePicker
                style={{ width: '100%' }}
                value={initDate ? dayjs(initDate) : null}
                onChange={(date) => setInitDate(date ? date.format('YYYY-MM-DD') : '')}
              />
            </Form.Item>
          )}

          {filterType === 3 && (
            <Space style={{ width: '100%' }}>
              <Form.Item label="Fecha inicio" style={{ width: '100%' }}>
                <DatePicker
                  style={{ width: '100%' }}
                  value={initDate ? dayjs(initDate) : null}
                  onChange={(date) => setInitDate(date ? date.format('YYYY-MM-DD') : '')}
                />
              </Form.Item>
              <Form.Item label="Fecha fin" style={{ width: '100%' }}>
                <DatePicker
                  style={{ width: '100%' }}
                  value={endDate ? dayjs(endDate) : null}
                  onChange={(date) => setEndDate(date ? date.format('YYYY-MM-DD') : '')}
                />
              </Form.Item>
            </Space>
          )}
        </Form>
      </Modal>

      {/* Modal de envío múltiple */}
      <Modal
        title="Enviar recibos seleccionados"
        open={emailModalOpen}
        onCancel={() => setEmailModalOpen(false)}
        onOk={confirmSendMultiple}
        okText="Enviar"
      >
        <p>Ingrese el correo al que desea enviar los recibos seleccionados:</p>
        <Input
          placeholder="ejemplo@dominio.com"
          value={emailToSend}
          onChange={(e) => setEmailToSend(e.target.value)}
        />
      </Modal>

      {/* Modal de edición */}
      <EditarRecibo
        mode="modal"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        reciboId={editingReciboId ?? null}
        onUpdated={fetchData}
      />
    </>
  );
};

export default ListarRecibos;