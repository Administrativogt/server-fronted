// src/pages/reservaciones/ReservationsList.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button, Modal, Select, Space, Table, Tag, Typography, message,
  notification, Tooltip, Switch, Form, DatePicker, TimePicker,
  Input, InputNumber, Checkbox
} from 'antd';
import {
  EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, ReloadOutlined, DownloadOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';
import api from '../../api/axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
const { Title } = Typography;
const { TextArea } = Input;

type StateFilter = 'all' | 'pending' | 'accepted' | 'rejected';

type Reservation = {
  id: number;
  state: 0 | 1 | 2;
  meeting_type: number;
  reservation_date: string; // YYYY-MM-DD
  init_hour: string;        // HH:mm or HH:mm:ss
  end_hour: string;         // HH:mm or HH:mm:ss
  reason: string;
  participants: number;
  room_id: number;
  request_user_id: number;
  user?: { id: number; first_name: string; last_name: string };
  room?: { id: number; name: string };
  is_shared_cost: boolean;
  shared_with: number[] | null;
  use_computer?: boolean;
  user_projector?: boolean;
};

type Partner = { id: number; full_name: string };
type Room = { id: number; name: string; price_per_hour: string | null };

// ---- Para el reporte ----
type ReportRow = {
  id: number;
  fecha: string;                 // 'YYYY-MM-DD'
  sala: string;
  usuario: string;
  area: string | null;
  equipo: string | null;
  hora_inicio: string;           // 'HH:mm:ss'
  hora_fin: string;              // 'HH:mm:ss'
  duracion_horas: number;        // horas decimales
  price_per_hour: number;        // USD
  total_reserva: number;         // USD
  is_shared_cost: boolean;
  cantidad_personas: number;     // incluye solicitante
  pago_por_persona: number;      // USD
  shared_with?: number[] | null;
  compartido_con?: string[];
  state?: 0 | 1 | 2;      // NUEVO
  estado?: string;  
};

const stateLabel = (s: 0|1|2) => (s === 0 ? 'Pendiente' : s === 1 ? 'Aceptada' : 'Rechazada');
const stateColor  = (s: 0|1|2) => (s === 0 ? 'gold'     : s === 1 ? 'green'   : 'red');
const fmtTime = (t?: string) => (t ? t.slice(0, 5) : '');

export default function ReservationsList() {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');

  const [partners, setPartners] = useState<Partner[]>([]);
  const partnersMap = useMemo(() => new Map(partners.map(p => [p.id, p.full_name])), [partners]);

  const [canApprove, setCanApprove] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [me, setMe] = useState<{ id: number; full_name: string } | null>(null);

  // Edit modal
  const [editVisible, setEditVisible] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editForm] = Form.useForm<{
    reservation_date: Dayjs;
    init_hour: Dayjs;
    end_hour: Dayjs;
    room_id: number;
    reason: string;
    participants: number;
    use_computer?: boolean;
    user_projector?: boolean;
  }>();

  // Reject modal
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectRow, setRejectRow] = useState<Reservation | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Delete modal
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteRow, setDeleteRow] = useState<Reservation | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // ---- Filtro de mes para reporte + spinner de descarga ----
  const [reportMonth, setReportMonth] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`; // YYYY-MM
  });
  const [downloading, setDownloading] = useState(false);

const loadData = async () => {
  setLoading(true);
  try {
    // 1) Permisos y usuario actual (en paralelo lo que se pueda)
    const [shareRes, approveRes, partnersRes] = await Promise.all([
      api.get<{ canShare: boolean; user: { id: number; full_name: string } }>('/room-reservations/share/can'),
      api.get<{ canApprove: boolean; isSuperuser: boolean }>('/room-reservations/approve/can'),
      api.get<Partner[]>('/room-reservations/team/users'),
    ]);

    // 2) Setear estado local con lo que regresa el backend
    setMe(shareRes.data?.user || null);
    setCanApprove(!!approveRes.data?.canApprove);
    const isSuper = !!approveRes.data?.isSuperuser;
    setIsSuperuser(isSuper);
    setPartners(partnersRes.data || []);

    // 3) Construir params para la lista
    const params: any = {};
    if (stateFilter !== 'all') params.state = stateFilter;

    // 👇 CLAVE: si es superuser, pedir TODO al backend
    if (isSuper) params.scope = 'all'; // el controller ya maneja scope=all

    // 4) Traer reservas
    const res = await api.get<Reservation[]>('/room-reservations', { params });
    setRows(res.data);
  } catch (err) {
    console.error(err);
    message.error('No se pudo cargar la lista.');
  } finally {
    setLoading(false);
  }
};


  useEffect(() => { loadData(); }, [stateFilter]);

  // Helpers de tiempo
  const disabledHours = () => Array.from({ length: 24 }, (_, h) => h).filter(h => h < 7 || h > 18);
  const disabledTime = () => ({ disabledHours });
  const keepDateInTime = (date: Dayjs | undefined, t: Dayjs) =>
    (date || dayjs()).hour(t.hour()).minute(t.minute()).second(0).millisecond(0);
  // --- Acciones ---
  const doApprove = async (row: Reservation) => {
    try {
      await api.patch(`/room-reservations/${row.id}/accept`);
      notification.success({ message: 'Reservación aceptada' });
      setRows(prev => prev.map(r => (r.id === row.id ? { ...r, state: 1 } : r)));
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'No se pudo aceptar.');
    }
  };

  const openReject = (row: Reservation) => {
    setRejectRow(row);
    setRejectReason('');
    setRejectVisible(true);
  };
  const submitReject = async () => {
    if (!rejectRow) return;
    if (!rejectReason.trim()) return message.warning('Ingrese un motivo.');
    try {
      await api.patch(`/room-reservations/${rejectRow.id}/reject`, { reject_reason: rejectReason.trim() });
      notification.success({ message: 'Reservación rechazada' });
      setRows(prev => prev.map(r => (r.id === rejectRow.id ? { ...r, state: 2 } : r)));
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'No se pudo rechazar.');
    } finally {
      setRejectVisible(false);
      setRejectRow(null);
      setRejectReason('');
    }
  };

  const openDelete = (row: Reservation) => {
    setDeleteRow(row);
    setDeleteReason('');
    setDeleteVisible(true);
  };
  const submitDelete = async () => {
    if (!deleteRow) return;
    if (!deleteReason.trim()) return message.warning('Ingrese un motivo.');
    try {
      await api.delete(`/room-reservations/${deleteRow.id}`, { data: { delete_reason: deleteReason.trim() } });
      notification.success({ message: 'Reservación eliminada' });
      setRows(prev => prev.filter(r => r.id !== deleteRow.id));
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'No se pudo eliminar.');
    } finally {
      setDeleteVisible(false);
      setDeleteRow(null);
      setDeleteReason('');
    }
  };

  const openEdit = async (row: Reservation) => {
    setEditing(row);
    setEditVisible(true);
    setEditLoading(true);
    try {
      if (!rooms.length) {
        const resRooms = await api.get<Room[]>('/rooms');
        setRooms(resRooms.data.filter(r => r.price_per_hour != null));
      }
      const date = dayjs(row.reservation_date);
      const [ih, im] = fmtTime(row.init_hour).split(':').map(Number);
      const [eh, em] = fmtTime(row.end_hour).split(':').map(Number);
      editForm.setFieldsValue({
        reservation_date: date,
        init_hour: date.hour(ih).minute(im),
        end_hour:  date.hour(eh).minute(em),
        room_id: row.room_id,
        reason: row.reason,
        participants: row.participants,
        use_computer: !!row.use_computer,
        user_projector: !!row.user_projector,
      });
    } catch (e) {
      console.error(e);
      message.error('No fue posible abrir el editor.');
      setEditVisible(false);
      setEditing(null);
    } finally {
      setEditLoading(false);
    }
  };

  const submitEdit = async () => {
    try {
      const v = await editForm.validateFields();
      if (!v.end_hour.isAfter(v.init_hour)) {
        return message.error('La hora fin debe ser posterior a la hora inicio');
      }

      const payload = {
        reservation_date: v.reservation_date.format('YYYY-MM-DD'),
        init_hour: v.init_hour.format('HH:mm'),
        end_hour: v.end_hour.format('HH:mm'),
        room_id: v.room_id,
        reason: v.reason,
        participants: v.participants,
        use_computer: !!v.use_computer,
        user_projector: !!v.user_projector,
      };
      setEditLoading(true);
      await api.patch(`/room-reservations/${editing!.id}`, payload);
      notification.success({ message: 'Reservación actualizada' });

      setRows(prev => prev.map(r => r.id === editing!.id
        ? {
            ...r,
            reservation_date: payload.reservation_date,
            init_hour: payload.init_hour,
            end_hour: payload.end_hour,
            room_id: payload.room_id,
            reason: payload.reason,
            participants: payload.participants,
            use_computer: payload.use_computer,
            user_projector: payload.user_projector,
          }
        : r
      ));
      setEditVisible(false);
      setEditing(null);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (status === 409) {
        notification.warning({
          message: 'Horario no disponible',
          description: typeof msg === 'string' ? msg : 'Existe un solape con otra reservación.',
        });
      } else if (status === 400) {
        message.error(msg || 'Datos inválidos.');
      } else if (status === 403) {
        message.error('No autorizado para editar esta reservación.');
      } else if (err?.errorFields) {
        // antd ya marcó los campos
      } else {
        message.error('Error al actualizar.');
      }
    } finally {
      setEditLoading(false);
    }
  };

  // permisos por fila
  const isOwner       = (r: Reservation) => me && (r.request_user_id === me.id || r.user?.id === me.id);
  const canEditRow    = (r: Reservation) => (isSuperuser || isOwner(r)) && r.state === 0;
  const canDeleteRow  = (r: Reservation) => (isSuperuser || isOwner(r)) && r.state === 0;
  const canApproveRow = (r: Reservation) => canApprove && r.state === 0;

  // “Solo mis reservas” para superuser
  const visibleRows = useMemo(() => {
    if (!isSuperuser || !onlyMine || !me) return rows;
    return rows.filter(r => r.request_user_id === me.id || r.user?.id === me.id);
  }, [rows, isSuperuser, onlyMine, me]);

  // columnas de la tabla principal
  const columns = [
    {
      title: 'Sala',
      dataIndex: ['room', 'name'],
      key: 'room',
      width: 180,
      ellipsis: true,
      render: (_: any, r: Reservation) => r.room?.name || r.room_id,
    },
    {
      title: 'Reservado por',
      key: 'user',
      width: 220,
      ellipsis: true,
      render: (_: any, r: Reservation) =>
        r.user ? `${r.user.first_name} ${r.user.last_name}` : '-',
    },
    {
      title: 'Inicio',
      key: 'start',
      width: 160,
      render: (_: any, r: Reservation) =>
        `${dayjs(r.reservation_date).format('DD/MM/YYYY')} ${fmtTime(r.init_hour)}`,
    },
    {
      title: 'Fin',
      key: 'end',
      width: 160,
      render: (_: any, r: Reservation) =>
        `${dayjs(r.reservation_date).format('DD/MM/YYYY')} ${fmtTime(r.end_hour)}`,
    },
    {
      title: 'Motivo',
      dataIndex: 'reason',
      key: 'reason',
      width: 260,
      ellipsis: true,
    },
    {
      title: 'Compartido con',
      key: 'shared',
      width: 240,
      render: (_: any, r: Reservation) =>
        r.is_shared_cost && r.shared_with?.length ? (
          <Space wrap>
            {r.shared_with.map(id => (
              <Tag key={id}>{partnersMap.get(id) || `ID ${id}`}</Tag>
            ))}
          </Space>
        ) : <span>-</span>,
    },
    {
      title: 'Estado',
      dataIndex: 'state',
      key: 'state',
      width: 120,
      align: 'center' as const,
      render: (s: 0|1|2) => (
        <Tag color={stateColor(s)}>{stateLabel(s)}</Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      fixed: 'right' as const,
      width: 260,
      render: (_: any, r: Reservation) => (
        <Space>
          {canEditRow(r) && (
            <Tooltip title="Editar">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
            </Tooltip>
          )}
          {canDeleteRow(r) && (
            <Tooltip title="Eliminar">
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => openDelete(r)} />
            </Tooltip>
          )}
          {canApproveRow(r) && (
            <>
              <Tooltip title="Aceptar">
                <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => doApprove(r)} />
              </Tooltip>
              <Tooltip title="Rechazar">
                <Button size="small" danger icon={<CloseOutlined />} onClick={() => openReject(r)} />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  // --------- DESCARGA DE EXCEL (Resumen Equipo → Área → Persona) ----------
const downloadMonthlyReport = async () => {
  setDownloading(true);
  try {
    const [year, mm] = reportMonth.split('-');
    const { data } = await api.get<ReportRow[]>(
      `/room-reservations/report/month/${year}/${mm}`,
      { params: { state: 'all' } }
    );

    const dataset: ReportRow[] = (data ?? []).map(r => ({
      ...r,
      compartido_con: (r.compartido_con && r.compartido_con.length)
        ? r.compartido_con
        : Array.isArray(r.shared_with)
          ? r.shared_with.map(id => partnersMap.get(id) || `ID ${id}`)
          : [],
    }));

    type Key = string;
    const byEquipo = new Map<Key, ReportRow[]>();
    for (const r of dataset) {
      const k = r.equipo || '';
      byEquipo.set(k, (byEquipo.get(k) || []).concat(r));
    }

    const resumenRows: any[] = [];
    const num = (n: number) => Number((n || 0).toFixed(2));
    const pushEmpty = () => resumenRows.push({ Nivel: '', Nombre: '', 'Horas (dec)': '', 'Total (USD)': '', 'Compartido (detalle)': '' });

    for (const [equipo, listEquipo] of Array.from(byEquipo.entries()).sort()) {
      let horasEquipo = 0, totalEquipo = 0;
      resumenRows.push({
        Nivel: 'EQUIPO',
        Nombre: equipo || '(Sin equipo)',
        'Horas (dec)': '',
        'Total (USD)': '',
        'Compartido (detalle)': '',
      });

      const byArea = new Map<Key, ReportRow[]>();
      for (const r of listEquipo) {
        const k = r.area || '';
        byArea.set(k, (byArea.get(k) || []).concat(r));
      }

      for (const [area, listArea] of Array.from(byArea.entries()).sort()) {
        let horasArea = 0, totalArea = 0;
        resumenRows.push({
          Nivel: 'ÁREA',
          Nombre: area || '(Sin área)',
          'Horas (dec)': '',
          'Total (USD)': '',
          'Compartido (detalle)': '',
        });

        const byPersona = new Map<Key, ReportRow[]>();
        for (const r of listArea) {
          const k = r.usuario;
          byPersona.set(k, (byPersona.get(k) || []).concat(r));
        }

        for (const [persona, listPersona] of Array.from(byPersona.entries()).sort()) {
          const horasPersona = listPersona.reduce((s, r) => s + (r.duracion_horas || 0), 0);
          const totalPersona = listPersona.reduce((s, r) => s + (r.total_reserva || 0), 0);
          horasArea += horasPersona;
          totalArea += totalPersona;

          const detalleCompartido: string[] = [];
          for (const reserva of listPersona) {
            if (reserva.is_shared_cost && reserva.compartido_con?.length) {
              const montoPorPersona = num(reserva.pago_por_persona || 0);
              const porcentaje = num(100 / reserva.cantidad_personas);
              const nombres = reserva.compartido_con.join(', ');
              detalleCompartido.push(`Con: ${nombres} → ${porcentaje}% → $${montoPorPersona.toFixed(2)}`);
            }
          }

          resumenRows.push({
            Nivel: 'PERSONA',
            Nombre: persona,
            'Horas (dec)': num(horasPersona),
            'Total (USD)': num(totalPersona),
            'Compartido (detalle)': detalleCompartido.join(' | '),
          });
        }

        resumenRows.push({
          Nivel: 'SUBTOTAL ÁREA',
          Nombre: area || '(Sin área)',
          'Horas (dec)': num(horasArea),
          'Total (USD)': num(totalArea),
          'Compartido (detalle)': '',
        });

        horasEquipo += horasArea;
        totalEquipo += totalArea;
      }

      resumenRows.push({
        Nivel: 'SUBTOTAL EQUIPO',
        Nombre: equipo || '(Sin equipo)',
        'Horas (dec)': num(horasEquipo),
        'Total (USD)': num(totalEquipo),
        'Compartido (detalle)': '',
      });

      pushEmpty();
    }

    const totalHoras = dataset.reduce((s, r) => s + (r.duracion_horas || 0), 0);
    const totalUSD = dataset.reduce((s, r) => s + (r.total_reserva || 0), 0);
    resumenRows.push({
      Nivel: 'TOTAL GENERAL',
      Nombre: '',
      'Horas (dec)': num(totalHoras),
      'Total (USD)': num(totalUSD),
      'Compartido (detalle)': '',
    });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Resumen');

    ws.columns = [
      { header: 'Nivel', key: 'Nivel', width: 20 },
      { header: 'Nombre', key: 'Nombre', width: 30 },
      { header: 'Horas (dec)', key: 'Horas (dec)', width: 15 },
      { header: 'Total (USD)', key: 'Total (USD)', width: 15 },
      { header: 'Compartido (detalle)', key: 'Compartido (detalle)', width: 50 },
    ];

    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDDEEFF' },
      };
      cell.border = { bottom: { style: 'thin' } };
    });

    resumenRows.forEach((row) => {
      const r = ws.addRow(row);

      if (row.Nivel === 'EQUIPO') {
        r.font = { bold: true };
        r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F7FF' } };
      } else if (row.Nivel === 'SUBTOTAL ÁREA') {
        r.font = { bold: true };
        r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
      } else if (row.Nivel === 'SUBTOTAL EQUIPO') {
        r.font = { bold: true };
        r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDEBD0' } };
      } else if (row.Nivel === 'TOTAL GENERAL') {
        r.font = { bold: true };
        r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
      }
    });

    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: ws.columnCount },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `reporte-salas-${reportMonth}.xlsx`);
  } catch (e) {
    console.error(e);
    message.error('No fue posible generar el reporte.');
  } finally {
    setDownloading(false);
  }
};


  return (
    <div>
      <Title level={3}>Reservaciones</Title>

      <Space style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <span>Estado:</span>
        <Select<StateFilter>
          value={stateFilter}
          style={{ width: 200 }}
          onChange={setStateFilter}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'pending', label: 'Pendientes' },
            { value: 'accepted', label: 'Aceptadas' },
            { value: 'rejected', label: 'Rechazadas' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={loadData}>Refrescar</Button>

        {/* ---- Filtros y descarga de reporte ---- */}
        <Space style={{ marginLeft: 16 }}>
          <span>Reporte (mes):</span>
          <DatePicker
            picker="month"
            value={dayjs(reportMonth + '-01')}
            onChange={(d) => {
              if (!d) return;
              setReportMonth(d.format('YYYY-MM'));
            }}
            allowClear={false}
          />
          <Tooltip title="Descargar Excel (Equipo → Área → Persona)">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={downloading}
              onClick={downloadMonthlyReport}
            >
              Descargar Excel
            </Button>
          </Tooltip>
        </Space>

        {isSuperuser && (
          <Space style={{ marginLeft: 16 }}>
            <span>Solo mis reservas</span>
            <Switch checked={onlyMine} onChange={setOnlyMine} />
          </Space>
        )}
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={visibleRows}
        columns={columns as any}
        pagination={{ pageSize: 10 }}
        tableLayout="fixed"
        sticky
        scroll={{ x: 1520 }}
      />

      {/* Modal Editar */}
      <Modal
        title={editing ? `Editar reservación #${editing.id}` : 'Editar reservación'}
        open={editVisible}
        onOk={submitEdit}
        okText="Guardar cambios"
        onCancel={() => { setEditVisible(false); setEditing(null); }}
        confirmLoading={editLoading}
        destroyOnClose
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item
            name="reservation_date"
            label="Fecha"
            rules={[{ required: true, message: 'Seleccione una fecha' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(d) => d && d < dayjs().startOf('day')}
              onChange={(d) => {
                if (!d) return;
                const ih = editForm.getFieldValue('init_hour') as Dayjs | undefined;
                const eh = editForm.getFieldValue('end_hour') as Dayjs | undefined;
                if (ih) editForm.setFieldsValue({ init_hour: keepDateInTime(d, ih) });
                if (eh) editForm.setFieldsValue({ end_hour: keepDateInTime(d, eh) });
              }}
            />
          </Form.Item>

          <Space style={{ width: '100%' }} size="middle">
            <Form.Item
              name="init_hour"
              label="Hora inicio"
              rules={[{ required: true, message: 'Seleccione hora de inicio' }]}
            >
              <TimePicker
                format="HH:mm"
                minuteStep={1}
                disabledTime={disabledTime}
                onChange={(t) => {
                  const date = editForm.getFieldValue('reservation_date') as Dayjs | undefined;
                  if (t) editForm.setFieldsValue({ init_hour: keepDateInTime(date, t) });
                }}
              />
            </Form.Item>

            <Form.Item
              name="end_hour"
              label="Hora fin"
              rules={[{ required: true, message: 'Seleccione hora de fin' }]}
            >
              <TimePicker
                format="HH:mm"
                minuteStep={1}
                disabledTime={disabledTime}
                onChange={(t) => {
                  const date = editForm.getFieldValue('reservation_date') as Dayjs | undefined;
                  if (t) editForm.setFieldsValue({ end_hour: keepDateInTime(date, t) });
                }}
              />
            </Form.Item>
          </Space>

          <Form.Item
            name="room_id"
            label="Sala"
            rules={[{ required: true, message: 'Seleccione sala' }]}
          >
            <Select placeholder="Sala">
              {rooms.map(r => (
                <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="reason"
            label="Motivo"
            rules={[{ required: true, message: 'Ingrese motivo' }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="participants"
            label="Participantes"
            rules={[{ required: true, message: 'Ingrese participantes' }]}
          >
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Space size="large">
            <Form.Item name="use_computer" valuePropName="checked">
              <Checkbox>Usará computadora</Checkbox>
            </Form.Item>
            <Form.Item name="user_projector" valuePropName="checked">
              <Checkbox>Usará proyector</Checkbox>
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Modal Rechazar */}
      <Modal
        title={rejectRow ? `Rechazar reservación #${rejectRow.id}` : 'Rechazar'}
        open={rejectVisible}
        onOk={submitReject}
        okText="Rechazar"
        okButtonProps={{ danger: true }}
        onCancel={() => { setRejectVisible(false); setRejectRow(null); }}
        destroyOnClose
      >
        <TextArea
          rows={4}
          placeholder="Motivo del rechazo"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>

      {/* Modal Eliminar */}
      <Modal
        title={deleteRow ? `Eliminar reservación #${deleteRow.id}` : 'Eliminar'}
        open={deleteVisible}
        onOk={submitDelete}
        okText="Eliminar"
        okButtonProps={{ danger: true }}
        onCancel={() => { setDeleteVisible(false); setDeleteRow(null); }}
        destroyOnClose
      >
        <TextArea
          rows={4}
          placeholder="Motivo de la eliminación"
          value={deleteReason}
          onChange={(e) => setDeleteReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
