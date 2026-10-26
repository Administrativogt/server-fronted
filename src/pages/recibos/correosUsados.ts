// Historial (por navegador) de correos a los que ya se enviaron recibos.
const STORAGE_KEY = 'recibos.correosUsados';
const MAX_RECIENTES = 15;

export const leerRecientes = (): string[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

/** Llamar tras un envío exitoso para que el correo salga primero la próxima vez. */
export const recordarCorreo = (email: string) => {
  const limpio = email.trim().toLowerCase();
  if (!limpio) return;
  try {
    const lista = [limpio, ...leerRecientes().filter((e) => e !== limpio)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista.slice(0, MAX_RECIENTES)));
  } catch {
    // sin almacenamiento (modo privado): solo se pierden los recientes
  }
};
