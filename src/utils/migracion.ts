// Mismo criterio que MigracionGastosService.canView en el backend (que es
// quien decide de verdad; esto solo oculta la opción del menú).

/** Equipo de usuario de Migración (users_equipo). */
export const MIGRACION_EQUIPO_ID = 5;

const CONTABILIDAD = 9;
const SOCIO = 1;
const SOCIO_DE_PRACTICA = 11;
const SECRETARIA = 6;

/** Control de dinero: superusuarios y todo el equipo de Migración (el backend filtra lo que ve cada quien). */
export const canSeeMigracionDinero = (isSuperuser: boolean, equipoId: number | null): boolean =>
  isSuperuser || equipoId === MIGRACION_EQUIPO_ID;

export const canSeeMigracionGastos = (
  isSuperuser: boolean,
  tipoUsuario: number | null,
  equipoId: number | null,
): boolean => {
  if (isSuperuser) return true;
  if (tipoUsuario === CONTABILIDAD) return true;
  return (
    equipoId === MIGRACION_EQUIPO_ID &&
    tipoUsuario !== null &&
    [SOCIO, SOCIO_DE_PRACTICA, SECRETARIA].includes(tipoUsuario)
  );
};
