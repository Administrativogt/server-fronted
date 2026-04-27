import api from './axios';
import type {
  AllCatalogs,
  CatalogKind,
  DashboardStats,
  JurisprudenceCatalog,
  PaginatedSentences,
  Sentence,
  SentenceFilter,
  SentenceFormPayload,
} from '../types/jurisprudence.types';

const BASE = '/jurisprudence';

export async function fetchCatalogs(): Promise<AllCatalogs> {
  const { data } = await api.get<AllCatalogs>(`${BASE}/catalogs`);
  return data;
}

export async function fetchCatalog(kind: CatalogKind): Promise<JurisprudenceCatalog[]> {
  const { data } = await api.get<JurisprudenceCatalog[]>(`${BASE}/catalogs/${kind}`);
  return data;
}

export async function createCatalogItem(
  kind: CatalogKind,
  name: string,
): Promise<JurisprudenceCatalog> {
  const { data } = await api.post<JurisprudenceCatalog>(`${BASE}/catalogs/${kind}`, { name });
  return data;
}

export async function listSentences(
  page = 1,
  pageSize = 12,
): Promise<PaginatedSentences> {
  const { data } = await api.get<PaginatedSentences>(`${BASE}/sentences`, {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function searchSentences(
  search: string,
  page = 1,
  pageSize = 12,
): Promise<PaginatedSentences> {
  const { data } = await api.get<PaginatedSentences>(`${BASE}/sentences/search`, {
    params: { search, page, page_size: pageSize },
  });
  return data;
}

export async function filterSentences(filter: SentenceFilter): Promise<PaginatedSentences> {
  const { data } = await api.post<PaginatedSentences>(`${BASE}/sentences/filter`, filter);
  return data;
}

export async function getSentence(id: number): Promise<Sentence> {
  const { data } = await api.get<Sentence>(`${BASE}/sentences/${id}`);
  return data;
}

export async function getSentenceFileUrl(id: number): Promise<string | null> {
  const { data } = await api.get<{ url: string | null }>(`${BASE}/sentences/${id}/file-url`);
  return data.url;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>(`${BASE}/dashboard/stats`);
  return data;
}

function buildFormData(payload: SentenceFormPayload, file?: File | null): FormData {
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((v) => fd.append(key, String(v)));
    } else if (typeof value === 'boolean') {
      fd.append(key, value ? 'true' : 'false');
    } else {
      fd.append(key, String(value));
    }
  });
  if (file) fd.append('sentence_file', file);
  return fd;
}

export async function createSentence(
  payload: SentenceFormPayload,
  file?: File | null,
): Promise<Sentence> {
  const fd = buildFormData(payload, file);
  const { data } = await api.post<Sentence>(`${BASE}/sentences`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updateSentence(
  id: number,
  payload: SentenceFormPayload,
  file?: File | null,
): Promise<Sentence> {
  const fd = buildFormData(payload, file);
  const { data } = await api.put<Sentence>(`${BASE}/sentences/${id}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
