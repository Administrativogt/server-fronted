// RoomReservationForm.tsx
import React, { useEffect, useState } from 'react';
import {
  Button, Checkbox, Col, DatePicker, Form, Input, InputNumber,
  Row, Select, TimePicker, Typography, message, Spin, notification,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../auth/useAuthStore';
import api from '../../api/axios';
import { ReservationsAPI } from '../../services/roomReservations';

const { TextArea } = Input;
const { Title } = Typography;

type MeetingType = 'team_meeting' | 'client_call' | 'urgent' | 'other';
interface Room { id: number; name: string; price_per_hour: string | null }
type Partner = { id: number; full_name: string };

interface FormValues {
  meeting_type: MeetingType;
  reservation_date: Dayjs;
  init_hour?: Dayjs;
  end_hour?: Dayjs;
  reason: string;
  participants: number;
  use_computer?: boolean;
  user_projector?: boolean;
  room: number;
  // compartir costo
  is_shared_cost?: boolean;
  shared_with?: number[];
}

export default function RoomReservationForm() {
  const [form] = Form.useForm<FormValues>();
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [loadingCreate, setLoadingCreate] = useState(false);

  const [canShareCost, setCanShareCost] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [me, setMe] = useState<{ id: number; full_name: string } | null>(null);

  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  const minuteStep = 1;
  const now = dayjs();

  useEffect(() => {
    if (!token) { setRooms([]); setPartners([]); setCanShareCost(false); return; }

    // 1) Salas
    api.get<Room[]>('/rooms')
      .then(res => setRooms(res.data.filter(r => r.price_per_hour != null)))
      .catch(err => {
        console.error('Error cargando salas:', err);
        message.error('No se pudieron cargar las salas');
        setRooms([]);
      });

    // 2) Permiso para compartir + socios autorizados + usuario actual (desde share/can)
    Promise.all([
      api.get<{ canShare: boolean; user: { id: number; full_name: string } }>('/room-reservations/share/can'),
      api.get<Partner[]>('/room-reservations/team/users'),
    ])
      .then(([canRes, partnersRes]) => {
        setCanShareCost(!!canRes.data?.canShare);
        setMe(canRes.data?.user || null);
        setPartners(partnersRes.data || []);
      })
      .catch(err => {
        console.warn('No fue posible cargar permiso/partners:', err);
        setCanShareCost(false);
        setPartners([]);
      });
  }, [token]);

  const disabledDate = (d: Dayjs) => d && d < dayjs().startOf('day');

  // AntD: usar disabledTime (en vez de disabledHours)
  const disabledHours = () => Array.from({ length: 24 }, (_, h) => h).filter(h => h < 7 || h > 18);
  const disabledTime = () => ({ disabledHours });

  // Forzar que la hora elegida ("Now" o manual) use el día de reservation_date
  const setTimeKeepingDate = (field: 'init_hour' | 'end_hour') => (t: Dayjs | null) => {
    const date = form.getFieldValue('reservation_date') as Dayjs | undefined;
    if (!t) {
      form.setFieldsValue({ [field]: undefined } as any);
      return;
    }
    const base = date ?? dayjs();
    const fixed = base.hour(t.hour()).minute(t.minute()).second(0).millisecond(0);
    form.setFieldsValue({ [field]: fixed } as any);
  };

  const onFinish = async (values: FormValues) => {
    const { reservation_date, init_hour, end_hour } = values;

    if (!init_hour || !end_hour) {
      return message.error('Debe seleccionar la hora de inicio y fin.');
    }
    if (!end_hour.isAfter(init_hour)) {
      return message.error('La hora fin debe ser posterior a la hora inicio');
    }
    if (!init_hour.isSame(reservation_date, 'day') || !end_hour.isSame(reservation_date, 'day')) {
      return message.error('Las horas deben pertenecer al mismo día seleccionado');
    }

    const payload = {
      state: 0 as const, // pending
      meeting_type: values.meeting_type,
      creation_date: new Date().toISOString(),
      reservation_date: reservation_date.format('YYYY-MM-DD'),
      init_hour: init_hour.format('HH:mm'),
      end_hour: end_hour.format('HH:mm'),
      reason: values.reason,
      participants: values.participants,
      participants_emails: [],
      use_computer: !!values.use_computer,
      user_projector: !!values.user_projector,
      reminder_sended: false,
      covid_form_sended: false,
      use_meeting_owl: false,
      is_shared_cost: !!values.is_shared_cost,
      shared_with: values.is_shared_cost ? (values.shared_with || []) : undefined,
      room_id: values.room,
    };

    try {
      setLoadingCreate(true);
      await ReservationsAPI.create(payload);
      notification.success({
        message: 'Reservación creada',
        description: 'Tu reservación se creó correctamente.',
        duration: 2,
      });
      form.resetFields();
      form.setFieldsValue({
        reservation_date: dayjs(),
        meeting_type: 'team_meeting',
        participants: 1,
        is_shared_cost: false,
      } as any);
      navigate('/dashboard/reservaciones');
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;

      if (status === 409) {
        notification.warning({
          message: 'Horario no disponible',
          description: typeof msg === 'string'
            ? msg
            : 'Ya existe una reservación pendiente/aceptada que se solapa. Cambia la hora o la sala.',
          duration: 4,
        });
      } else if (status === 400) {
        message.error(msg || 'Datos inválidos en la reservación.');
      } else if (status === 401 || status === 403) {
        message.error('No autorizado. Inicia sesión o verifica tus permisos.');
      } else {
        message.error('Error al crear la reservación.');
      }
      console.error('Error create:', err?.response || err);
    } finally {
      setLoadingCreate(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Title level={2}>Crear Nueva Reservación</Title>

      {rooms === null ? (
        <Spin size="large" />
      ) : (
        <Form
          layout="vertical"
          form={form}
          onFinish={onFinish}
          initialValues={{
            participants: 1,
            meeting_type: 'team_meeting' as MeetingType,
            reservation_date: now,
            is_shared_cost: false,
          }}
        >
          {/* Tipo de Reunión */}
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

          {/* Fecha y Hora */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="reservation_date"
                label="Fecha de Reservación"
                rules={[{ required: true, message: 'Seleccione una fecha' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  disabledDate={disabledDate}
                  onChange={(d) => {
                    if (!d) return;
                    const ih = form.getFieldValue('init_hour') as Dayjs | undefined;
                    const eh = form.getFieldValue('end_hour') as Dayjs | undefined;
                    if (ih) form.setFieldsValue({ init_hour: d.hour(ih.hour()).minute(ih.minute()).second(0).millisecond(0) } as any);
                    if (eh) form.setFieldsValue({ end_hour: d.hour(eh.hour()).minute(eh.minute()).second(0).millisecond(0) } as any);
                  }}
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item
                name="init_hour"
                label="Hora Inicio"
                rules={[{ required: true, message: 'Hora requerida' }]}
              >
                <TimePicker
                  format="HH:mm"
                  minuteStep={minuteStep}
                  style={{ width: '100%' }}
                  disabledTime={disabledTime}
                  showNow
                  allowClear
                  placeholder="Selecciona hora"
                  onChange={setTimeKeepingDate('init_hour')}
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item
                name="end_hour"
                label="Hora Fin"
                rules={[{ required: true, message: 'Hora requerida' }]}
              >
                <TimePicker
                  format="HH:mm"
                  minuteStep={minuteStep}
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

          {/* Sala */}
          <Form.Item
            name="room"
            label="Sala"
            rules={[{ required: true, message: 'Seleccione una sala' }]}
          >
            <Select<number> placeholder="Selecciona una sala">
              {rooms.map(r => (
                <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Motivo */}
          <Form.Item
            name="reason"
            label="Motivo"
            rules={[{ required: true, message: 'Describa el motivo' }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          {/* Participantes */}
          <Form.Item
            name="participants"
            label="Cantidad de Participantes"
            rules={[{ required: true, message: 'Ingrese un número' }]}
          >
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>

          {/* Opciones */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="use_computer" valuePropName="checked">
                <Checkbox>Usará computadora</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="user_projector" valuePropName="checked">
                <Checkbox>Usará proyector</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          {/* Compartir costo (solo socios) */}
          {canShareCost && (
            <>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="is_shared_cost" valuePropName="checked">
                    <Checkbox>¿Compartir costo?</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, cur) => prev.is_shared_cost !== cur.is_shared_cost}
                  >
                    {({ getFieldValue }) =>
                      getFieldValue('is_shared_cost') ? (
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
                              .filter(p => (me ? p.id !== me.id : true)) // no me incluyo
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
            </>
          )}

          {/* Enviar */}
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loadingCreate}>
              Crear Reservación
            </Button>
          </Form.Item>
        </Form>
      )}
    </div>
  );
}
