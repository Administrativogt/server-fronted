import api from './axios';
import type { UserLite } from './users';
import type { Client } from './clients';

export interface CourtCaseType {
  id: number;
  name: string;
  display_name: string;
  model_name: string;
  active: boolean;
}

export interface CourtCaseState {
  id: number;
  name: string;
}

export interface Dependency {
  id: number;
  name: string;
}

export interface Action {
  id: number;
  description: string;
  created: string;
  is_reminder?: boolean;
  creator?: UserLite | null;
}

export interface StatusUpdate {
  id: number;
  description: string;
  created: string;
  creator?: UserLite | null;
}

export interface CourtCaseBase {
  id: number;
  client: Client;
  responsible_lawyer: UserLite;
  state: CourtCaseState;
  creator?: UserLite | null;
  created?: string;
  init_date?: string;
  end_date?: string;
  currency?: number;
  amount?: string;
  case_defenses?: string;
  expedient?: string;
  expedient_link?: string;
  fee_proposal_link?: string;
  observations?: string;
  stage?: string;
  subject?: string;
  success_probability?: string;
  actions?: Action[];
  status_updates?: StatusUpdate[];
}

export interface LaborCase extends CourtCaseBase {
  main_piece?: string;
  actor?: string;
  defendant?: string;
  official_court: string;
  appeals_room?: string;
  process_type?: string;
}

export interface LitigationCase extends CourtCaseBase {
  actor?: string;
  defendant?: string;
  case_name?: string;
  official_court: string;
  process_type?: string;
  third_parties?: string;
}

export interface PenalCase extends CourtCaseBase {
  actor: string;
  accussed: string;
  court: string;
  case_name: string;
  district_attorney: string;
  description?: string;
}

export interface TributaryCase extends CourtCaseBase {
  third_parties?: string;
  process_number?: string;
  room?: string;
  resolution?: string;
  adjustments?: string;
}

export interface AdministrativeTaxCase extends CourtCaseBase {
  adjustments?: string;
  audience?: string;
  tax_resolution?: string;
  entity?: string;
  interests?: number;
  penalty_fee?: number;
  resolution?: string;
  sat_dependency?: Dependency | null;
  tax?: number;
}

export type CaseTypeKey =
  | 'labor'
  | 'litigation'
  | 'penal'
  | 'tributary'
  | 'administrative-tax';

export async function fetchCaseTypes(): Promise<CourtCaseType[]> {
  const { data } = await api.get('/court-cases/types');
  return data;
}

export async function fetchCaseStates(): Promise<CourtCaseState[]> {
  const { data } = await api.get('/court-cases/states');
  return data;
}

export async function fetchDependencies(): Promise<Dependency[]> {
  const { data } = await api.get('/court-cases/dependencies');
  return data;
}

export async function fetchLaborCases(): Promise<LaborCase[]> {
  const { data } = await api.get('/court-cases/labor');
  return data;
}

export async function fetchLaborCase(id: number): Promise<LaborCase> {
  const { data } = await api.get(`/court-cases/labor/${id}`);
  return data;
}

export async function createLaborCase(payload: Partial<LaborCase>) {
  const { data } = await api.post('/court-cases/labor', payload);
  return data as LaborCase;
}

export async function updateLaborCase(id: number, payload: Partial<LaborCase>) {
  const { data } = await api.patch(`/court-cases/labor/${id}`, payload);
  return data as LaborCase;
}

export async function fetchLitigationCases(): Promise<LitigationCase[]> {
  const { data } = await api.get('/court-cases/litigation');
  return data;
}

export async function fetchLitigationCase(id: number): Promise<LitigationCase> {
  const { data } = await api.get(`/court-cases/litigation/${id}`);
  return data;
}

export async function createLitigationCase(payload: Partial<LitigationCase>) {
  const { data } = await api.post('/court-cases/litigation', payload);
  return data as LitigationCase;
}

export async function updateLitigationCase(id: number, payload: Partial<LitigationCase>) {
  const { data } = await api.patch(`/court-cases/litigation/${id}`, payload);
  return data as LitigationCase;
}

export async function fetchPenalCases(): Promise<PenalCase[]> {
  const { data } = await api.get('/court-cases/penal');
  return data;
}

export async function fetchPenalCase(id: number): Promise<PenalCase> {
  const { data } = await api.get(`/court-cases/penal/${id}`);
  return data;
}

export async function createPenalCase(payload: Partial<PenalCase>) {
  const { data } = await api.post('/court-cases/penal', payload);
  return data as PenalCase;
}

export async function updatePenalCase(id: number, payload: Partial<PenalCase>) {
  const { data } = await api.patch(`/court-cases/penal/${id}`, payload);
  return data as PenalCase;
}

export async function fetchTributaryCases(): Promise<TributaryCase[]> {
  const { data } = await api.get('/court-cases/tributary');
  return data;
}

export async function fetchTributaryCase(id: number): Promise<TributaryCase> {
  const { data } = await api.get(`/court-cases/tributary/${id}`);
  return data;
}

export async function createTributaryCase(payload: Partial<TributaryCase>) {
  const { data } = await api.post('/court-cases/tributary', payload);
  return data as TributaryCase;
}

export async function updateTributaryCase(id: number, payload: Partial<TributaryCase>) {
  const { data } = await api.patch(`/court-cases/tributary/${id}`, payload);
  return data as TributaryCase;
}

export async function fetchAdministrativeTaxCases(): Promise<AdministrativeTaxCase[]> {
  const { data } = await api.get('/court-cases/administrative-tax');
  return data;
}

export async function fetchAdministrativeTaxCase(id: number): Promise<AdministrativeTaxCase> {
  const { data } = await api.get(`/court-cases/administrative-tax/${id}`);
  return data;
}

export async function createAdministrativeTaxCase(payload: Partial<AdministrativeTaxCase>) {
  const { data } = await api.post('/court-cases/administrative-tax', payload);
  return data as AdministrativeTaxCase;
}

export async function updateAdministrativeTaxCase(id: number, payload: Partial<AdministrativeTaxCase>) {
  const { data } = await api.patch(`/court-cases/administrative-tax/${id}`, payload);
  return data as AdministrativeTaxCase;
}

export async function createAction(payload: {
  description: string;
  creator?: number;
  is_reminder?: boolean;
  instance_id: number;
  case_type: number;
}) {
  const { data } = await api.post('/court-cases/actions', payload);
  return data as Action;
}

export async function fetchActions(instanceId: number, caseTypeId: number): Promise<Action[]> {
  const { data } = await api.get(`/court-cases/actions/${instanceId}`, {
    params: { case_type: caseTypeId },
  });
  return data;
}

export async function createStatusUpdate(payload: {
  description: string;
  creator?: number;
  instance_id: number;
  case_type: number;
}) {
  const { data } = await api.post('/court-cases/status-updates', payload);
  return data as StatusUpdate;
}

export async function fetchStatusUpdates(
  instanceId: number,
  caseTypeId: number
): Promise<StatusUpdate[]> {
  const { data } = await api.get(`/court-cases/status-updates/${instanceId}`, {
    params: { case_type: caseTypeId },
  });
  return data;
}
