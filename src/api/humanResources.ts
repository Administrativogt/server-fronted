import api from './axios';

const BASE = '/human-resources';

export interface MailboxType {
  id: number;
  name: string;
}

export interface ComplaintType {
  id: number;
  name: string;
}

export interface CertificateType {
  id: number;
  name: string;
}

export interface Certificate {
  id: number;
  type: CertificateType | number;
  user: number | string;
  state: number;
  created?: string;
  updated?: string;
}

export interface Suggestion {
  id: number;
  mailbox_type: MailboxType | number;
  description: string;
  user: string;
  anonymous: boolean;
  created?: string;
}

export interface Complaint {
  id: number;
  mailbox_type: MailboxType | number;
  type: ComplaintType | number;
  description: string;
  user: string;
  anonymous: boolean;
  other_type?: string | null;
  created?: string;
}

export interface Observation {
  id: number;
  description: string;
  created?: string;
}

export async function fetchMailboxTypes(): Promise<MailboxType[]> {
  const { data } = await api.get(`${BASE}/mailbox-types`);
  return data;
}

export async function fetchComplaintTypes(): Promise<ComplaintType[]> {
  const { data } = await api.get(`${BASE}/complaint-types`);
  return data;
}

export async function fetchCertificateTypes(): Promise<CertificateType[]> {
  const { data } = await api.get(`${BASE}/certificate-types`);
  return data;
}

export async function createCertificate(payload: { type: number; user: number }) {
  const { data } = await api.post(`${BASE}/certificates`, payload);
  return data;
}

export async function fetchPendingCertificates(): Promise<Certificate[]> {
  const { data } = await api.get(`${BASE}/certificates`);
  return data;
}

export async function fetchAllCertificates(): Promise<Certificate[]> {
  const { data } = await api.get(`${BASE}/certificates/all`);
  return data;
}

export async function fetchCertificate(id: number): Promise<Certificate> {
  const { data } = await api.get(`${BASE}/certificates/${id}`);
  return data;
}

export async function updateCertificateState(id: number, state: number) {
  const { data } = await api.patch(`${BASE}/certificates/${id}`, { state });
  return data;
}

export async function createSuggestion(payload: {
  mailbox_type: number;
  description: string;
  user: string;
  anonymous: boolean;
}) {
  const { data } = await api.post(`${BASE}/suggestions`, payload);
  return data;
}

export async function fetchSuggestions(): Promise<Suggestion[]> {
  const { data } = await api.get(`${BASE}/suggestions`);
  return data;
}

export async function fetchSuggestion(id: number): Promise<Suggestion> {
  const { data } = await api.get(`${BASE}/suggestions/${id}`);
  return data;
}

export async function filterSuggestions(payload: {
  mailbox_type?: number;
  date?: string;
  user?: string;
}) {
  const { data } = await api.post(`${BASE}/suggestions/filter`, payload);
  return data as Suggestion[];
}

export async function addSuggestionObservation(payload: { pk: number; description: string }) {
  const { data } = await api.post(`${BASE}/suggestions/observation`, payload);
  return data;
}

export async function fetchSuggestionObservations(id: number): Promise<Observation[]> {
  const { data } = await api.post(`${BASE}/suggestions/${id}/observations`, {});
  return data;
}

export async function createComplaint(payload: {
  mailbox_type: number;
  type: number;
  description: string;
  user: string;
  anonymous: boolean;
  other_type?: string;
}) {
  const { data } = await api.post(`${BASE}/complaints`, payload);
  return data;
}

export async function fetchComplaints(): Promise<Complaint[]> {
  const { data } = await api.get(`${BASE}/complaints`);
  return data;
}

export async function fetchComplaint(id: number): Promise<Complaint> {
  const { data } = await api.get(`${BASE}/complaints/${id}`);
  return data;
}

export async function filterComplaints(payload: {
  mailbox_type?: number;
  date?: string;
  user?: string;
}) {
  const { data } = await api.post(`${BASE}/complaints/filter`, payload);
  return data as Complaint[];
}

export async function addComplaintObservation(payload: { pk: number; description: string }) {
  const { data } = await api.post(`${BASE}/complaints/observation`, payload);
  return data;
}

export async function fetchComplaintObservations(id: number): Promise<Observation[]> {
  const { data } = await api.post(`${BASE}/complaints/${id}/observations`, {});
  return data;
}
