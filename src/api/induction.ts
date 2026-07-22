import api from './axios';

export interface InductionItem {
  id: number;
  item_type: 'document' | 'text';
  title: string;
  body?: string | null;
  section?: string | null;
  file?: string | null;
  file_name?: string | null;
  sort_order: number;
  active: boolean;
  created?: string;
  creator?: { first_name?: string; last_name?: string } | null;
  has_file?: boolean;
}

export interface InductionItemPayload {
  item_type: 'document' | 'text';
  title: string;
  body?: string;
  section?: string;
  sort_order?: number;
  active?: boolean;
  file?: File | null;
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

export const createInductionItem = async (payload: InductionItemPayload) => {
  const { data } = await api.post('/api/induction', toFormData(payload));
  return data as InductionItem;
};

export const updateInductionItem = async (
  id: number,
  payload: Partial<InductionItemPayload>,
) => {
  const { data } = await api.patch(`/api/induction/${id}`, toFormData(payload));
  return data as InductionItem;
};

export const deleteInductionItem = async (id: number) => {
  const { data } = await api.delete(`/api/induction/${id}`);
  return data;
};
