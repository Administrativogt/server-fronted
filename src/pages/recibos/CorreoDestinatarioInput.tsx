// Campo "correo del destinatario" con sugerencias. En Django el navegador
// autocompletaba porque era un <form> clásico; dentro del modal de React no
// guarda historial, así que lo reponemos: primero los correos que este
// navegador ya usó y, al escribir, la búsqueda en el servidor por correo o
// nombre: correos a los que ya se enviaron recibos (cualquier usuario; el
// backend guarda cada envío), firma, clientes, contactos y proveedores.
import React, { useEffect, useMemo, useState } from 'react';
import { AutoComplete } from 'antd';
import cashReceiptsApi from '../../api/cashReceipts';
import type { EmailSuggestion } from '../../api/cashReceipts';
import { leerRecientes } from './correosUsados';

const GRUPOS: Record<EmailSuggestion['source'], string> = {
  Enviado: 'Ya se les enviaron recibos',
  Firma: 'Usuarios de la firma',
  Cliente: 'Clientes',
  Contacto: 'Contactos de clientes',
  Proveedor: 'Proveedores',
  Nombramiento: 'Nombramientos',
};

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const CorreoDestinatarioInput: React.FC<Props> = ({ value, onChange }) => {
  const [recientes] = useState<string[]>(leerRecientes);
  const [resultados, setResultados] = useState<EmailSuggestion[]>([]);
  const q = value.trim();

  useEffect(() => {
    if (q.length < 2) {
      setResultados([]);
      return;
    }
    let vigente = true;
    const t = setTimeout(() => {
      cashReceiptsApi
        .getEmailSuggestions(q)
        .then((r) => vigente && setResultados(r.data))
        .catch(() => vigente && setResultados([]));
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [q]);

  const options = useMemo(() => {
    const ql = q.toLowerCase();
    const nombre = new Map(resultados.map((r) => [r.email, r.name]));
    const usados = recientes
      .filter((e) => !ql || e.includes(ql) || (nombre.get(e) ?? '').toLowerCase().includes(ql))
      .map((e) => ({ value: e, label: nombre.get(e) ? `${e} · ${nombre.get(e)}` : e }));

    const grupos = new Map<string, { value: string; label: string }[]>();
    for (const r of resultados) {
      if (recientes.includes(r.email)) continue;
      const g = GRUPOS[r.source] ?? r.source;
      if (!grupos.has(g)) grupos.set(g, []);
      grupos.get(g)!.push({ value: r.email, label: r.name ? `${r.email} · ${r.name}` : r.email });
    }

    return [
      ...(usados.length ? [{ label: 'Usados recientemente', options: usados }] : []),
      ...[...grupos].map(([label, opts]) => ({ label, options: opts })),
    ];
  }, [q, resultados, recientes]);

  return (
    <AutoComplete
      style={{ width: '100%' }}
      value={value}
      options={options}
      onChange={(v) => onChange(v ?? '')}
      placeholder="Escriba el nombre, empresa o correo del destinatario"
      autoFocus
      allowClear
    />
  );
};

export default CorreoDestinatarioInput;
