import api from './axios';

const BASE = '/human-resources';

// ============================================
// INTERFACES - Datos Maestros
// ============================================

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

// ============================================
// INTERFACES - Certificados
// ============================================

export interface CertificateUser {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
}

export interface Certificate {
  id: number;
  type: CertificateType;
  user: CertificateUser;
  create: string;
  state: number;
}

// ============================================
// INTERFACES - Boletos de Ornato
// ============================================

export interface OrnamentTicketUser {
  id: number;
  first_name: string;
  last_name: string;
}

export interface OrnamentTicket {
  id: number;
  file: string | null;
  upload: string;
  user: OrnamentTicketUser;
  uploaded?: boolean;
  limit_date?: string;
}

export interface OrnamentTicketIndex {
  ornament_tickets: OrnamentTicket[];
  ornament_user_apply: boolean;
  partner: OrnamentTicketUser | null;
}

// ============================================
// INTERFACES - Sugerencias
// ============================================

export interface Observation {
  id: number;
  description: string;
  created?: string;
}

export interface Suggestion {
  id: number;
  mailbox_type: MailboxType;
  description: string;
  user: string | null;
  anonymous: boolean;
  created?: string;
  file: string | null;
  observations?: Observation[];
}

// ============================================
// INTERFACES - Denuncias
// ============================================

export interface Complaint {
  id: number;
  mailbox_type: MailboxType;
  type: ComplaintType;
  description: string;
  user: string | null;
  anonymous: boolean;
  other_type?: string;
  created?: string;
  file: string | null;
  observations?: Observation[];
}

// ============================================
// API - Datos Maestros (Catálogos)
// ============================================

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

// ============================================
// API - Certificados (Constancias)
// ============================================

export async function requestWorkCertificate(): Promise<Certificate> {
  const { data } = await api.post(`${BASE}/certificates/work-request`);
  return data;
}

export async function requestIgssCertificate(requestDate?: string): Promise<Certificate> {
  const payload = requestDate ? { request_date: requestDate } : {};
  const { data } = await api.post(`${BASE}/certificates/igss-request`, payload);
  return data;
}

export async function createCertificate(payload: { type: number; user: number; state?: number }): Promise<Certificate> {
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

export async function updateCertificateState(id: number, state: number): Promise<Certificate> {
  const { data } = await api.patch(`${BASE}/certificates/${id}`, { state });
  return data;
}

// ============================================
// API - Boletos de Ornato
// ============================================

export async function fetchOrnamentTicketIndex(): Promise<OrnamentTicketIndex> {
  const { data } = await api.get(`${BASE}/ornament-tickets/index`);
  return data;
}

export async function checkCanApplyOrnament(): Promise<boolean> {
  const { data } = await api.get(`${BASE}/ornament-tickets/can-apply`);
  return data;
}

export async function createOrnamentTicket(ornamentOption?: number): Promise<OrnamentTicket> {
  const payload = ornamentOption ? { ornament_option: ornamentOption } : {};
  const { data } = await api.post(`${BASE}/ornament-tickets`, payload);
  return data;
}

export async function uploadOrnamentTicketFile(ticketId: number, file: File): Promise<OrnamentTicket> {
  const formData = new FormData();
  formData.append('ornament_ticket_id', ticketId.toString());
  formData.append('file', file);
  const { data } = await api.post(`${BASE}/ornament-tickets/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function fetchOrnamentTicket(id: number): Promise<OrnamentTicket> {
  const { data } = await api.get(`${BASE}/ornament-tickets/${id}`);
  return data;
}

export async function fetchOrnamentTicketsByUser(userId: number): Promise<OrnamentTicket[]> {
  const { data } = await api.get(`${BASE}/ornament-tickets/user/${userId}`);
  return data;
}

// ============================================
// API - Sugerencias
// ============================================

export async function createSuggestion(payload: {
  mailbox_type?: number;
  description: string;
  user?: string;
  anonymous?: boolean;
}): Promise<Suggestion> {
  const { data } = await api.post(`${BASE}/suggestions`, payload);
  return data;
}

export async function createSuggestionWithFile(formData: FormData): Promise<Suggestion> {
  const { data } = await api.post(`${BASE}/suggestions`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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
}): Promise<Suggestion[]> {
  const { data } = await api.post(`${BASE}/suggestions/filter`, payload);
  return data;
}

export async function addSuggestionObservation(payload: { pk: number; description: string }) {
  const { data } = await api.post(`${BASE}/suggestions/observation`, payload);
  return data;
}

export async function fetchSuggestionObservations(id: number): Promise<Observation[]> {
  const { data } = await api.post(`${BASE}/suggestions/${id}/observations`, {});
  return data;
}

// ============================================
// API - Denuncias
// ============================================

export async function createComplaint(payload: {
  mailbox_type?: number;
  type: number;
  description: string;
  user?: string;
  anonymous?: boolean;
  other_type?: string;
}): Promise<Complaint> {
  const { data } = await api.post(`${BASE}/complaints`, payload);
  return data;
}

export async function createComplaintWithFile(formData: FormData): Promise<Complaint> {
  const { data } = await api.post(`${BASE}/complaints`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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
}): Promise<Complaint[]> {
  const { data } = await api.post(`${BASE}/complaints/filter`, payload);
  return data;
}

export async function addComplaintObservation(payload: { pk: number; description: string }) {
  const { data } = await api.post(`${BASE}/complaints/observation`, payload);
  return data;
}

export async function fetchComplaintObservations(id: number): Promise<Observation[]> {
  const { data } = await api.post(`${BASE}/complaints/${id}/observations`, {});
  return data;
}
