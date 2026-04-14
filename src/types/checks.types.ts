export interface CheckUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  tipo_usuario?: number;
}

export interface CheckRequest {
  id: number;
  request_id: number;
  state?: { id: number; name: string } | number;
  coordinator_code: string;
  responsible?: CheckUser | null;
  created?: string;
  date: string;
  client: string;
  client_name?: string | null;
  description: string;
  total_value: string | number;
  unit_value: string | number;
  work_note_number: number;
  currency_code: string;
  type_of_charge: string;
  case_code: string;
  case_name?: string;
  amount: number;
  authorized_by?: CheckUser | null;
  document_date?: string | null;
  document_number?: number | null;
  document_serie?: string;
  type_document_code?: string;
  bank_name?: string;
  invoice_name?: string;
  invoice_adress?: string;
  invoice_nit?: string;
  sent_to_liquidation?: boolean;
  inmobiliario_expenses_amount?: number;
}

export interface CheckListResponse {
  data: CheckRequest[];
  total: number;
  page: number;
  per_page: number;
}

export interface SyncChecksPayload {
  anio?: number;
  codigo_responsable?: string;
}

export interface SyncChecksResponse {
  synced: number;
  total_results: number;
}

export interface ManageAuthorizationPayload {
  action: 'authorize' | 'deny' | 'partial_authorize';
  all_check_ids: number[];
  selected_check_ids?: number[];
}

export interface RequestAuthorizationPayload {
  check_ids: number[];
  authorizer_id: number;
}

export interface CheckEntity {
  id: number;
  name: string;
  pdf_pages_allowed?: number;
  pdf_pages_unlimited?: boolean;
}

export interface LiquidateCheckPayload {
  entity_id: number;
  codigo_tipo_documento: string;
  serie_factura: string;
  numero_factura: string;
  nit_factura?: string;
  nombre_factura?: string;
  direccion_factura?: string;
  valor_total: number;
  descripcion: string;
  devolucion?: boolean;
  codigo_banco?: string;
  expense_ids?: number[];
  litigio_expense_ids?: number[];
  fecha?: string;
}

export interface Liquidation {
  id: number;
  created: string;
  check_instance?: CheckRequest;
  document_type_code: string;
  invoice_nit: string;
  invoice_serie?: string | null;
  invoice_number: string;
  invoice_name: string;
  invoice_adress?: string;
  total_value: number;
  description: string;
  document_link?: string;
  state: number;
  is_devolution: boolean;
  elimination_reason?: string;
  document?: string | null;
}

export interface InmobiliarioExpense {
  id: number;
  created?: string;
  request_id?: CheckRequest;
  note_number: number;
  date: string;
  description?: string;
  client: string;
  documents?: string;
  receipt_number_reference: string;
  receipt_number: string;
  receipt_value: number;
  receipt_serie?: string;
  comment?: string;
  delivered_by?: CheckUser;
  state: number;
}

export interface InmobiliarioExpenseListResponse {
  data: InmobiliarioExpense[];
  total: number;
  page: number;
  per_page: number;
}

export interface CreateExpensePayload {
  request_id: number;
  note_number: number;
  date: string;
  description?: string;
  client: string;
  documents?: string;
  receipt_number_reference: string;
  receipt_number: string;
  receipt_value: number;
  receipt_serie?: string;
  comment?: string;
  delivered_by_id: number;
}

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

export interface ParentCheckResponse {
  has_parent: boolean;
  message?: string;
  parent?: CheckRequest;
}

export interface LitigioExpense {
  id: number;
  created?: string;
  request_id?: CheckRequest;
  note_number: number;
  date: string;
  description?: string;
  client: string;
  documents?: string;
  receipt_number_reference: string;
  receipt_number: string;
  receipt_value: number;
  receipt_serie?: string;
  comment?: string;
  delivered_by?: CheckUser;
  state: number;
}

export interface LitigioExpenseListResponse {
  data: LitigioExpense[];
  total: number;
  page: number;
  per_page: number;
}

export interface CreateLitigioExpensePayload {
  request_id: number;
  note_number: number;
  date: string;
  description?: string;
  client: string;
  documents?: string;
  receipt_number_reference: string;
  receipt_number: string;
  receipt_value: number;
  receipt_serie?: string;
  comment?: string;
  delivered_by_id: number;
}

export type UpdateLitigioExpensePayload = Partial<CreateLitigioExpensePayload>;
