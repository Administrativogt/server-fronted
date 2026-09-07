// Tipos del submódulo Horas Socios (Mapa de Horas - Formato Time Manager)

export interface HorasEquipo {
  id: number;
  nombre: string; // "ARM - Inmobiliario"
  socio_codigo: string; // "ARM"
  activo: boolean;
}

export interface HorasTimekeeper {
  id: number;
  nombre: string; // nombre EXACTO del Usuario en Time Manager
  equipo: HorasEquipo;
  activo: boolean;
}

export type CategoriaNF =
  | 'FORMACION'
  | 'CONSORTIUM'
  | 'COBRO_FACTURACION'
  | 'PRO_BONO'
  | 'GESTION_ADMINISTRATIVA'
  | 'CNC';

export interface HorasCasoEspecial {
  id: number;
  numero_caso: string;
  categoria: CategoriaNF;
  descripcion?: string;
}

export interface HorasDestinatario {
  id: number;
  socio_codigo: string;
  nombre_socio?: string;
  email_para: string; // separados por coma
  emails_cc?: string; // separados por coma
  activo: boolean;
}

export interface HorasImportacion {
  id: number;
  fecha_importacion: string;
  anio: number;
  semestre: number; // 1 | 2
  fecha_min: string;
  fecha_max: string;
  total_registros: number;
  archivo_nombre?: string;
  creado_por_nombre?: string;
}

export type EstadoFirma = 'activo' | 'inactivo' | 'no_encontrado';

export interface UsuarioFueraFirma {
  name: string;
  minutes: number;
  hours: number;
}

export interface FilaReporte {
  usuario: string;
  equipo: string;
  socio: string;
  estadoFirma: EstadoFirma;
  totalMes: number[]; // minutos por mes [6]
  totalHoras: number;
  factMes: number[];
  totalFact: number;
  nfFormacion: number;
  nfConsortium: number;
  nfCobro: number;
  nfProBono: number;
  nfGestion: number;
  totalNoCobrables: number;
  cnc: number;
  totalNfNcCnc: number;
  valorFacturable: number;
  valorNoFacturable: number;
}

export interface ReporteHoras {
  importacion: HorasImportacion;
  anio: number;
  semestre: number;
  meses: number[];
  mesesNombres: string[];
  mesesCompletos: string[];
  mesParcial: string | null;
  filas: FilaReporte[];
  totales: FilaReporte;
  usuariosSinEquipo: string[];
  /** Inactivos en la firma: EXCLUIDOS del reporte (filas, totales, correos). */
  usuariosInactivos: UsuarioFueraFirma[];
  /** Sin coincidencia en usuarios del sistema: se mantienen, solo se señalan. */
  usuariosNoEncontrados: UsuarioFueraFirma[];
  socios: string[];
}

export interface ImportarResult {
  importacion: HorasImportacion;
  usuariosSinEquipo: string[];
}

export interface EnvioResultado {
  socio: string;
  destinatario?: string;
  cc?: string;
  estado: string;
}

export interface EnviarResult {
  dryRun: boolean;
  periodo: string;
  resultado: EnvioResultado[];
}

export interface HorasEnvio {
  id: number;
  importacion_id: number;
  socio_codigo: string;
  fecha_envio: string;
  destinatarios?: string;
  enviado_por?: string;
}
