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
