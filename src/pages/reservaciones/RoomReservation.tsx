import { Calendar, Badge, Modal, List, Skeleton, message } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import utc from 'dayjs/plugin/utc';
import { useEffect, useState } from 'react';
import api from '../../api/axios';

dayjs.locale('es');
dayjs.extend(utc);

interface ApiReservation {
  reservation_id: string;
  reservation_date: string;
  init_hour: string;
  end_hour: string;
  reason: string;
  room_name: string;
  user_name: string;
}

function RoomReservation() {
  const [reservations, setReservations] = useState<ApiReservation[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  const minMonth = currentMonth.subtract(2, 'month').startOf('month');
  const maxMonth = currentMonth.endOf('month');

  const rangeText = `Mostrando reservaciones de  ${maxMonth.format('MMMM YYYY')}`;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const year = currentMonth.year();
      const month = currentMonth.month() + 1;
      try {
        const { data } = await api.get<ApiReservation[]>(
          `/room-reservations/fast/month/${year}/${month}`
        );
        setReservations(data);
      } catch {
        message.error('Error al cargar reservaciones');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentMonth]);

  const handlePanelChange = (value: Dayjs) => {
    setCurrentMonth(value);
  };

  const getListData = (value: Dayjs) => {
    if (value.isBefore(minMonth, 'day') || value.isAfter(maxMonth, 'day')) {
      return [];
    }
    const dateStr = value.format('YYYY-MM-DD');
    return reservations.filter(
      (r) =>
        dayjs.utc(r.reservation_date).local().format('YYYY-MM-DD') === dateStr
    );
  };

  const cellRender = (value: Dayjs) => {
    const listData = getListData(value);
    if (!listData.length) return null;

    return (
      <ul style={{ padding: 0, listStyle: 'none' }}>
        <li>
          <Badge
            status="success"
            text={`Existen reservaciones (${listData.length})`}
          />
        </li>
      </ul>
    );
  };

  const handleSelect = (value: Dayjs) => {
    if (value.isBefore(minMonth, 'day') || value.isAfter(maxMonth, 'day')) {
      message.info('Solo puedes ver reservaciones del rango mostrado');
      return;
    }
    const list = getListData(value);
    if (list.length) {
      setSelectedDate(value.format('YYYY-MM-DD'));
      setIsModalOpen(true);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  const selectedDayReservations = reservations
    .filter(
      (r) =>
        dayjs.utc(r.reservation_date).local().format('YYYY-MM-DD') ===
        selectedDate
    )
    .sort((a, b) => a.init_hour.localeCompare(b.init_hour));

  // ---------- Título del modal en español “bonito” ----------
  const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const selectedDateLabel = selectedDate
    ? capitalize(dayjs(selectedDate).format('dddd, D [de] MMMM [de] YYYY'))
    : '';

  return (
    <div>
      <h2>Reservación de Salas</h2>
      <div style={{ marginBottom: 12 }}>
        <b>{rangeText}</b>
      </div>

      {loading ? (
        <Skeleton active />
      ) : (
        <Calendar
          key={currentMonth.format('YYYY-MM')}
          cellRender={cellRender}
          onSelect={handleSelect}
          onPanelChange={handlePanelChange}
          value={currentMonth}
        />
      )}

      <Modal
        title={`Itinerario del ${selectedDateLabel}`}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
      >
        <List
          dataSource={selectedDayReservations}
          renderItem={(item) => (
            <List.Item>
              <div>
                <strong>
                  {item.init_hour.slice(0, 5)} - {item.end_hour.slice(0, 5)}
                </strong>
                <br />
                <b>{item.reason}</b>
                <br />
                Sala: {item.room_name}
                <br />
                Solicitado por: {item.user_name}
              </div>
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}

export default RoomReservation;
