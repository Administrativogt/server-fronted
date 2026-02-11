import api from './axios';
import type { Client, Case, PaginatedResponse } from '../types/clientCreation.types';

const BASE = '/api/client-creation';

// ===================== CATALOG TYPES =====================

export interface CatalogItem {
  id: number;
  name: string;
  active?: boolean;
}

export interface PartnerItem extends CatalogItem {
  userInstance?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    equipo?: { id: number; nombre?: string };
  };
}

export interface OriginItem extends CatalogItem {
  validation?: number; // 1=por socio, 2=RACSA, 3=ninguna
}

export interface ReferralItem {
  id: number;
  name: string;
  email?: string;
}

export interface ReferralResponse {
  data: ReferralItem[];
  warning?: string;
}

export interface ReferralValidationPayload {
  partner: number;
  origin: number;
  referred_by: string;
}

export interface ReferralValidationResponse {
  valid?: boolean;
  message?: string;
}

export interface AddressedToUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

// ===================== PAYLOAD TYPES =====================

export interface CreateClientContact {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  position?: string;
  language_id?: number;
  birth_date?: string;
  country_id?: number;
  city?: string;
  subscribe_to_database?: boolean;
}

export interface CreateClientPayload {
  full_name: string;
  type_of_taxpayer: 'Juridica' | 'Fisica';
  nationality: 'Nacional' | 'Extranjero';
  business_group?: string;
  country_of_origin_id?: number;
  address?: string;
  nit?: string;
  phone?: string;
  email?: string;
  responsible_partner_id?: number;
  origin_id?: number;
  referred_by?: string;
  economic_sector_id?: number;
  language_id?: number;
  is_exempt_iva?: boolean;
  iva_percentage?: number;
  website?: string;
  internal_code?: string;
  commercial_name?: string;
  tax_document_type?: string;
  contacts?: CreateClientContact[];
}

export interface CreateCasePayload {
  client: string;
  area_id: number;
  concept: string;
  currency: 'GTQ' | 'USD';
  coordinating_partner_id: number;
  partner_in_charge_id: number;
  responsible: string;
  addressed_to_id: number;
  billing_type_id?: number;
  limit_of_hours?: number;
  amount_of_fees?: string;
  fee_type?: string;
  name_of_contact?: string;
  phone?: string;
  email?: string;
}

// ===================== CATALOG ENDPOINTS =====================

// NestJS puede devolver un array directamente o envuelto en { data: [...] }
const unwrapArray = <T>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  return [];
};

export const getCountries = () =>
  api.get(`${BASE}/countries`).then(r => unwrapArray<CatalogItem>(r.data));

export const getEconomicSectors = () =>
  api.get(`${BASE}/economic-sectors`).then(r => unwrapArray<CatalogItem>(r.data));

export const getLanguages = () =>
  api.get(`${BASE}/languages`).then(r => unwrapArray<CatalogItem>(r.data));

export const getPartners = () =>
  api.get(`${BASE}/partners`).then(r => unwrapArray<PartnerItem>(r.data));

export const getOrigins = () =>
  api.get(`${BASE}/origins`).then(r => unwrapArray<OriginItem>(r.data));

export const getCaseAreas = () =>
  api.get(`${BASE}/case-areas`).then(r => unwrapArray<CatalogItem>(r.data));

export const getCoordinatingPartners = () =>
  api.get(`${BASE}/coordinating-partners`).then(r => unwrapArray<CatalogItem>(r.data));

export const getBillingTypes = () =>
  api.get(`${BASE}/billing-types`).then(r => unwrapArray<CatalogItem>(r.data));

export const getReferrals = (origin: number, partner_selected?: number) =>
  api
    .get(`${BASE}/referrals`, {
      params: { origin, partner_selected },
    })
    .then(r => {
      const data = r.data;
      // NestJS returns { data: [...], warning: string } directly
      const list = data?.data || [];
      const warning = data?.warning;
      
      const normalized = list.map((item: any) => ({
        id: item.id,
        name: item.name,
        email: item.email,
      }));
      return { data: normalized, warning };
    })
    .catch(err => {
      // Keep legacy error handling just in case, or simplify
      const message = err?.response?.data?.message;
      if (err?.response?.status === 400 && message) {
        return { data: [], warning: message };
      }
      throw err;
    });

export const validateReferral = (payload: ReferralValidationPayload) =>
  api.post<ReferralValidationResponse>(`${BASE}/referral-validation`, payload).then(r => r.data);

export const getAddressedToUsers = () =>
  api.get<AddressedToUser[]>(`${BASE}/addressed-to`).then(r => r.data);

// ===================== CLIENT ENDPOINTS =====================

export const createClientWithContacts = (payload: CreateClientPayload) =>
  api.post<{ message: string; id?: number }>(`${BASE}/clients`, payload).then(r => r.data);

export const getClients = (params?: { page?: number; limit?: number; search?: string; state?: number }) =>
  api.get<PaginatedResponse<Client>>(`${BASE}/clients`, { params }).then(r => r.data);

export const getClient = (id: number) =>
  api.get<Client>(`${BASE}/clients/${id}`).then(r => r.data);

export const updateClient = (id: number, payload: Partial<CreateClientPayload>) =>
  api.patch<Client>(`${BASE}/clients/${id}`, payload).then(r => r.data);

export const finishClient = (id: number) =>
  api.post<Client>(`${BASE}/clients/${id}/finish`, {}).then(r => r.data);

// ===================== CASE ENDPOINTS =====================

export const createCase = (formData: FormData) =>
  api.post<{ message: string; id?: number }>(`${BASE}/cases`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

export const getCases = (params?: { page?: number; limit?: number; search?: string; state?: number }) =>
  api.get<PaginatedResponse<Case>>(`${BASE}/cases`, { params }).then(r => r.data);

export const getCase = (id: number) =>
  api.get<Case>(`${BASE}/cases/${id}`).then(r => r.data);

export const updateCase = (id: number, payload: Partial<CreateCasePayload>) =>
  api.patch<Case>(`${BASE}/cases/${id}`, payload).then(r => r.data);
