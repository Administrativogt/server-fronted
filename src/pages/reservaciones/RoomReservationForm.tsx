// src/pages/reservaciones/RoomReservationForm.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button, Checkbox, Col, DatePicker, Form, Input, InputNumber,
  Row, Select, TimePicker, Typography, Spin, notification, Result, Space, Tag, Divider,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../auth/useAuthStore';
import api from '../../api/axios';
import { ReservationsAPI } from '../../services/roomReservations';
import { generarConvocatoriaICS } from '../../utils/generateTeamsInvite';
import { CalendarOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title } = Typography;

type MeetingType = 'team_meeting' | 'client_call' | 'urgent' | 'other';
interface Room { id: number; name: string; price_per_hour: string | null }
type Partner = { id: number; full_name: string; email: string };

interface FormValues {
  meeting_type: MeetingType;
  reservation_date: Dayjs;
  init_hour?: Dayjs;
  end_hour?: Dayjs;
  reason: string;
  user_id?: number;
  participants: number;
  use_computer?: boolean;
  user_projector?: boolean;
  room: number;
  is_shared_cost?: boolean;
  shared_with?: number[];
}

type FastMonthItem = {
  id: number;
  room_id: number;
  reservation_date: string; // YYYY-MM-DD
  init_hour: string;        // HH:mm:ss
  end_hour: string;         // HH:mm:ss
  state: number;            // 0 pending, 1 accepted, 2 rejected
  delete_hour?: string | null;
};

const WORK_START = 7;
const WORK_END = 18;
const MIN_DURATION_MIN = 15;

const fmtHM = (s: string) => (s.length >= 5 ? s.slice(0, 5) : s);
const parseHM = (s: string) => dayjs(fmtHM(s), 'HH:mm');

export default function RoomReservationForm() {
  const [form] = Form.useForm<FormValues>();
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [checking, setChecking] = useState(false);
  const [dayReservations, setDayReservations] = useState<FastMonthItem[]>([]);
  const [canShareCost, setCanShareCost] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [me, setMe] = useState<{ id: number; full_name: string } | null>(null);
  const [created, setCreated] = useState<null | { date: string; init: string; end: string; roomId: number }>(null);
  const [currentConflict, setCurrentConflict] = useState<{message: string; description: string} | null>(null);

  const [notif, contextHolder] = notification.useNotification();
  const debounceRef = useRef<number | null>(null);

  // 🔒: id incremental para que solo la ÚLTIMA verificación pueda mostrar toasts/estado
  const checkSeqRef = useRef(0);
  // 🔔: un key para que el toast se reemplace en lugar de apilarse
  const NOTIF_KEY = 'availability-check';

  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  const now = dayjs();

  // watchers
  const wDate  = Form.useWatch('reservation_date', form);
  const wRoom  = Form.useWatch('room', form);
  const wInit  = Form.useWatch('init_hour', form);
  const wEnd   = Form.useWatch('end_hour', form);
  const wShare = Form.useWatch('is_shared_cost', form);

  // carga inicial
  useEffect(() => {
    if (!token) { setRooms([]); setPartners([]); setCanShareCost(false); return; }

    api.get<Room[]>('/rooms')
      .then(res => setRooms(res.data.filter(r => r.price_per_hour != null)))
      .catch(() => {
        setRooms([]);
        notif.error({ message: 'Error', description: 'No se pudieron cargar las salas' });
      });

    api.get('/users')
      .then(res => {
      const mapped = res.data.map((u: any) => ({
        id: u.id,
        full_name: `${u.first_name} ${u.last_name}`,
        email: u.email,
      }));
      setPartners(mapped);
      })
      .catch(() => setPartners([]));
  }, [token, notif]);

  // reglas UI
  const disabledDate = (d: Dayjs) => d.isBefore(dayjs().startOf('day'));
  const disabledHours = useCallback(() => Array.from({ length: 24 }, (_, h) => h).filter(h => h < WORK_START || h > WORK_END), []);
  const disabledTime = () => ({ disabledHours });

  const keepDate = (date: Dayjs | undefined, t: Dayjs) =>
    (date || dayjs()).hour(t.hour()).minute(t.minute()).second(0).millisecond(0);

  const setTimeKeepingDate = (field: 'init_hour' | 'end_hour') => (t: Dayjs | null) => {
    const date = form.getFieldValue('reservation_date') as Dayjs | undefined;
    if (!t) { form.setFieldsValue({ [field]: undefined } as any); return; }
    form.setFieldsValue({ [field]: keepDate(date, t) } as any);
  };

  const getRoomName = (id?: number) => rooms?.find(r => r.id === id)?.name || `Sala ${id ?? ''}`;

  // día/solapes
  const fetchDay = useCallback(async (date: Dayjs) => {
    try {
      setChecking(true);
      const y = date.year();
      const m = date.month() + 1;
      const { data } = await api.get<FastMonthItem[]>(`/room-reservations/fast/month/${y}/${m}`);
      const list = (data || []).filter(
        r => r.state !== 2 && !r.delete_hour && r.reservation_date === date.format('YYYY-MM-DD')
      );
      setDayReservations(list);
      return list;
    } catch {
      setDayReservations([]);
      return [];
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { if (wDate) void fetchDay(wDate); }, [wDate, fetchDay]);

  const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
    const aS = parseHM(aStart);
    const aE = parseHM(aEnd);
    const bS = parseHM(bStart);
    const bE = parseHM(bEnd);
    return aS.isBefore(bE) && aE.isAfter(bS);
  };

  const debounce = useCallback((fn: () => void, ms = 300) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(fn, ms);
  }, []);

  // ✅ chequeo robusto: solo la última verificación puede actuar y el toast se reemplaza
const checkForConflicts = useCallback(
  async (opts?: { silent?: boolean }): Promise<boolean> => {
    const rd = form.getFieldValue('reservation_date') as Dayjs | undefined;
    const roomId = form.getFieldValue('room') as number | undefined;
    const ih = form.getFieldValue('init_hour') as Dayjs | undefined;
    const eh = form.getFieldValue('end_hour') as Dayjs | undefined;

    const formatted = {
      room_id: roomId,
      date: rd?.format('YYYY-MM-DD'),
      start: ih?.format('HH:mm'),
      end: eh?.format('HH:mm'),
    };

    console.log('🛠️ Verificando disponibilidad con:', formatted);

    // ❌ Si falta algún dato esencial, salimos
    if (!rd || !roomId || !ih || !eh) {
      console.warn('⚠️ Faltan datos para verificar disponibilidad');
      return false;
    }

    if (!eh.isAfter(ih)) return false;
    if (eh.diff(ih, 'minute') < MIN_DURATION_MIN) return false;

    const mySeq = ++checkSeqRef.current;

    try {
      const { data } = await api.get('/room-reservations/check-availability', {
        params: {
          room_id: roomId,
          date: formatted.date,
          start: formatted.start,
          end: formatted.end,
        },
      });

      if (mySeq !== checkSeqRef.current) return false;

      if (!data.available) {
        const conflictMessage = {
          message: 'Horario no disponible',
          description: `No hay horario disponible en la sala "${getRoomName(roomId)}" el ${formatted.date} de ${fmtHM(data.conflict.init_hour)} a ${fmtHM(data.conflict.end_hour)}.`,
        };
        console.warn('❌ Conflicto detectado:', data.conflict);
        setCurrentConflict(conflictMessage);
        if (!opts?.silent) {
          notif.warning({ key: NOTIF_KEY, ...conflictMessage, duration: 4 });
        }
        return true;
      }

      console.log('✅ Horario disponible');
      setCurrentConflict(null);
      if (!opts?.silent) {
        notif.success({
          key: NOTIF_KEY,
          message: 'Horario disponible',
          description: `La sala "${getRoomName(roomId)}" está libre de ${formatted.start} a ${formatted.end}.`,
          duration: 3,
        });
      }
      return false;

    } catch (err) {
      console.error('❌ Error al verificar disponibilidad:', err);
      return false;
    }
  },
  [form, notif, rooms]
);


  // chequeo silencioso al cambiar valores clave
useEffect(() => {
  if (!wDate || !wRoom || !wInit || !wEnd) return;
  debounce(() => { void checkForConflicts({ silent: true }); }, 300);
}, [wDate, wRoom, wInit, wEnd, debounce, checkForConflicts]);


  // mini agenda del día por sala
  const dayByRoom = useMemo(() => {
    if (!wRoom) return [];
    return dayReservations
      .filter(r => r.room_id === wRoom)
      .sort((a, b) => a.init_hour.localeCompare(b.init_hour));
  }, [dayReservations, wRoom]);

  const obtenerEmailsDeParticipantes = (): string[] => {
    const selectedIds: number[] = form.getFieldValue('shared_with') || [];
    const emails = partners.filter(p => selectedIds.includes(p.id)).map(p => p.email).filter(Boolean);
    return emails;
  };

  const onFinish = async (values: FormValues) => {
    const hasConflict = await checkForConflicts({ silent: false });
    if (hasConflict) return;

    const { reservation_date, init_hour, end_hour } = values;

    const payload = {
      state: 0 as const,
      meeting_type: values.meeting_type,
      creation_date: new Date().toISOString(),
      reservation_date: reservation_date.format('YYYY-MM-DD'),
      init_hour: init_hour!.format('HH:mm'),
      end_hour: end_hour!.format('HH:mm'),
      reason: values.reason,
      participants: values.participants,
      participants_emails: obtenerEmailsDeParticipantes(),
      use_computer: !!values.use_computer,
      user_projector: !!values.user_projector,
      reminder_sended: false,
      covid_form_sended: false,
      use_meeting_owl: false,
      is_shared_cost: !!values.is_shared_cost,
      shared_with: values.is_shared_cost ? (values.shared_with || []) : undefined,
      room_id: values.room,
      user_id: values.user_id,

    };

    try {
      setLoadingCreate(true);
      await ReservationsAPI.create(payload);

      setCreated({
        date: payload.reservation_date,
        init: payload.init_hour,
        end: payload.end_hour,
        roomId: payload.room_id,
      });

      notif.success({ message: 'Reservación creada', description: 'La reservación fue creada con éxito.' });
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;

      if (status === 409) {
        const list = await fetchDay(reservation_date);
        const first = list.find(r =>
          r.room_id === values.room &&
          overlaps(payload.init_hour, payload.end_hour, r.init_hour, r.end_hour)
        );
        const desc = first
          ? `No hay horario disponible en la sala "${getRoomName(values.room)}" de ${fmtHM(first.init_hour)} a ${fmtHM(first.end_hour)}. Cambia la hora o la sala.`
          : (typeof msg === 'string' ? msg : 'Ya existe una reservación en ese horario y sala.');
        notif.warning({ key: NOTIF_KEY, message: 'Horario no disponible', description: desc });
      } else if (status === 400) {
        notif.error({ message: 'Datos inválidos', description: msg || 'Datos inválidos en la reservación.' });
      } else if (status === 401 || status === 403) {
        notif.error({ message: 'No autorizado', description: 'Inicia sesión o verifica tus permisos.' });
      } else {
        notif.error({ message: 'Error', description: 'Error al crear la reservación.' });
      }
    } finally {
      setLoadingCreate(false);
    }
  };

  const onFinishFailed = () => {
    notif.error({ message: 'Faltan campos', description: 'Revisa los campos obligatorios.' });
  };

  const rulesEnd = useMemo(() => [
    { required: true, message: 'Hora requerida' },
    {
      validator: async (_: any, value?: Dayjs) => {
        const ih = form.getFieldValue('init_hour') as Dayjs | undefined;
        const rd = form.getFieldValue('reservation_date') as Dayjs | undefined;
        if (!value || !ih || !rd) return Promise.resolve();
        if (!value.isAfter(ih)) return Promise.reject(new Error('La hora fin debe ser posterior a la hora inicio'));
        if (value.diff(ih, 'minute') < MIN_DURATION_MIN) return Promise.reject(new Error(`La reunión no puede durar menos de ${MIN_DURATION_MIN} minutos`));
        if (!value.isSame(rd, 'day') || !ih.isSame(rd, 'day')) return Promise.reject(new Error('Las horas deben pertenecer al día seleccionado'));
        return Promise.resolve();
      },
    },
  ], [form]);

  if (created) {
    const roomName = getRoomName(created.roomId);
    return (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {contextHolder}
        <Result
          status="success"
          title="¡Reservación creada exitosamente!"
          subTitle={`Sala "${roomName}" el ${dayjs(created.date).format('DD/MM/YYYY')} de ${created.init} a ${created.end}.`}
          extra={
            <Space wrap>
              <Button type="primary" onClick={() => navigate('/dashboard/reservaciones')}>
                Ver reservaciones
              </Button>
              <Button onClick={() => {
                setCreated(null);
                form.resetFields();
                form.setFieldsValue({
                  reservation_date: dayjs(),
                  meeting_type: 'team_meeting',
                  participants: 1,
                  is_shared_cost: false,
                  use_computer: false,
                  user_projector: false,
                } as any);
              }}>
                Crear otra
              </Button>
              <Button
                type="dashed"
                onClick={() =>
                  generarConvocatoriaICS({
                    title: form.getFieldValue('reason') || 'Reunión',
                    description: 'Reunión agendada desde la app de reservas',
                    location: roomName,
                    startDateTime: form.getFieldValue('init_hour'),
                    endDateTime: form.getFieldValue('end_hour'),
                    attendeesEmails: partners
                      .filter(p => (form.getFieldValue('shared_with') || []).includes(p.id))
                      .map(p => p.email)
                      .filter(Boolean),
                  })
                }
              >
                Descargar convocatoria Teams
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      {contextHolder}
      <Title level={2} style={{ marginBottom: 8 }}>Crear Nueva Reservación</Title>

      {rooms === null ? (
        <Spin size="large" />
      ) : (
        <Form
          layout="vertical"
          form={form}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          initialValues={{
            participants: 1,
            meeting_type: 'team_meeting' as MeetingType,
            reservation_date: now,
            is_shared_cost: false,
            use_computer: false,
            user_projector: false,
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="meeting_type"
                label="Tipo de Reunión"
                rules={[{ required: true, message: 'Selecciona tipo de reunión' }]}
              >
                <Select<MeetingType> style={{ width: '100%' }}>
                  <Select.Option value="team_meeting">Reunión interna</Select.Option>
                  <Select.Option value="client_call">Llamada con cliente</Select.Option>
                  <Select.Option value="urgent">Urgente</Select.Option>
                  <Select.Option value="other">Otro</Select.Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="room"
                label="Sala"
                rules={[{ required: true, message: 'Seleccione una sala' }]}
              >
                <Select<number>
                  placeholder="Selecciona una sala"
                  loading={checking}
                >
                  {rooms.map(r => (
                    <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="reservation_date"
                label="Fecha de Reservación"
                rules={[{ required: true, message: 'Seleccione una fecha' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  disabledDate={disabledDate}
                  onChange={async (d) => { if (d) await fetchDay(d); }}
                />
              </Form.Item>
            </Col>

            <Col xs={12} md={8}>
              <Form.Item
                name="init_hour"
                label="Hora Inicio"
                rules={[{ required: true, message: 'Hora requerida' }]}
              >
                <TimePicker
                  format="HH:mm"
                  minuteStep={1}
                  style={{ width: '100%' }}
                  disabledTime={disabledTime}
                  showNow
                  allowClear
                  placeholder="Selecciona hora"
                  onChange={setTimeKeepingDate('init_hour')}
                />
              </Form.Item>
            </Col>

            <Col xs={12} md={8}>
              <Form.Item
                name="end_hour"
                label="Hora Fin"
                rules={rulesEnd}
              >
                <TimePicker
                  format="HH:mm"
                  minuteStep={1}
                  style={{ width: '100%' }}
                  disabledTime={disabledTime}
                  showNow
                  allowClear
                  placeholder="Selecciona hora"
                  onChange={setTimeKeepingDate('end_hour')}
                />
              </Form.Item>
            </Col>
          </Row>

          {currentConflict && (
            <div style={{
              backgroundColor: '#fff2f0',
              border: '1px solid #ffccc7',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '12px'
            }}>
              <div style={{ color: '#cf1322', fontWeight: 'bold' }}>⚠️ {currentConflict.message}</div>
              <div style={{ color: '#cf1322' }}>{currentConflict.description}</div>
            </div>
          )}

          <Form.Item
            name="reason"
            label="Motivo"
            rules={[{ required: true, message: 'Describa el motivo' }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
              name="participants"
              label="Cantidad de Participantes"
              rules={[{ required: true, message: 'Ingrese un número' }]}
              >
              <InputNumber min={1} max={200} style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={16}>
              <Form.Item
              name="user_id"
              label="Reservar para"
              rules={[{ required: true, message: 'Seleccione un usuario' }]}
              >
              <Select<number>
                showSearch
                optionFilterProp="children"
                placeholder="Selecciona a quién se le hará la reserva"
              >
                {partners.map(p => (
                <Select.Option key={p.id} value={p.id}>
                  {p.full_name}
                </Select.Option>
                ))}
              </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Space size="large">
                <Form.Item name="use_computer" valuePropName="checked">
                  <Checkbox>Usará computadora</Checkbox>
                </Form.Item>
                <Form.Item name="user_projector" valuePropName="checked">
                  <Checkbox>Usará proyector</Checkbox>
                </Form.Item>
              </Space>
            </Col>
          </Row>

          {canShareCost && (
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="is_shared_cost" valuePropName="checked">
                  <Checkbox>¿Compartir costo?</Checkbox>
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item noStyle shouldUpdate={(prev, cur) => prev.is_shared_cost !== cur.is_shared_cost}>
                  {() =>
                    wShare ? (
                      <Form.Item
                        name="shared_with"
                        label="Selecciona socios (máx. 3)"
                        rules={[
                          { required: true, message: 'Seleccione al menos un socio' },
                          {
                            validator: (_,_val: number[]) =>
                              !_val || _val.length <= 3
                                ? Promise.resolve()
                                : Promise.reject(new Error('Máximo 3 socios')),
                          },
                        ]}
                      >
                        <Select<number>
                          mode="multiple"
                          placeholder="Elige socios"
                          optionFilterProp="children"
                          maxTagCount="responsive"
                          allowClear
                        >
                          {partners
                            .filter(p => (me ? p.id !== me.id : true))
                            .map(p => (
                              <Select.Option key={p.id} value={p.id}>
                                {p.full_name}
                              </Select.Option>
                            ))}
                        </Select>
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item>
            <Space wrap>
              <Button
                type="primary"
                htmlType="submit"
                loading={loadingCreate}
                disabled={!!currentConflict}
              >
                Crear Reservación
              </Button>
              <Button
                onClick={() => {
                  form.resetFields();
                  setCurrentConflict(null);
                }}
              >
                Limpiar
              </Button>
              <Button
                onClick={async () => {
                  // opcional: limpiar cualquier toast previo
                  notif.destroy(NOTIF_KEY);
                  await checkForConflicts({ silent: false });
                }}
              >
                Verificar disponibilidad
              </Button>
            </Space>
          </Form.Item>

          {/* Mini Agenda del día para la sala seleccionada */}
          <Divider />
          <Title level={5} style={{ marginBottom: 8 }}>
            <CalendarOutlined /> Agenda del día — {wDate ? wDate.format('DD/MM/YYYY') : 'sin fecha'} {wRoom ? `· ${getRoomName(wRoom)}` : ''}
          </Title>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(!wRoom || !wDate) && <span>Seleccione fecha y sala para ver la agenda.</span>}
            {wRoom && wDate && dayByRoom.length === 0 && <Tag color="green">No hay reservaciones</Tag>}
            {dayByRoom.map(r => (
              <Tag key={r.id} color={r.state === 1 ? 'green' : 'gold'}>
                {fmtHM(r.init_hour)}—{fmtHM(r.end_hour)}
              </Tag>
            ))}
          </div>
        </Form>
      )}
    </div>
  );
}
