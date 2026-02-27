export interface ProcessType {
  id: number;
  name: string;
  stages: number; // total de etapas
}

export interface Stage {
  id: number;
  name: string;
  created: string;
  start: string;           // era "start_date"
  duration: number;        // era "duration_months"
  date_format: 0 | 1 | 2; // 0=manual, 1=días hábiles, 2=meses
  finalization: string | null; // era "end_date"
  creator?: any;
}

export interface Installment {
  id: number;
  created: string;
  expedient_number: string;
  start_date: string;
  end_date: string | null;
  client: string;
  state: "1" | "2";        // "1"=Activo, "2"=Finalizado
  process_type: ProcessType;
  stages: Stage[];          // no existe "current_stage" en el API
  creator?: any;
}

export interface CreateInstallmentDto {
  expedient_number: string;
  start_date: string;
  client: string;
  process_type_id: number;
}

export interface UpdateStageDto {
  name?: string;
  start?: string;
  finalization?: string;
  duration?: number;
  date_format?: 0 | 1 | 2;
}

export interface InstallmentsResponse {
  data: Installment[];
  count: number;      // era "total" — el API retorna "count"
  page: number;
  limit: number;
  totalPages: number;
}
