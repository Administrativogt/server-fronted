import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  AutoComplete,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  theme,
  Tooltip,
  Typography,
  type InputRef,
} from 'antd';
import {
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  RollbackOutlined,
  StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  createNotaGasto,
  deactivateNotaGasto,
  listNotasGastos,
  NOTA_GASTO_AREAS,
  updateNotaGasto,
  type NotaGasto,
  type NotaGastoArea,
  type NotaGastoPayload,
  type NotaGastoUser,
} from '../../api/notasGastos';
import './notas-gastos.css';

const { Title, Text } = Typography;

type AreaTab = NotaGastoArea | 'TODAS';
type ModalState = { mode: 'create'; nombre?: string; nt?: number } | { mode: 'edit'; nota: NotaGasto } | null;
type Filters = { tab: AreaTab; search: string; cliente?: string; soloSinNt: boolean };

const areaLabel = (a: NotaGastoArea) => NOTA_GASTO_AREAS.find((x) => x.value === a)?.label ?? a;
const areaColor: Record<NotaGastoArea, string> = {
  MIGRACION: 'blue',
  PENAL: 'volcano',
  LABORAL: 'green',
};
const userName = (u: NotaGastoUser | null) =>
  u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.username : '—';

const apiError = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

const matches = (n: NotaGasto, f: Filters) => {
  if (f.tab !== 'TODAS' && n.area !== f.tab) return false;
  if (f.cliente && n.cliente !== f.cliente) return false;
  if (f.soloSinNt && n.nt != null) return false;
  const q = normalize(f.search.trim());
  return !q || normalize(`${n.cliente} ${n.caso ?? ''} ${n.nombre} ${n.nt ?? ''}`).includes(q);
};

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/** Resalta la búsqueda sin distinguir acentos ni mayúsculas. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = normalize(query.trim());
  if (!q) return <>{text}</>;
  // Comparación carácter a carácter: "Á" → "A" conserva la longitud y por eso
  // los índices del texto normalizado sirven sobre el original.
  const norm = [...text].map((c) => normalize(c).charAt(0) || c).join('');
  const parts: ReactNode[] = [];
  let from = 0;
  let idx = norm.indexOf(q);
  while (idx !== -1) {
    if (idx > from) parts.push(text.slice(from, idx));
    parts.push(
      <mark key={idx} className="ng-mark">
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    from = idx + q.length;
    idx = norm.indexOf(q, from);
  }
  if (!parts.length) return <>{text}</>;
  parts.push(text.slice(from));
  return <>{parts}</>;
}

/** NT editable en la misma celda: clic → escribir → Enter guarda, Esc cancela. */
function NtCell({
  nota,
  query,
  editing,
  onStartEdit,
  onCancel,
  onSave,
  onCopied,
}: {
  nota: NotaGasto;
  query: string;
  editing: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: (nt: number | null) => Promise<boolean>;
  onCopied: () => void;
}) {
  const [value, setValue] = useState<number | null>(nota.nt);
  const [saving, setSaving] = useState(false);
  // Enter guarda y luego el blur del desmontaje vuelve a llamar: un ref corta el doble envío
  const busy = useRef(false);

  useEffect(() => {
    if (editing) setValue(nota.nt);
  }, [editing, nota.nt]);

  const commit = async () => {
    if (busy.current) return;
    if (value === nota.nt) return onCancel();
    busy.current = true;
    setSaving(true);
    await onSave(value ?? null); // si falla se queda editando para corregir
    busy.current = false;
    setSaving(false);
  };

  if (editing) {
    return (
      <InputNumber
        autoFocus
        size="small"
        min={1}
        precision={0}
        controls={false}
        value={value}
        disabled={saving}
        placeholder="NT"
        style={{ width: 110 }}
        onChange={(v) => setValue(v)}
        onPressEnter={commit}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onCancel();
          }
        }}
      />
    );
  }

  if (nota.nt == null) {
    return nota.activo ? (
      <button type="button" className="ng-nt ng-nt-empty" onClick={onStartEdit}>
        <PlusOutlined style={{ fontSize: 11 }} /> Asignar NT
      </button>
    ) : (
      <Text type="secondary">Sin NT</Text>
    );
  }

  return (
    <Space size={2}>
      <Tooltip title="Clic para cambiar el NT" mouseEnterDelay={0.6}>
        <button
          type="button"
          className="ng-nt"
          onClick={onStartEdit}
          aria-label={`NT ${nota.nt}, clic para editar`}
        >
          <Highlight text={String(nota.nt)} query={query} />
          <EditOutlined className="ng-nt-pencil" />
        </button>
      </Tooltip>
      <Text copyable={{ text: String(nota.nt), tooltips: ['Copiar NT', 'Copiado'], onCopy: onCopied }} />
    </Space>
  );
}

// Catálogo de NT por caso para cargar gastos e impresiones. Reemplaza el Excel
// "NOTAS GASTOS E IMPRESIONES" que llevaban a mano por área.
function NotasGastos() {
  const { token } = theme.useToken();
  const [notas, setNotas] = useState<NotaGasto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<Filters>({ tab: 'TODAS', search: '', soloSinNt: false });
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [editingNtId, setEditingNtId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);
  const searchRef = useRef<InputRef>(null);
  const [form] = Form.useForm<NotaGastoPayload>();
  const { tab, search, cliente, soloSinNt } = filters;
  const patchFilters = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));

  const load = useCallback(async (inactive: boolean) => {
    setLoading(true);
    try {
      setNotas(await listNotasGastos(inactive));
    } catch (err) {
      message.error(apiError(err, 'No se pudieron cargar las notas'));
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load(showInactive);
  }, [load, showInactive]);

  // "/" enfoca la búsqueda, como en el resto de herramientas del día a día
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !isTyping(e.target) && !modal) {
        e.preventDefault();
        searchRef.current?.focus({ cursor: 'all' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const flash = (id: number) => {
    window.clearTimeout(flashTimer.current);
    setFlashId(null);
    // un frame después para que la animación reinicie si es la misma fila
    requestAnimationFrame(() => setFlashId(id));
    flashTimer.current = window.setTimeout(() => setFlashId(null), 1500);
  };

  /** Reemplaza (o agrega) la nota sin recargar toda la lista. */
  const upsert = (nota: NotaGasto) =>
    setNotas((list) => {
      const visible = nota.activo || showInactive;
      const exists = list.some((n) => n.id === nota.id);
      if (!visible) return list.filter((n) => n.id !== nota.id);
      return exists ? list.map((n) => (n.id === nota.id ? nota : n)) : [nota, ...list];
    });

  /** Si la nota quedó escondida por los filtros, los ajusta para mostrarla. */
  const reveal = (nota: NotaGasto) => {
    if (matches(nota, filters)) return;
    setFilters((f) => ({
      tab: f.tab === 'TODAS' || f.tab === nota.area ? f.tab : nota.area,
      search: '',
      cliente: f.cliente === nota.cliente ? f.cliente : undefined,
      soloSinNt: f.soloSinNt && nota.nt == null,
    }));
  };

  const byArea = useMemo(
    () => (tab === 'TODAS' ? notas : notas.filter((n) => n.area === tab)),
    [notas, tab],
  );

  const clienteOptions = useMemo(
    () =>
      [...new Set(byArea.map((n) => n.cliente))]
        .sort((a, b) => a.localeCompare(b))
        .map((c) => ({ value: c, label: c })),
    [byArea],
  );

  const allClientes = useMemo(
    () => [...new Set(notas.map((n) => n.cliente))].sort((a, b) => a.localeCompare(b)).map((c) => ({ value: c })),
    [notas],
  );

  const filtered = useMemo(() => notas.filter((n) => matches(n, filters)), [notas, filters]);

  const countFor = (a: AreaTab) =>
    a === 'TODAS' ? notas.length : notas.filter((n) => n.area === a).length;
  const sinNtCount = byArea.filter((n) => n.nt == null && n.activo).length;
  const hasFilters = !!search.trim() || !!cliente || soloSinNt;

  const openModal = (state: ModalState) => {
    setModal(state);
    if (state?.mode === 'edit') {
      const { area, cliente: c, caso, nombre, nt, observaciones } = state.nota;
      form.setFieldsValue({ area, cliente: c, caso, nombre, nt, observaciones });
    } else {
      form.setFieldsValue({
        area: tab === 'TODAS' ? undefined : tab,
        cliente,
        caso: null,
        nombre: state?.nombre ?? '',
        nt: state?.nt ?? null,
        observaciones: '',
      });
    }
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const payload: NotaGastoPayload = {
      ...values,
      cliente: values.cliente.replace(/\s+/g, ' ').trim().toUpperCase(),
      caso: values.caso?.trim() || null,
      nt: values.nt ?? null,
      observaciones: values.observaciones ?? '',
    };
    setSaving(true);
    try {
      const saved =
        modal?.mode === 'edit'
          ? await updateNotaGasto(modal.nota.id, payload)
          : await createNotaGasto(payload);
      message.success(modal?.mode === 'edit' ? 'Nota actualizada' : `Nota registrada en ${areaLabel(saved.area)}`);
      setModal(null);
      upsert(saved);
      reveal(saved);
      flash(saved.id);
    } catch (err) {
      message.error(apiError(err, 'No se pudo guardar la nota'));
    } finally {
      setSaving(false);
    }
  };

  const saveNt = async (n: NotaGasto, nt: number | null): Promise<boolean> => {
    try {
      const saved = await updateNotaGasto(n.id, { nt });
      upsert(saved);
      setEditingNtId(null);
      flash(saved.id);
      message.success(nt == null ? 'NT quitado' : n.nt == null ? `NT ${nt} asignado` : `NT cambiado a ${nt}`);
      return true;
    } catch (err) {
      message.error(apiError(err, 'No se pudo guardar el NT'));
      return false;
    }
  };

  const setActivo = async (n: NotaGasto, activo: boolean) => {
    try {
      const saved = activo ? await updateNotaGasto(n.id, { activo: true }) : await deactivateNotaGasto(n.id);
      upsert(saved);
      return saved;
    } catch (err) {
      message.error(apiError(err, activo ? 'No se pudo reactivar la nota' : 'No se pudo dar de baja la nota'));
      return null;
    }
  };

  // Sin confirmación previa: se da de baja al instante y se ofrece deshacer.
  const handleDeactivate = async (n: NotaGasto) => {
    const saved = await setActivo(n, false);
    if (!saved) return;
    const key = `baja-${n.id}`;
    message.open({
      key,
      type: 'info',
      duration: 6,
      content: (
        <Space>
          <span>
            {n.nt ? `NT ${n.nt}` : 'Nota'} dada de baja
          </span>
          <Button
            type="link"
            size="small"
            style={{ padding: 0 }}
            onClick={async () => {
              message.destroy(key);
              const back = await setActivo(saved, true);
              if (back) flash(back.id);
            }}
          >
            Deshacer
          </Button>
        </Space>
      ),
    });
  };

  const handleReactivate = async (n: NotaGasto) => {
    const saved = await setActivo(n, true);
    if (saved) {
      flash(saved.id);
      message.success(`${n.nt ? `NT ${n.nt}` : 'Nota'} reactivada`);
    }
  };

  // Mismo formato que el Excel original: una hoja por área.
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const areas = tab === 'TODAS' ? NOTA_GASTO_AREAS.map((a) => a.value) : [tab];
    for (const area of areas) {
      const ws = wb.addWorksheet(areaLabel(area).toUpperCase());
      ws.columns = [
        { header: 'CLIENTE', key: 'cliente', width: 34 },
        ...(area === 'MIGRACION' ? [{ header: 'CASO', key: 'caso', width: 12 }] : []),
        { header: 'NOMBRE', key: 'nombre', width: 70 },
        { header: 'NT', key: 'nt', width: 12 },
        { header: 'OBSERVACIONES', key: 'observaciones', width: 30 },
        ...(showInactive ? [{ header: 'ESTADO', key: 'estado', width: 12 }] : []),
      ];
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFC9ED' } };
      filtered
        .filter((n) => n.area === area)
        .forEach((n) =>
          ws.addRow({
            ...n,
            caso: n.caso ?? '',
            nt: n.nt ?? '',
            estado: n.activo ? 'Activa' : 'De baja',
          }),
        );
      ws.views = [{ state: 'frozen', ySplit: 1 }];
    }
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `notas-gastos-impresiones-${dayjs().format('YYYY-MM-DD')}.xlsx`,
    );
  };

  const cssVars = {
    '--ng-flash': token.colorPrimaryBgHover,
    '--ng-mark': token.colorWarningBgHover,
    '--ng-primary': token.colorPrimary,
    '--ng-border': token.colorBorder,
    '--ng-subtle': token.colorFillQuaternary,
    '--ng-muted': token.colorTextSecondary,
    '--ng-warning': token.colorWarningText,
    '--ng-warning-border': token.colorWarningBorder,
    '--ng-warning-bg': token.colorWarningBg,
  } as CSSProperties;

  const emptyState = hasFilters ? (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        search.trim() ? (
          <span>
            Ninguna nota coincide con <Text strong>«{search.trim()}»</Text>
            {cliente ? ` en ${cliente}` : ''}.
          </span>
        ) : (
          'Ninguna nota coincide con los filtros.'
        )
      }
    >
      <Space>
        <Button onClick={() => patchFilters({ search: '', cliente: undefined, soloSinNt: false })}>
          Quitar filtros
        </Button>
        {search.trim() && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              const q = search.trim();
              // Un número buscado es casi siempre un NT, no un nombre
              openModal(/^\d+$/.test(q) ? { mode: 'create', nt: Number(q) } : { mode: 'create', nombre: q.toUpperCase() });
            }}
          >
            {/^\d+$/.test(search.trim()) ? `Registrar NT ${search.trim()}` : `Registrar «${search.trim()}»`}
          </Button>
        )}
      </Space>
    </Empty>
  ) : (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        tab === 'TODAS'
          ? 'Todavía no hay notas registradas.'
          : `Todavía no hay notas de ${areaLabel(tab)}.`
      }
    >
      <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal({ mode: 'create' })}>
        Registrar la primera
      </Button>
    </Empty>
  );

  return (
    <div className="ng-page" style={{ padding: 24, ...cssVars }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Notas de gastos e impresiones
          </Title>
          <Text type="secondary">A qué NT se cargan los gastos e impresiones de cada caso.</Text>
        </div>
        <Space wrap>
          <Tooltip title="Volver a cargar">
            <Button icon={<ReloadOutlined />} onClick={() => load(showInactive)} loading={loading && loaded} />
          </Tooltip>
          <Button icon={<DownloadOutlined />} onClick={exportExcel} disabled={!filtered.length}>
            Descargar Excel
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal({ mode: 'create' })}>
            Nueva nota
          </Button>
        </Space>
      </Space>

      <Card size="small">
        <Tabs
          activeKey={tab}
          onChange={(k) => patchFilters({ tab: k as AreaTab, cliente: undefined })}
          items={[
            { key: 'TODAS', label: `Todas (${countFor('TODAS')})` },
            ...NOTA_GASTO_AREAS.map((a) => ({
              key: a.value,
              label: `${a.label} (${countFor(a.value)})`,
            })),
          ]}
        />
        <Space wrap style={{ marginBottom: 12 }} align="center">
          <Input.Search
            ref={searchRef}
            allowClear
            value={search}
            placeholder="Buscar cliente, caso, nombre o NT"
            suffix={!search && <span className="ng-kbd" title="Atajo: tecla /">/</span>}
            style={{ width: 360 }}
            onChange={(e) => patchFilters({ search: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape') patchFilters({ search: '' });
            }}
          />
          <Select
            allowClear
            showSearch
            placeholder="Cliente"
            style={{ width: 260 }}
            value={cliente}
            onChange={(v) => patchFilters({ cliente: v })}
            options={clienteOptions}
          />
          {(sinNtCount > 0 || soloSinNt) && (
            <Tag.CheckableTag
              checked={soloSinNt}
              onChange={(v) => patchFilters({ soloSinNt: v })}
              style={{
                border: `1px solid ${soloSinNt ? token.colorWarning : token.colorWarningBorder}`,
                background: soloSinNt ? token.colorWarning : token.colorWarningBg,
                color: soloSinNt ? token.colorWhite : token.colorWarningText,
                padding: '2px 10px',
                margin: 0,
              }}
            >
              {sinNtCount} sin NT{soloSinNt ? ' ✕' : ''}
            </Tag.CheckableTag>
          )}
          <Space size={6}>
            <Switch checked={showInactive} onChange={setShowInactive} size="small" id="ng-inactivas" />
            <label htmlFor="ng-inactivas">
              <Text>Mostrar dadas de baja</Text>
            </label>
          </Space>
          {hasFilters && filtered.length > 0 && (
            <Text type="secondary">
              {filtered.length} de {byArea.length}
            </Text>
          )}
        </Space>

        {!loaded ? (
          <div aria-busy="true" aria-label="Cargando notas">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton.Input key={i} active block style={{ height: 36, marginBottom: 10 }} />
            ))}
          </div>
        ) : (
          <Table<NotaGasto>
            rowKey="id"
            size="middle"
            dataSource={filtered}
            locale={{ emptyText: emptyState }}
            pagination={{ pageSize: 50, hideOnSinglePage: true, showTotal: (t) => `${t} notas` }}
            rowClassName={(n) => (n.id === flashId ? 'ng-row-flash' : '')}
            scroll={{ x: 900 }}
            onRow={(n) => ({
              onDoubleClick: (e) => {
                if (!isTyping(e.target)) openModal({ mode: 'edit', nota: n });
              },
            })}
            columns={[
              ...(tab === 'TODAS'
                ? [
                    {
                      title: 'Área',
                      dataIndex: 'area',
                      width: 104,
                      render: (a: NotaGastoArea) => (
                        <Tooltip title={`Ver solo ${areaLabel(a)}`} mouseEnterDelay={0.5}>
                          <Tag
                            color={areaColor[a]}
                            style={{ cursor: 'pointer' }}
                            onClick={() => patchFilters({ tab: a, cliente: undefined })}
                          >
                            {areaLabel(a)}
                          </Tag>
                        </Tooltip>
                      ),
                    },
                  ]
                : []),
              {
                title: 'Cliente',
                dataIndex: 'cliente',
                width: 200,
                sorter: (a, b) => a.cliente.localeCompare(b.cliente),
                render: (v: string) =>
                  cliente === v ? (
                    <Highlight text={v} query={search} />
                  ) : (
                    <Tooltip title="Filtrar por este cliente" mouseEnterDelay={0.5}>
                      <button type="button" className="ng-link" onClick={() => patchFilters({ cliente: v })}>
                        <Highlight text={v} query={search} />
                      </button>
                    </Tooltip>
                  ),
              },
              ...(tab === 'TODAS' || tab === 'MIGRACION'
                ? [
                    {
                      title: 'Caso',
                      dataIndex: 'caso',
                      width: 88,
                      render: (v: string | null) => (v ? <Highlight text={v} query={search} /> : '—'),
                    },
                  ]
                : []),
              {
                title: 'Nombre',
                dataIndex: 'nombre',
                sorter: (a, b) => a.nombre.localeCompare(b.nombre),
                render: (v: string, n) => (
                  <Space direction="vertical" size={0}>
                    <span style={n.activo ? undefined : { textDecoration: 'line-through', opacity: 0.6 }}>
                      <Highlight text={v} query={search} />
                    </span>
                    {n.observaciones && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {n.observaciones}
                      </Text>
                    )}
                  </Space>
                ),
              },
              {
                title: 'NT',
                dataIndex: 'nt',
                width: 150,
                sorter: (a, b) => (a.nt ?? 0) - (b.nt ?? 0),
                render: (_: number | null, n) => (
                  <NtCell
                    nota={n}
                    query={search}
                    editing={editingNtId === n.id}
                    onStartEdit={() => setEditingNtId(n.id)}
                    onCancel={() => setEditingNtId(null)}
                    onSave={(nt) => saveNt(n, nt)}
                    onCopied={() => flash(n.id)}
                  />
                ),
              },
              {
                title: 'Creado por',
                key: 'creator',
                width: 140,
                render: (_, n) =>
                  n.creator ? (
                    <Tooltip
                      title={`${dayjs(n.created_at).format('DD/MM/YYYY HH:mm')}${n.updated_by && n.updated_by.id !== n.creator.id ? ` · última edición: ${userName(n.updated_by)}` : ''}`}
                    >
                      {userName(n.creator)}
                    </Tooltip>
                  ) : (
                    <Tooltip
                      title={
                        n.updated_by
                          ? `Migrado del Excel · última edición: ${userName(n.updated_by)}`
                          : 'Migrado del Excel'
                      }
                    >
                      <Text type="secondary">Excel</Text>
                    </Tooltip>
                  ),
              },
              {
                title: '',
                key: 'actions',
                align: 'right',
                width: 88,
                render: (_, n) => (
                  <Space className="ng-actions">
                    <Tooltip title="Editar (o doble clic en la fila)">
                      <Button
                        icon={<EditOutlined />}
                        size="small"
                        aria-label="Editar"
                        onClick={() => openModal({ mode: 'edit', nota: n })}
                      />
                    </Tooltip>
                    {n.activo ? (
                      <Tooltip title="Dar de baja">
                        <Button
                          icon={<StopOutlined />}
                          size="small"
                          danger
                          aria-label="Dar de baja"
                          onClick={() => handleDeactivate(n)}
                        />
                      </Tooltip>
                    ) : (
                      <Tooltip title="Reactivar">
                        <Button
                          icon={<RollbackOutlined />}
                          size="small"
                          aria-label="Reactivar"
                          onClick={() => handleReactivate(n)}
                        />
                      </Tooltip>
                    )}
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        open={modal !== null}
        title={modal?.mode === 'edit' ? 'Editar nota' : 'Nueva nota'}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={saving}
        onOk={handleSave}
        onCancel={() => setModal(null)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="area" label="Área" rules={[{ required: true, message: 'Seleccione el área' }]}>
            <Select options={NOTA_GASTO_AREAS} placeholder="Área" />
          </Form.Item>
          <Form.Item
            name="cliente"
            label="Cliente"
            rules={[{ required: true, whitespace: true, message: 'Ingrese el cliente' }]}
          >
            <AutoComplete
              allowClear
              placeholder="Escriba o elija un cliente existente"
              options={allClientes}
              filterOption={(input, opt) => normalize(String(opt?.value ?? '')).includes(normalize(input))}
            />
          </Form.Item>
          <Form.Item name="caso" label="Caso" extra="Número de caso (opcional, lo usa Migración).">
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, whitespace: true, message: 'Ingrese el nombre del caso' }]}
          >
            <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} placeholder="p. ej. RESIDENCIA TEMPORAL JUAN PÉREZ" />
          </Form.Item>
          <Form.Item name="nt" label="NT" extra="Número de nota de trabajo. Déjelo vacío si aún no lo tiene.">
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default NotasGastos;
