// Flujo de entrega compartido (Pendientes / Todos / Asignados), fiel al Django
// viejo: modal "Confirmación de entrega" → si hoy > fecha_realizacion, modal
// "Entrega tardía" con razón obligatoria → PATCH estado 3 (u 8 si venía de
// Extraordinario) + fecha_entrega (+ razon_tardanza). Antes solo se mandaba
// estado:3 y fecha_entrega quedaba NULL (rompía reportes de tiempos).
import { Input, Modal, message } from 'antd';
import dayjs from 'dayjs';
import { updateEncargo } from '../../api/encargos';
import type { Encargo } from '../../types/encargo';

const patchEntrega = async (encargo: Encargo, razonTardanza?: string) => {
  await updateEncargo(encargo.id, {
    estado: encargo.estado === 5 ? 8 : 3,
    fecha_entrega: dayjs().format('YYYY-MM-DD'),
    ...(razonTardanza ? { razon_tardanza: razonTardanza } : {}),
  } as any);
};

const promptTardanza = (encargo: Encargo, onDone: () => void) => {
  let razon = '';
  Modal.confirm({
    title: 'Entrega tardía',
    content: (
      <div>
        <p>La fecha de realización ya pasó. Ingrese la razón de la tardanza:</p>
        <Input.TextArea
          rows={3}
          placeholder="Razón"
          onChange={(e) => {
            razon = e.target.value;
          }}
        />
      </div>
    ),
    okText: 'Confirmar',
    cancelText: 'Cancelar',
    onOk: async () => {
      if (!razon.trim()) {
        message.warning('Debe ingresar la razón de la tardanza');
        return Promise.reject();
      }
      try {
        await patchEntrega(encargo, razon.trim());
        message.success('Envío marcado como entregado');
        onDone();
      } catch (err: any) {
        message.error(err?.response?.data?.message || 'Error al entregar');
        return Promise.reject();
      }
    },
  });
};

/** Botón "Entregado" del flujo viejo: confirmación + razón si va tarde. */
export const confirmarEntrega = (encargo: Encargo, onDone: () => void) => {
  const fecha = (encargo.fecha_realizacion || '').split('T')[0];
  const esTardia = fecha ? dayjs().format('YYYY-MM-DD') > fecha : false;
  Modal.confirm({
    title: 'Confirmación de entrega',
    content: '¿Confirma que la solicitud se entregó?',
    okText: 'Confirmar',
    cancelText: 'Cancelar',
    onOk: async () => {
      if (esTardia) {
        promptTardanza(encargo, onDone);
        return;
      }
      try {
        await patchEntrega(encargo);
        message.success('Envío marcado como entregado');
        onDone();
      } catch (err: any) {
        message.error(err?.response?.data?.message || 'Error al entregar');
      }
    },
  });
};
