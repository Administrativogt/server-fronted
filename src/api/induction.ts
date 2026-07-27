import api from './axios';

/**
 * document  → archivo descargable (pdf, imagen, Office)
 * text      → bloque de texto informativo
 * video     → video subido al sistema (tope 50 MB, ver /api/induction/limits)
 * video_url → video alojado en YouTube/Vimeo, se incrusta en la página
 */
export type InductionItemType = 'document' | 'text' | 'video' | 'video_url';

export interface InductionItem {
  id: number;
  item_type: InductionItemType;
  title: string;
  body?: string | null;
  section?: string | null;
  url?: string | null;
  file?: string | null;
  file_name?: string | null;
  sort_order: number;
  active: boolean;
  created?: string;
  creator?: { first_name?: string; last_name?: string } | null;
  has_file?: boolean;
  /** Solo en la respuesta pública, para videos subidos: URL firmada temporal */
  file_url?: string | null;
}

export interface InductionItemPayload {
  item_type: InductionItemType;
  title: string;
  body?: string;
  section?: string;
  module_id?: number | null;
  url?: string;
  sort_order?: number;
  active?: boolean;
  file?: File | null;
}

/** Módulo del programa. Los que tienen `parent_id` son submódulos (3.1, 3.2…). */
export interface InductionModule {
  id: number;
  code: string;
  title: string;
  summary?: string | null;
  duration?: string | null;
  passing_percentage: number;
  parent_id?: number | null;
  sort_order: number;
  active: boolean;
  created?: string;
  item_count?: number;
  question_count?: number;
}

export interface InductionModulePayload {
  code: string;
  title: string;
  summary?: string;
  duration?: string;
  passing_percentage?: number;
  parent_id?: number | null;
  sort_order?: number;
  active?: boolean;
}

/** Pregunta con su respuesta: solo la ve quien administra. */
export interface InductionQuestion {
  id: number;
  text: string;
  options: string[];
  correct_index: number;
  explanation?: string | null;
  sort_order: number;
  active: boolean;
}

export interface InductionQuestionPayload {
  module_id: number;
  text: string;
  options: string[];
  correct_index: number;
  explanation?: string;
  sort_order?: number;
  active?: boolean;
}

/** Pregunta tal como la recibe la página pública: sin la respuesta correcta. */
export interface PublicQuestion {
  id: number;
  text: string;
  options: string[];
}

export interface ProgramModule {
  id: number;
  code: string;
  title: string;
  summary?: string | null;
  duration?: string | null;
  passing_percentage: number;
  /** false para un módulo que solo agrupa submódulos (no tiene evaluación) */
  evaluable: boolean;
  items: InductionItem[];
  questions: PublicQuestion[];
  children: ProgramModule[];
}

export interface EvaluationResult {
  module_id: number;
  total: number;
  correct: number;
  required: number;
  passed: boolean;
  details: {
    question_id: number;
    selected: number;
    correct_index: number;
    ok: boolean;
    explanation?: string | null;
  }[];
}

export interface InductionLimits {
  max_upload_bytes: number;
  max_upload_mb: number;
  allowed_mimes: string[];
}

const toFormData = (payload: Partial<InductionItemPayload>) => {
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || key === 'file') return;
    fd.append(key, String(value));
  });
  if (payload.file) fd.append('file', payload.file);
  return fd;
};

// Público (sin token; el interceptor simplemente no agrega Authorization si no hay sesión)
export const fetchPublicInduction = async (): Promise<InductionItem[]> => {
  const { data } = await api.get('/api/induction/public');
  return data;
};

export const fetchPublicInductionFileUrl = async (id: number): Promise<string> => {
  const { data } = await api.get(`/api/induction/public/file/${id}`);
  return data.url;
};

// Gestión (superusuarios + RRHH)
export const fetchInductionItems = async (): Promise<InductionItem[]> => {
  const { data } = await api.get('/api/induction');
  return data;
};

// El instance de axios trae 'Content-Type: application/json' por defecto y, con
// ese header, axios v1 convierte el FormData a JSON: el File se serializa como
// {} y llega como propiedad `file` en el body, que la ValidationPipe rechaza
// ("property file should not exist"). Hay que declarar multipart explícitamente.
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

export const createInductionItem = async (payload: InductionItemPayload) => {
  const { data } = await api.post('/api/induction', toFormData(payload), MULTIPART);
  return data as InductionItem;
};

export const updateInductionItem = async (
  id: number,
  payload: Partial<InductionItemPayload>,
) => {
  const { data } = await api.patch(
    `/api/induction/${id}`,
    toFormData(payload),
    MULTIPART,
  );
  return data as InductionItem;
};

export const fetchInductionLimits = async (): Promise<InductionLimits> => {
  const { data } = await api.get('/api/induction/limits');
  return data;
};

export const deleteInductionItem = async (id: number) => {
  const { data } = await api.delete(`/api/induction/${id}`);
  return data;
};

// ─── Programa público ───────────────────────────────────────────────────────

export const fetchProgram = async (): Promise<ProgramModule[]> => {
  const { data } = await api.get('/api/induction/public/program');
  return data;
};

/** Manda las respuestas y el backend califica; las correctas nunca viajan al navegador. */
export const evaluateModule = async (
  moduleId: number,
  answers: number[],
): Promise<EvaluationResult> => {
  const { data } = await api.post(
    `/api/induction/public/modules/${moduleId}/evaluate`,
    { answers },
  );
  return data;
};

// ─── Módulos (gestión) ──────────────────────────────────────────────────────

export const fetchInductionModules = async (): Promise<InductionModule[]> => {
  const { data } = await api.get('/api/induction/modules');
  return data;
};

export const createInductionModule = async (payload: InductionModulePayload) => {
  const { data } = await api.post('/api/induction/modules', payload);
  return data as InductionModule;
};

export const updateInductionModule = async (
  id: number,
  payload: Partial<InductionModulePayload>,
) => {
  const { data } = await api.patch(`/api/induction/modules/${id}`, payload);
  return data as InductionModule;
};

export const deleteInductionModule = async (id: number) => {
  const { data } = await api.delete(`/api/induction/modules/${id}`);
  return data;
};

// ─── Preguntas (gestión) ────────────────────────────────────────────────────

export const fetchInductionQuestions = async (
  moduleId: number,
): Promise<InductionQuestion[]> => {
  const { data } = await api.get(`/api/induction/modules/${moduleId}/questions`);
  return data;
};

export const createInductionQuestion = async (
  payload: InductionQuestionPayload,
) => {
  const { data } = await api.post('/api/induction/questions', payload);
  return data as InductionQuestion;
};

export const updateInductionQuestion = async (
  id: number,
  payload: Partial<InductionQuestionPayload>,
) => {
  const { data } = await api.patch(`/api/induction/questions/${id}`, payload);
  return data as InductionQuestion;
};

export const deleteInductionQuestion = async (id: number) => {
  const { data } = await api.delete(`/api/induction/questions/${id}`);
  return data;
};
