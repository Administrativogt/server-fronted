// src/types/clientCreation.types.ts

export interface ClientContact {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  email: string;
  birth_date?: string;
  country?: { id: number; name: string };
  city: string;
  phone: string;
  language?: { id: number; name: string };
  subscribe_to_database: boolean;
}

export interface Client {
  id: number;
  full_name: string;
  code: string;
  correlative: string;
  nit: string;
  phone: string;
  email: string;
  state: 1 | 2 | 3;
  creation_date: string;
  type_of_taxpayer: 'Juridica' | 'Fisica';
  nationality: 'Nacional' | 'Extranjero';
  is_exempt_iva: boolean;
  iva_percentage: string;
  address: string;
  website: string | null;
  internal_code: string | null;
  referred_by: string;
  commercial_name: string | null;
  business_group: string | null;
  tax_document_type: string | null;
  created_by: { id: number; first_name: string; last_name: string };
  country_of_origin: { id: number; name: string };
  economic_sector: { id: number; name: string };
  responsible_partner: { id: number; name: string };
  language: { id: number; name: string };
  origin: { id: number; name: string };
  contacts: ClientContact[];
}

export interface Case {
  id: number;
  client: string;
  concept: string;
  state: 1 | 2 | 3;
  currency: 'GTQ' | 'USD';
  amount_of_fees: string;
  limit_of_hours: number;
  fee_type: string | null;
  name_of_contact: string | null;
  phone: string | null;
  email: string | null;
  responsible: string;
  fee_files: string | null;
  creation_date: string;
  area: { id: number; name: string };
  billing_type: { id: number; name: string } | null;
  coordinating_partner: { id: number; name: string };
  partner_in_charge: { id: number; name: string };
  addressed_to: { id: number; first_name: string; last_name: string };
  created_by: { id: number; first_name: string; last_name: string };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const CLIENT_STATES: Record<number, string> = {
  1: 'Recibido',
  2: 'Creado',
  3: 'Eliminado',
};

export const CLIENT_STATE_COLORS: Record<number, string> = {
  1: 'blue',
  2: 'green',
  3: 'red',
};

export const CASE_STATES: Record<number, string> = {
  1: 'Recibido',
  2: 'Creado',
  3: 'Eliminado',
};

export const CASE_STATE_COLORS: Record<number, string> = {
  1: 'blue',
  2: 'green',
  3: 'red',
};
