// src/pages/reservaciones/ReservationsList.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button, Modal, Select, Space, Table, Tag, Typography, message,
  notification, Tooltip, Switch, Form, DatePicker, TimePicker,
  Input, InputNumber, Checkbox
} from 'antd';
import {
  EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, ReloadOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import api from '../../api/axios';

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

  const loadData = async () => {
    setLoading(true);
    try {
      // quién soy y permisos
      const [shareRes, approveRes] = await Promise.all([
        api.get<{ canShare: boolean; user: { id: number; full_name: string } }>('/room-reservations/share/can'),
        api.get<{ canApprove: boolean; isSuperuser: boolean }>('/room-reservations/approve/can'),
      ]);
      setMe(shareRes.data?.user || null);
      setCanApprove(!!approveRes.data?.canApprove);
      setIsSuperuser(!!approveRes.data?.isSuperuser);

      // socios autorizados
      const partnersRes = await api.get<Partner[]>('/room-reservations/team/users');
      setPartners(partnersRes.data || []);

      // reservas (el backend limita por usuario si no es superuser)
      const params: any = {};
      if (stateFilter !== 'all') params.state = stateFilter;
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
      // validación rápida en cliente
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
        // error de validación antd, ya mostró en el form
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

  // columnas con anchos y acciones fijas a la derecha
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
        // ancho horizontal grande para que la col fija siempre se vea
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
