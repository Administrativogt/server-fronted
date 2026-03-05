import type { CaseTypeKey } from '../../api/courtCases';

export const COURT_CASE_STATE = {
  ACTIVE: 1,
  DELETED: 2,
  SUSPENDED: 3,
  FINISHED: 4,
} as const;

export type CourtCaseStateId = (typeof COURT_CASE_STATE)[keyof typeof COURT_CASE_STATE];

export type CaseActionKey =
  | 'view'
  | 'edit'
  | 'delete'
  | 'actions'
  | 'statusUpdates'
  | 'finalize'
  | 'suspend'
  | 'resume'
  | 'reopen';

const COMMON_ACTIONS_BY_STATE: Record<CourtCaseStateId, CaseActionKey[]> = {
  [COURT_CASE_STATE.ACTIVE]: ['view', 'edit', 'delete', 'actions', 'statusUpdates', 'finalize', 'suspend'],
  [COURT_CASE_STATE.DELETED]: ['view', 'edit'],
  [COURT_CASE_STATE.SUSPENDED]: ['view', 'edit', 'resume'],
  [COURT_CASE_STATE.FINISHED]: ['view', 'reopen'],
};

const ACTION_OVERRIDES_BY_TYPE: Partial<
  Record<CaseTypeKey, Partial<Record<CourtCaseStateId, CaseActionKey[]>>>
> = {};

export const REQUIRED_FIELDS_BY_TYPE: Record<CaseTypeKey, string[]> = {
  labor: ['client', 'responsible_lawyer', 'official_court'],
  litigation: ['client', 'responsible_lawyer', 'official_court'],
  penal: ['client', 'responsible_lawyer', 'case_name', 'court', 'district_attorney', 'accussed'],
  tributary: ['client', 'responsible_lawyer'],
  'administrative-tax': ['client', 'responsible_lawyer'],
};

export function getAvailableCaseActions(caseType: CaseTypeKey, stateId: CourtCaseStateId): CaseActionKey[] {
  const overridesByState = ACTION_OVERRIDES_BY_TYPE[caseType];
  if (overridesByState?.[stateId]) return overridesByState[stateId] as CaseActionKey[];
  return COMMON_ACTIONS_BY_STATE[stateId];
}

export function canTransitionCaseState(current: CourtCaseStateId, target: CourtCaseStateId): boolean {
  const transitions: Record<CourtCaseStateId, CourtCaseStateId[]> = {
    [COURT_CASE_STATE.ACTIVE]: [COURT_CASE_STATE.DELETED, COURT_CASE_STATE.SUSPENDED, COURT_CASE_STATE.FINISHED],
    [COURT_CASE_STATE.DELETED]: [],
    [COURT_CASE_STATE.SUSPENDED]: [COURT_CASE_STATE.ACTIVE],
    [COURT_CASE_STATE.FINISHED]: [COURT_CASE_STATE.ACTIVE],
  };

  return transitions[current].includes(target);
}

export function canCreateReminderForUser(areaId: number | null | undefined, isSuperuser: boolean): boolean {
  return areaId === 10 || isSuperuser;
}

export function isCourtCaseStateId(value: number | null | undefined): value is CourtCaseStateId {
  return (
    value === COURT_CASE_STATE.ACTIVE ||
    value === COURT_CASE_STATE.DELETED ||
    value === COURT_CASE_STATE.SUSPENDED ||
    value === COURT_CASE_STATE.FINISHED
  );
}
