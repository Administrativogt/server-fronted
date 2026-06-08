// Tipos del submódulo "Asambleas" (dentro de Actas de Nombramiento)
// Contrato espejo del backend NestJS: /api/asambleas, /api/sociedades, /api/reglas-notificacion

// enums como objetos const (el proyecto usa `erasableSyntaxOnly`, sin `enum`)
export const EstadoAsamblea = {
  PENDIENTE: 'PENDIENTE',
  COMPLETADA: 'COMPLETADA',
} as const;
export type EstadoAsamblea = (typeof EstadoAsamblea)[keyof typeof EstadoAsamblea];

export const TipoMatchRegla = {
  USER: 'USER',
  NOMBRE: 'NOMBRE',
} as const;
export type TipoMatchRegla = (typeof TipoMatchRegla)[keyof typeof TipoMatchRegla];

export interface PublicUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface Sociedad {
  id: number;
  nombre: string;
  emailContacto: string;
  contactoAdicional: string | null;
  responsable: PublicUser | null;
  /** 1=Enero, 2=Febrero, 3=Marzo, 4=Abril */
  mesAsamblea: number;
  /** 1=activo, 2=inactivo */
  state: number;
  createdAt: string;
  updatedAt: string;
}

export interface Asamblea {
  id: number;
  sociedad: Sociedad | null;
  periodo: number;
  anio: number;
  estado: EstadoAsamblea;
  marcadaParaEnvio: boolean;
  seleccionToken: string | null;
  preAlertaEnviada: boolean;
  recordatorioEnviado: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReglaNotificacion {
  id: number;
  descripcion: string;
  matchTipo: TipoMatchRegla;
  matchValor: string;
  usarEmailResponsable: boolean;
  destinatarios: string;
  copias: string;
  prioridad: number;
  /** 1=activa, 2=inactiva */
  state: number;
  createdAt: string;
  updatedAt: string;
}

// ─── DTOs ──────────────────────────────────────────────────────────────────
export interface CreateAsambleaDto {
  sociedadId: number;
  periodo?: number;
  anio?: number;
}
export interface UpdateAsambleaDto {
  estado?: EstadoAsamblea;
  marcadaParaEnvio?: boolean;
}

export interface CreateSociedadDto {
  nombre: string;
  emailContacto: string;
  contactoAdicional?: string;
  mesAsamblea: number;
}
export interface UpdateSociedadDto {
  nombre?: string;
  emailContacto?: string;
  contactoAdicional?: string;
  mesAsamblea?: number;
  responsableId?: number;
}

export interface CreateReglaDto {
  descripcion: string;
  matchTipo: TipoMatchRegla;
  matchValor: string;
  usarEmailResponsable?: boolean;
  destinatarios?: string;
  copias?: string;
  prioridad?: number;
}
export interface UpdateReglaDto extends Partial<CreateReglaDto> {
  /** 1=activa, 2=inactiva */
  state?: number;
}

// ─── Catálogo de períodos ────────────────────────────────────────────────────
export const PERIODOS_ASAMBLEA: { mes: number; label: string }[] = [
  { mes: 1, label: 'Enero' },
  { mes: 2, label: 'Febrero' },
  { mes: 3, label: 'Marzo' },
  { mes: 4, label: 'Abril' },
];

export const getPeriodoLabel = (mes: number): string =>
  PERIODOS_ASAMBLEA.find((p) => p.mes === mes)?.label ?? `Mes ${mes}`;

export const fullName = (u: PublicUser | null | undefined): string =>
  u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.username : '—';
