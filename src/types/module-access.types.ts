export type ModuleKey =
  // Módulos operativos internos
  | 'encargos'
  | 'reservas_salas'
  | 'actas'
  | 'notificaciones'
  | 'expedientes_judiciales'
  | 'procuracion'
  | 'clientes'
  | 'solicitudes_dinero'
  | 'recibos_caja'
  | 'control_plazos'
  | 'cheques'
  | 'autorizacion_cheques'
  | 'archivo'
  | 'contabilidad'
  | 'recursos_humanos'
  | 'tickets'
  | 'escrituras'
  // Módulos administrativos
  | 'usuarios'
  | 'grupos'
  | 'permisos'
  | 'areas'
  | 'equipos'
  | 'feriados'
  // Módulos con acceso especial
  | 'asignacion_mensajeria'
  | 'cargabilidad';

export interface ModuleAccessItem {
  key: ModuleKey;
  label: string;
  path: string;
}

