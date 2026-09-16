/**
 * Equipos de USUARIO (`users_equipo` del backend) que el frontend necesita
 * conocer por id.
 *
 * El 2026-09-16 el equipo LITIGIO (6) se partió en EAS (14, Litigio Civil)
 * y DEJ (15, Litigio Tributario). El backend trata a los tres como "familia
 * Litigio"; cuando una pantalla filtra por equipo Litigio debe pedir los tres.
 */
export const LITIGIO_TEAM_IDS: readonly number[] = [6, 14, 15];

/** CSV listo para los query params `equipo_id` / `equipo_ids` del backend. */
export const LITIGIO_TEAM_IDS_CSV = LITIGIO_TEAM_IDS.join(',');
