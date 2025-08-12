import { Calendar, Badge, Modal, List, Skeleton, message } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useEffect, useState } from 'react';
import api from '../../api/axios';
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

  // Calcula el rango de 2 meses atrás y el mes actual (puede cruzar de año)
  const minMonth = currentMonth.subtract(2, 'month').startOf('month');
  const maxMonth = currentMonth.endOf('month');

  // Texto descriptivo para el usuario
  const rangeText = `Mostrando reservaciones de ${minMonth.format('MMMM YYYY')} a ${maxMonth.format('MMMM YYYY')}`;

  // Carga las reservaciones del mes actual seleccionado
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

  // Permite navegar libremente, pero el rango de badges/modal se filtra abajo
  const handlePanelChange = (value: Dayjs) => {
    setCurrentMonth(value);
  };

  // Solo muestra reservaciones en los días que están en el rango válido
  const getListData = (value: Dayjs) => {
    if (value.isBefore(minMonth, 'day') || value.isAfter(maxMonth, 'day')) {
      return [];
    }
    const dateStr = value.format('YYYY-MM-DD');
    return reservations.filter(
      (r) => dayjs.utc(r.reservation_date).format('YYYY-MM-DD') === dateStr
    );
  };

  // Renderiza el badge solo en días dentro del rango válido
  const cellRender = (value: Dayjs) => {
    const listData = getListData(value);
    if (!listData.length) return null;
    return (
      <ul style={{ padding: 0, listStyle: 'none' }}>
        <li>
          <Badge status="success" text="Existen reservaciones" />
        </li>
      </ul>
    );
  };

  // Solo permite abrir el modal para días en el rango
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

  // Lista las reservaciones del día seleccionado
  const selectedDayReservations = reservations
    .filter((r) => dayjs.utc(r.reservation_date).format('YYYY-MM-DD') === selectedDate)
    .sort((a, b) => a.init_hour.localeCompare(b.init_hour));

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
        title={`Itinerario del ${selectedDate}`}
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
