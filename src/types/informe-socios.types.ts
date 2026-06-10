export interface InformeSocio {
  id: number;
  codigo: string;
  nombre: string;
  email: string;
  activo: boolean;
}

export interface InformeStats {
  total_casos: number;
  total_clientes: number;
  total_socios: number;
}

export interface PreviewResumenSocio {
  codigo: string;
  nombre: string;
  casos_encargado: number;
  casos_coordinador: number;
  clientes: number;
}

export interface CodigoDetectado {
  codigo: string;
  como_encargado: number;
  como_coordinador: number;
  clientes: number;
  tiene_socio: boolean;
}

export interface PreviewReporte {
  casos_en_periodo: number;
  clientes_en_periodo: number;
  resumen_por_socio: PreviewResumenSocio[];
  codigos_detectados: CodigoDetectado[];
}

export interface GenerarReporteResult {
  socios_procesados: number;
  emails_enviados: number;
  errores: string[];
}

export interface ImportResult {
  importados: number;
}

export interface InformeCasoRow {
  id: number;
  directorio?: string;
  nombre?: string;
  caso?: number;
  descripcion?: string;
  encargado_cliente?: string;
  encargado?: string;
  coordinador?: string;
  responsable?: string;
  area?: string;
  equipo?: string;
  fecha?: string;
  pacto?: string;
}

export interface InformeClienteRow {
  id: number;
  cliente?: string;
  razon_social?: string;
  pais?: string;
  socio_encargado_cliente?: string;
  fecha?: string;
  sector_economico?: string;
  origen_cliente?: string;
  obs_origen_cliente?: string;
  email?: string;
  registro_creacion?: string;
}
