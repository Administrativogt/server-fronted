import React, { useEffect, useMemo, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Modal,
  Input,
  InputNumber,
  Select,
  AutoComplete,
  DatePicker,
  Switch,
  Form,
  Tooltip,
  Drawer,
  Badge,
  Tag,
  Row,
  Col,
  Typography,
} from 'antd';
import type { TableProps } from 'antd';
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
  SearchOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import type {
  CashReceipt,
  CashReceiptFilterOptions,
  CashReceiptSearchParams,
} from '../../api/cashReceipts';
import cashReceiptsApi from '../../api/cashReceipts';
import { useNavigate } from 'react-router-dom';
import EditarRecibo from './EditarRecibo';

const { RangePicker } = DatePicker;

const serieToLetter = (serie?: string | number) => {
  const value = Number(serie);
  if (value >= 1 && value <= 26) return String.fromCharCode(64 + value);
  return serie ?? '-';
};

const currencyLabel = (c?: number) =>
  c === 2 ? 'Dólares ($)' : c === 3 ? 'Euros (EUR)' : 'Quetzales (Q)';
const currencySymbol = (c?: number) => (c === 2 ? '$' : c === 3 ? 'EUR' : 'Q');

/** Django guardó montos como "2,005.00"; el sistema nuevo como "2005". */
const parseAmount = (val: string | number | undefined | null): number | null => {
  const s = String(val ?? '').replace(/[^0-9.]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const formatAmount = (val: string | number | undefined | null, currency?: number) => {
  const n = parseAmount(val);
  if (n === null) return '—';
  return `${currencySymbol(currency)}. ${n.toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/** Valores del formulario de filtros (los rangos son pares de Dayjs). */
interface FilterFormValues {
  q?: string;
  serie?: number;
  correlative?: number;
  correlative_from?: number;
  correlative_to?: number;
  received_from?: string;
  concept?: string;
  amount?: number;
  amount_min?: number;
  amount_max?: number;
  currency?: number;
  bill_number?: string;
  work_note_number?: string;
  check_number?: string;
  bank?: string;
  // RangePicker entrega [desde, hasta] (cada extremo puede ser null)
  date_range?: (Dayjs | null)[];
  created_range?: (Dayjs | null)[];
  creator_id?: number;
}

type SortField = NonNullable<CashReceiptSearchParams['sort']>;

const ListarRecibos: React.FC = () => {
  const [data, setData] = useState<CashReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDeletedView, setIsDeletedView] = useState(false);

  // Filtros aplicados (los del formulario solo cuentan al pulsar "Aplicar")
  const [filters, setFilters] = useState<FilterFormValues>({});
  const [quickSearch, setQuickSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterForm] = Form.useForm<FilterFormValues>();
  const [options, setOptions] = useState<CashReceiptFilterOptions | null>(null);

  const [sort, setSort] = useState<{ field: SortField; dir: 'asc' | 'desc' }>({
    field: 'id',
    dir: 'desc',
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailToSend, setEmailToSend] = useState('');

  const [editingReciboId, setEditingReciboId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const navigate = useNavigate();

  // Paginación en servidor
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const fmtDate = (d?: Dayjs | null) => (d ? d.format('YYYY-MM-DD') : undefined);

  /** Traduce filtros del formulario + estado a los parámetros del endpoint. */
  const buildParams = (pageOverride?: number): CashReceiptSearchParams => {
    const f = filters;
    const params: CashReceiptSearchParams = {
      is_active: isDeletedView ? '0' : '1',
      page: pageOverride ?? page,
      page_size: pageSize,
      sort: sort.field,
      sort_dir: sort.dir,
    };
    const q = (f.q ?? quickSearch)?.trim();
    if (q) params.q = q;
    if (f.serie) params.serie = f.serie;
    if (f.correlative != null) params.correlative = String(f.correlative);
    if (f.correlative_from != null) params.correlative_from = String(f.correlative_from);
    if (f.correlative_to != null) params.correlative_to = String(f.correlative_to);
    if (f.received_from?.trim()) params.received_from = f.received_from.trim();
    if (f.concept?.trim()) params.concept = f.concept.trim();
    if (f.amount != null) params.amount = f.amount;
    if (f.amount_min != null) params.amount_min = f.amount_min;
    if (f.amount_max != null) params.amount_max = f.amount_max;
    if (f.currency) params.currency = f.currency;
    if (f.bill_number?.trim()) params.bill_number = f.bill_number.trim();
    if (f.work_note_number?.trim()) params.work_note_number = f.work_note_number.trim();
    if (f.check_number?.trim()) params.check_number = f.check_number.trim();
    if (f.bank?.trim()) params.bank = f.bank.trim();
    if (f.date_range?.[0]) params.date_from = fmtDate(f.date_range[0]);
    if (f.date_range?.[1]) params.date_to = fmtDate(f.date_range[1]);
    if (f.created_range?.[0]) params.created_from = fmtDate(f.created_range[0]);
    if (f.created_range?.[1]) params.created_to = fmtDate(f.created_range[1]);
    if (f.creator_id) params.creator_id = f.creator_id;
    return params;
  };

  const fetchData = async (pageOverride?: number) => {
    setLoading(true);
    try {
      const { data } = await cashReceiptsApi.search(buildParams(pageOverride));
      setData(data.items);
      setTotal(data.total);
    } catch {
      message.error('Error al cargar los recibos');
    } finally {
      setLoading(false);
    }
  };

  // Catálogos para los combos (una sola vez)
  useEffect(() => {
    cashReceiptsApi
      .getFilterOptions()
      .then(({ data }) => setOptions(data))
      .catch(() => setOptions(null));
  }, []);

  // Recarga al cambiar página, tamaño, orden, filtros o la vista activos/anulados.
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, isDeletedView, filters, sort]);

  // ---------------------------------------------------------------------------
  // Filtros
  // ---------------------------------------------------------------------------
  const applyFilters = () => {
    const values = filterForm.getFieldsValue();
    setFilters(values);
    setQuickSearch(values.q ?? '');
    setPage(1);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    filterForm.resetFields();
    setFilters({});
    setQuickSearch('');
    setPage(1);
  };

  const applyQuickSearch = (value: string) => {
    const q = value.trim();
    filterForm.setFieldValue('q', q || undefined);
    setFilters((prev) => ({ ...prev, q: q || undefined }));
    setPage(1);
  };

  const removeFilter = (key: keyof FilterFormValues | 'correlative_range' | 'amount_range') => {
    // Sin nulls (el RangePicker vacío deja null y setFieldsValue no lo acepta)
    const next = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v != null),
    ) as FilterFormValues;
    if (key === 'correlative_range') {
      delete next.correlative_from;
      delete next.correlative_to;
    } else if (key === 'amount_range') {
      delete next.amount_min;
      delete next.amount_max;
    } else {
      delete next[key];
    }
    // El formulario debe reflejar exactamente los filtros que quedan.
    filterForm.resetFields();
    filterForm.setFieldsValue(next);
    if (key === 'q') setQuickSearch('');
    setFilters(next);
    setPage(1);
  };

  const creatorLabel = (id?: number) =>
    options?.creators.find((c) => c.id === id)?.label ?? `Usuario ${id}`;

  /** Chips de filtros activos (se muestran sobre la tabla). */
  const activeChips = useMemo(() => {
    const f = filters;
    const chips: { key: Parameters<typeof removeFilter>[0]; label: string }[] = [];
    const fmtRange = (r?: (Dayjs | null)[] | null) =>
      r
        ? `${r[0] ? r[0].format('DD/MM/YYYY') : '…'} – ${r[1] ? r[1].format('DD/MM/YYYY') : '…'}`
        : '';
    if (f.q?.trim()) chips.push({ key: 'q', label: `Buscar: "${f.q.trim()}"` });
    if (f.serie) chips.push({ key: 'serie', label: `Serie ${serieToLetter(f.serie)}` });
    if (f.correlative != null)
      chips.push({ key: 'correlative', label: `Correlativo ${f.correlative}` });
    if (f.correlative_from != null || f.correlative_to != null)
      chips.push({
        key: 'correlative_range',
        label: `Correlativo ${f.correlative_from ?? '…'} – ${f.correlative_to ?? '…'}`,
      });
    if (f.received_from?.trim())
      chips.push({ key: 'received_from', label: `Recibimos de: ${f.received_from.trim()}` });
    if (f.concept?.trim()) chips.push({ key: 'concept', label: `Concepto: ${f.concept.trim()}` });
    if (f.amount != null)
      chips.push({ key: 'amount', label: `Cantidad = ${f.amount.toLocaleString('es-GT')}` });
    if (f.amount_min != null || f.amount_max != null)
      chips.push({
        key: 'amount_range',
        label: `Cantidad ${f.amount_min?.toLocaleString('es-GT') ?? '…'} – ${
          f.amount_max?.toLocaleString('es-GT') ?? '…'
        }`,
      });
    if (f.currency) chips.push({ key: 'currency', label: currencyLabel(f.currency) });
    if (f.bill_number?.trim())
      chips.push({ key: 'bill_number', label: `Factura: ${f.bill_number.trim()}` });
    if (f.work_note_number?.trim())
      chips.push({ key: 'work_note_number', label: `NT: ${f.work_note_number.trim()}` });
    if (f.check_number?.trim())
      chips.push({ key: 'check_number', label: `Cheque: ${f.check_number.trim()}` });
    if (f.bank?.trim()) chips.push({ key: 'bank', label: `Banco: ${f.bank.trim()}` });
    if (f.date_range && (f.date_range[0] || f.date_range[1]))
      chips.push({ key: 'date_range', label: `Fecha recibo ${fmtRange(f.date_range)}` });
    if (f.created_range && (f.created_range[0] || f.created_range[1]))
      chips.push({ key: 'created_range', label: `Registrado ${fmtRange(f.created_range)}` });
    if (f.creator_id) chips.push({ key: 'creator_id', label: `Usuario: ${creatorLabel(f.creator_id)}` });
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, options]);

  // ---------------------------------------------------------------------------
  // Acciones por recibo
  // ---------------------------------------------------------------------------
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
    preserveSelectedRowKeys: true, // conservar selección al cambiar de página
  };

  // ---------------------------------------------------------------------------
  // Tabla: paginación + orden en servidor
  // ---------------------------------------------------------------------------
  const sortOrderFor = (field: SortField) =>
    sort.field === field ? (sort.dir === 'asc' ? 'ascend' : 'descend') : null;

  const handleTableChange: TableProps<CashReceipt>['onChange'] = (
    pagination,
    _filters,
    sorter,
  ) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const field = (s?.columnKey as SortField | undefined) ?? undefined;
    if (field && s?.order) {
      const dir = s.order === 'ascend' ? 'asc' : 'desc';
      if (field !== sort.field || dir !== sort.dir) {
        setSort({ field, dir });
        setPage(1);
        return;
      }
    } else if (!s?.order && sort.field !== 'id') {
      setSort({ field: 'id', dir: 'desc' });
      setPage(1);
      return;
    }
    const ps = pagination.pageSize ?? pageSize;
    if (ps !== pageSize) {
      setPageSize(ps);
      setPage(1);
    } else {
      setPage(pagination.current ?? 1);
    }
  };

  const serieOptions =
    options?.series.map((s) => ({
      value: s.serie,
      label: `${s.letter}  ·  ${s.count.toLocaleString('es-GT')} recibos`,
    })) ?? [1, 2, 3, 4, 5].map((v) => ({ value: v, label: serieToLetter(v) }));

  const currencyOptions =
    options?.currencies.map((c) => ({ value: c.currency, label: currencyLabel(c.currency) })) ??
    [1, 2, 3].map((v) => ({ value: v, label: currencyLabel(v) }));

  const showCreatorFilter = !!options?.can_view_all && (options?.creators.length ?? 0) > 0;

  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/dashboard/recibos/crear')}
        >
          Agregar recibo
        </Button>

        <Button icon={<ReloadOutlined />} onClick={() => fetchData()} disabled={loading}>
          Actualizar
        </Button>

        <Button
          icon={<MailOutlined />}
          disabled={selectedRowKeys.length === 0}
          onClick={handleSendMultiple}
        >
          Enviar seleccionados
        </Button>

        <Badge count={activeChips.length} size="small" offset={[-4, 4]}>
          <Button icon={<FilterOutlined />} onClick={() => setFilterOpen(true)}>
            Filtrar
          </Button>
        </Badge>

        <Input.Search
          allowClear
          placeholder="Buscar: nombre, concepto, factura, NT, correlativo o cheque"
          style={{ width: 380 }}
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          onSearch={applyQuickSearch}
          enterButton={<SearchOutlined />}
        />

        <Space>
          <span>Ver anulados</span>
          <Switch
            checked={isDeletedView}
            onChange={(checked) => {
              setIsDeletedView(checked);
              setPage(1); // el useEffect recarga con la vista nueva
            }}
          />
        </Space>
      </Space>

      {activeChips.length > 0 && (
        <Space style={{ marginBottom: 12 }} wrap>
          <Typography.Text type="secondary">Filtros:</Typography.Text>
          {activeChips.map((chip) => (
            <Tag
              key={chip.key}
              closable
              color="blue"
              onClose={(e) => {
                e.preventDefault();
                removeFilter(chip.key);
              }}
            >
              {chip.label}
            </Tag>
          ))}
          <Button type="link" size="small" onClick={clearFilters}>
            Limpiar todo
          </Button>
        </Space>
      )}

      <Table<CashReceipt>
        rowKey="id"
        dataSource={data}
        loading={loading}
        rowSelection={rowSelection}
        onChange={handleTableChange}
        columns={[
          {
            title: 'Serie',
            dataIndex: 'serie',
            key: 'correlative',
            width: 80,
            sorter: true,
            sortOrder: sortOrderFor('correlative'),
            render: (val: string | number) => serieToLetter(val),
          },
          {
            title: 'Correlativo',
            dataIndex: 'correlative',
            key: 'correlative_number',
            width: 110,
          },
          {
            title: 'Fecha',
            dataIndex: 'date',
            key: 'date',
            width: 110,
            sorter: true,
            sortOrder: sortOrderFor('date'),
            render: (val: string) => (val ? dayjs(String(val).slice(0, 10)).format('DD/MM/YYYY') : '—'),
          },
          {
            title: 'Recibimos de',
            dataIndex: 'received_from',
            key: 'received_from',
            sorter: true,
            sortOrder: sortOrderFor('received_from'),
          },
          {
            title: 'Concepto',
            dataIndex: 'concept',
            key: 'concept',
            sorter: true,
            sortOrder: sortOrderFor('concept'),
          },
          {
            title: 'Cantidad',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            width: 140,
            sorter: true,
            sortOrder: sortOrderFor('amount'),
            render: (val: string | number, record: CashReceipt) =>
              formatAmount(val, record.currency),
          },
          { title: 'Factura', dataIndex: 'bill_number', width: 130 },
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
                  onClick={() => navigate(`/dashboard/recibos/${record.id ?? ''}`)}
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
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [20, 50, 100, 200],
          showTotal: (t, range) => `${range[0]}-${range[1]} de ${t.toLocaleString('es-GT')} recibos`,
        }}
      />

      {/* Panel de filtros combinables */}
      <Drawer
        title="Filtros de recibos"
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        width={520}
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={clearFilters}>Limpiar</Button>
            <Button onClick={() => setFilterOpen(false)}>Cerrar</Button>
            <Button type="primary" onClick={applyFilters}>
              Aplicar
            </Button>
          </Space>
        }
      >
        <Form form={filterForm} layout="vertical" onFinish={applyFilters}>
          <Form.Item name="q" label="Búsqueda general">
            <Input
              allowClear
              placeholder="Nombre, concepto, factura, nota de trabajo, correlativo o No. de cheque"
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="serie" label="Serie">
                <Select allowClear placeholder="Todas" options={serieOptions} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="correlative" label="Correlativo exacto">
                <InputNumber style={{ width: '100%' }} min={1} placeholder="Ej. 25575" controls={false} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="correlative_from" label="Correlativo desde">
                <InputNumber style={{ width: '100%' }} min={1} controls={false} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="correlative_to" label="Correlativo hasta">
                <InputNumber style={{ width: '100%' }} min={1} controls={false} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="received_from" label="Recibimos de">
            <Input allowClear placeholder="Contiene… (no distingue acentos ni mayúsculas)" />
          </Form.Item>

          <Form.Item name="concept" label="Concepto">
            <AutoComplete
              allowClear
              placeholder="Contiene… (elija uno frecuente o escriba)"
              options={options?.concepts.map((c) => ({
                value: c.value,
                label: `${c.value}  ·  ${c.count.toLocaleString('es-GT')}`,
              }))}
              filterOption={(input, opt) =>
                String(opt?.value ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="amount" label="Cantidad exacta">
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} controls={false} placeholder="2005" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="amount_min" label="Cantidad mínima">
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} controls={false} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="amount_max" label="Cantidad máxima">
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} controls={false} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="currency" label="Moneda">
                <Select allowClear placeholder="Todas" options={currencyOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bill_number" label="Factura">
                <Input allowClear placeholder="Contiene…" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="work_note_number" label="Nota de trabajo">
                <Input allowClear placeholder="Contiene…" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="check_number" label="No. de cheque / documento">
                <Input allowClear placeholder="Contiene…" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bank" label="Banco">
                <AutoComplete
                  allowClear
                  placeholder="Contiene…"
                  options={options?.banks.map((b) => ({
                    value: b.value,
                    label: `${b.value}  ·  ${b.count.toLocaleString('es-GT')}`,
                  }))}
                  filterOption={(input, opt) =>
                    String(opt?.value ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="date_range" label="Fecha del recibo">
            <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" allowEmpty={[true, true]} />
          </Form.Item>

          <Form.Item name="created_range" label="Fecha de registro en el sistema">
            <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" allowEmpty={[true, true]} />
          </Form.Item>

          {showCreatorFilter && (
            <Form.Item name="creator_id" label="Usuario que lo registró">
              <Select
                allowClear
                showSearch
                placeholder="Todos"
                optionFilterProp="label"
                options={options?.creators.map((c) => ({
                  value: c.id,
                  label: `${c.label} (${c.username})  ·  ${c.count.toLocaleString('es-GT')}`,
                }))}
              />
            </Form.Item>
          )}
        </Form>
      </Drawer>

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
