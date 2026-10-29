import React, { useEffect, useState } from 'react';
import { Alert } from 'antd';
import api from '../api/axios';

interface SirvoAvailability {
  available: boolean;
  since: string | null;
  lastCheckedAt: string | null;
  liquidationAvailable?: boolean;
  liquidationSince?: string | null;
}

const POLL_MS = 60_000;

function formatSince(iso: string): string {
  const d = new Date(iso);
  const hora = d.toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Guatemala',
  });
  const hoy = new Date().toLocaleDateString('es-GT', { timeZone: 'America/Guatemala' });
  const dia = d.toLocaleDateString('es-GT', { timeZone: 'America/Guatemala' });
  return dia === hoy ? `las ${hora}` : `el ${dia} a las ${hora}`;
}

/**
 * Aviso global cuando Sirvo (autorización y liquidación de cheques) está caído.
 * El backend lo detecta con el sync de cada 2 min; aparece y desaparece solo.
 */
const SirvoStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<SirvoAvailability | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api
        .get<SirvoAvailability>('/sirvo/status')
        .then((res) => {
          if (!cancelled) setStatus(res.data);
        })
        // Si no se puede consultar el estado, no se muestra nada.
        .catch(() => undefined);
    };
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!status) return null;

  if (!status.available) {
    return (
      <Alert
        type="warning"
        showIcon
        style={{ margin: '16px 16px 0' }}
        message="Sirvo no está disponible en este momento"
        description={
          <>
            El sistema de Sirvo no responde{status.since ? ` desde ${formatSince(status.since)}` : ''}, por
            lo que por ahora <strong>no se pueden autorizar ni liquidar cheques</strong>. Ya estamos
            trabajando con el proveedor para resolverlo. Este aviso desaparecerá cuando el servicio
            vuelva a la normalidad.
          </>
        }
      />
    );
  }

  if (status.liquidationAvailable === false) {
    return (
      <Alert
        type="warning"
        showIcon
        style={{ margin: '16px 16px 0' }}
        message="La liquidación de cheques no está funcionando"
        description={
          <>
            {status.liquidationSince ? `Desde ${formatSince(status.liquidationSince)}, ` : ''}Sirvo está
            rechazando las liquidaciones por un problema en su sistema contable, por lo que{' '}
            <strong>por ahora no se pueden liquidar cheques</strong>. No es un error de los datos
            ingresados. Ya lo reportamos al proveedor y estamos dando seguimiento. Este aviso desaparecerá
            cuando las liquidaciones vuelvan a funcionar.
          </>
        }
      />
    );
  }

  return null;
};

export default SirvoStatusBanner;
