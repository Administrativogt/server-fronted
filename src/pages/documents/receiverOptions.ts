import type { User } from "../../types/user.types";

// Opciones agrupadas para el select "Recibido por": los receptores habituales
// (mensajeros + recepción) primero, y debajo el resto de usuarios activos.
export function buildReceiverOptions(receivers: User[], allUsers: User[]) {
  const receiverIds = new Set(receivers.map((u) => u.id));
  const others = allUsers.filter((u) => !receiverIds.has(u.id));

  const toOption = (u: User) => ({
    value: u.id,
    label: `${u.first_name} ${u.last_name}`,
  });

  const groups = [
    { label: "Receptores habituales", options: receivers.map(toOption) },
  ];
  if (others.length > 0) {
    groups.push({ label: "Otros usuarios", options: others.map(toOption) });
  }
  return groups;
}
