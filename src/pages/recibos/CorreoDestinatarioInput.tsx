// Campo "correo del destinatario" con sugerencias. En Django el navegador
// autocompletaba porque era un <form> clásico; dentro del modal de React no
// guarda historial, así que lo reponemos: primero los correos que este
// navegador ya usó, después los de los usuarios activos de la firma.
import React, { useEffect, useMemo, useState } from 'react';
import { AutoComplete } from 'antd';
import cashReceiptsApi from '../../api/cashReceipts';
import { leerRecientes } from './correosUsados';

type Sugerencia = { email: string; name: string };

let cacheFirma: Promise<Sugerencia[]> | null = null;
const cargarFirma = () => {
  if (!cacheFirma) {
    cacheFirma = cashReceiptsApi
      .getEmailSuggestions()
      .then((r) => r.data)
      .catch(() => {
        cacheFirma = null;
        return [];
      });
  }
  return cacheFirma;
};

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const CorreoDestinatarioInput: React.FC<Props> = ({ value, onChange }) => {
  const [firma, setFirma] = useState<Sugerencia[]>([]);
  const [recientes] = useState<string[]>(leerRecientes);

  useEffect(() => {
    let vivo = true;
    cargarFirma().then((data) => vivo && setFirma(data));
    return () => {
      vivo = false;
    };
  }, []);

  const options = useMemo(() => {
    const q = value.trim().toLowerCase();
    const coincide = (texto: string) => !q || texto.toLowerCase().includes(q);
    const nombrePorCorreo = new Map(firma.map((f) => [f.email, f.name]));

    const usados = recientes
      .filter((e) => coincide(`${e} ${nombrePorCorreo.get(e) ?? ''}`))
      .map((e) => ({
        value: e,
        label: nombrePorCorreo.has(e) ? `${e} · ${nombrePorCorreo.get(e)}` : e,
      }));

    // Sin texto no se lista toda la firma (son cientos): solo los recientes.
    const deFirma = q
      ? firma
          .filter((f) => !recientes.includes(f.email) && coincide(`${f.email} ${f.name}`))
          .slice(0, 20)
          .map((f) => ({ value: f.email, label: `${f.email} · ${f.name}` }))
      : [];

    return [
      ...(usados.length ? [{ label: 'Usados recientemente', options: usados }] : []),
      ...(deFirma.length ? [{ label: 'Usuarios de la firma', options: deFirma }] : []),
    ];
  }, [value, firma, recientes]);

  return (
    <AutoComplete
      style={{ width: '100%' }}
      value={value}
      options={options}
      onChange={(v) => onChange(v ?? '')}
      placeholder="Escriba el nombre o correo del destinatario"
      autoFocus
      allowClear
    />
  );
};

export default CorreoDestinatarioInput;
