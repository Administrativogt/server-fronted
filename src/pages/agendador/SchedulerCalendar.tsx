import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Badge, Modal, List, Skeleton, Card, Alert, App as AntdApp } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { getSchedulerEvents } from '../../api/scheduler';
import type { SchedulerEvent } from '../../types/scheduler.types';

dayjs.locale('es');

const SchedulerCalendar: React.FC = () => {
  const [events, setEvents] = useState<SchedulerEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [month, setMonth] = useState(dayjs());

  const { message } = AntdApp.useApp();

  const fetchMonth = async (_y: number, _m: number) => {
    setLoading(true);
    try {
      // El API solo acepta page y limit — sin filtros de fecha
      const res = await getSchedulerEvents({ limit: 500 });
      setEvents(res.data);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'No se pudo cargar el calendario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonth(month.year(), month.month());
  }, [month]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, SchedulerEvent[]> = {};
    events.forEach((e) => {
      const d = dayjs(e.start).format('YYYY-MM-DD'); // era e.startDate
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    return map;
  }, [events]);

  const dateCellRender = (value: Dayjs) => {
    const key = value.format('YYYY-MM-DD');
    const dayEvents = eventsByDay[key] || [];
    if (!dayEvents.length) return null;
    return (
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {dayEvents.slice(0, 3).map((item) => (
          <li key={item.id} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Badge status="processing" text={item.title} />
          </li>
        ))}
        {dayEvents.length > 3 && (
          <li style={{ color: '#999' }}>+{dayEvents.length - 3} más</li>
        )}
      </ul>
    );
  };

  const onSelect = (date: Dayjs) => {
    setSelectedDate(date);
    setModalOpen(true);
  };

  const handlePanelChange = (value: Dayjs) => {
    setMonth(value);
  };

  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = selectedDate.format('YYYY-MM-DD');
    return eventsByDay[key] || [];
  }, [selectedDate, eventsByDay]);

  return (
    <Card title="Calendario de vencimientos">
      <Alert
        type="info"
        showIcon
        message="Lectura solamente"
        description="Este calendario muestra los vencimientos de etapas de los plazos. Para agregar nuevos vencimientos, cree un plazo desde 'Agendador → Crear plazo'."
        style={{ marginBottom: 12 }}
      />
      <Calendar
        value={month}
        onPanelChange={handlePanelChange}
        onSelect={onSelect}
        cellRender={(current, info) => {
          if (info.type === 'date') return dateCellRender(current);
          return info.originNode;
        }}
      />
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={selectedDate ? selectedDate.format('[Eventos del] DD/MM/YYYY') : 'Eventos'}
        footer={null}
      >
        <Skeleton active loading={loading}>
          <List
            dataSource={dayEvents}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={`${dayjs(item.start).format('HH:mm')} - ${dayjs(item.end).format('HH:mm')}  ${item.title}`}
                  description={item.place || item.description}  // era item.location
                />
              </List.Item>
            )}
          />
        </Skeleton>
      </Modal>
    </Card>
  );
};

export default SchedulerCalendar;
