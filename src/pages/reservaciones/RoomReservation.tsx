import { Calendar, Badge, Modal, List, Skeleton, message, Select } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import utc from 'dayjs/plugin/utc';
import { useEffect, useState, useMemo } from 'react';
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

interface Room {
  id: number;
  name: string;
  price_per_hour: string | null;
}

function RoomReservation() {
  const [reservations, setReservations] = useState<ApiReservation[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);

  const today = dayjs();
  const minMonth = today.subtract(5, 'month').startOf('month');
  const maxMonth = today.add(5, 'month').endOf('month');

  const rangeText = `Mostrando reservaciones de ${maxMonth.format('MMMM YYYY')}`;

  // 🔹 Obtener TODAS las salas disponibles (no solo las que tienen reservaciones)
  const roomOptions = useMemo(() => {
    return allRooms
      .filter(r => r.price_per_hour != null) // Solo salas con precio
      .map(r => ({ label: r.name, value: r.name }));
  }, [allRooms]);

  // Cargar todas las salas disponibles al inicio
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const { data } = await api.get<Room[]>('/rooms');
        setAllRooms(data || []);
      } catch (error) {
        console.error('Error al cargar salas:', error);
        message.error('Error al cargar las salas disponibles');
      }
    };
    loadRooms();
  }, []);

  // Cargar reservaciones del mes actual
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
    if (value.isBefore(minMonth, 'month')) {
      message.info('Solo puedes ver reservaciones dentro de 5 meses atrás, el mes actual y 5 meses próximos');
      setCurrentMonth(minMonth);
      return;
    }
    if (value.isAfter(maxMonth, 'month')) {
      message.info('Solo puedes ver reservaciones dentro de 5 meses atrás, el mes actual y 5 meses próximos');
      setCurrentMonth(maxMonth);
      return;
    }
    setCurrentMonth(value);
  };

  const getListData = (value: Dayjs) => {
    if (value.isBefore(minMonth, 'day') || value.isAfter(maxMonth, 'day')) {
      return [];
    }
    const dateStr = value.format('YYYY-MM-DD');

    return reservations.filter((r) => {
      const matchDate =
        dayjs.utc(r.reservation_date).local().format('YYYY-MM-DD') === dateStr;
      const matchRoom =
        selectedRooms.length === 0 || selectedRooms.includes(r.room_name);
      return matchDate && matchRoom;
    });
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
      message.info('Solo puedes ver reservaciones dentro de 5 meses atrás, el mes actual y 5 meses próximos');
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
    .filter((r) => {
      const matchDate =
        dayjs.utc(r.reservation_date).local().format('YYYY-MM-DD') ===
        selectedDate;
      const matchRoom =
        selectedRooms.length === 0 || selectedRooms.includes(r.room_name);
      return matchDate && matchRoom;
    })
    .sort((a, b) => a.init_hour.localeCompare(b.init_hour));

  const capitalize = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  const selectedDateLabel = selectedDate
    ? capitalize(dayjs(selectedDate).format('dddd, D [de] MMMM [de] YYYY'))
    : '';

  return (
    <div>
      <h2>Reservación de Salas</h2>

      {/* 🔹 Select de Filtros por Sala (más compacto) */}
      <div style={{ marginBottom: 12 }}>
        <b>Filtrar por sala:</b>
        <Select
          mode="multiple"
          allowClear
          placeholder={allRooms.length === 0 ? "Cargando salas..." : "Todas las salas"}
          size="small" // 🔑 compacto en altura
          maxTagCount="responsive" // 🔑 colapsa etiquetas largas
          style={{ width: '100%', maxWidth: 500, marginTop: 8 }} // 🔑 ancho limitado
          options={roomOptions}
          value={selectedRooms}
          onChange={(val) => setSelectedRooms(val)}
          disabled={allRooms.length === 0}
          loading={allRooms.length === 0}
        />
      </div>

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
