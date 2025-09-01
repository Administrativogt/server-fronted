import { createEvent } from 'ics';
import { Dayjs } from 'dayjs';

export function generarConvocatoriaICS({
  title,
  description,
  location,
  startDateTime,
  endDateTime,
  attendeesEmails,
}: {
  title: string;
  description: string;
  location: string;
  startDateTime: Dayjs;
  endDateTime: Dayjs;
  attendeesEmails: string[];
}) {
  const start: [number, number, number, number, number] = [
    startDateTime.year(),
    startDateTime.month() + 1,
    startDateTime.date(),
    startDateTime.hour(),
    startDateTime.minute(),
  ];

  const end: [number, number, number, number, number] = [
    endDateTime.year(),
    endDateTime.month() + 1,
    endDateTime.date(),
    endDateTime.hour(),
    endDateTime.minute(),
  ];

  const event = {
    title,
    description,
    location,
    start,
    end,
    attendees: attendeesEmails.map(email => ({ email })),
  };

  createEvent(event, (error, value) => {
    if (error) {
      console.error('Error al generar el archivo .ics', error);
      return;
    }

    const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'convocatoria.ics';
    a.click();
    URL.revokeObjectURL(url);
  });
}
