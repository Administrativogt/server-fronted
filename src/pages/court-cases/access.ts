import type { CaseTypeKey } from '../../api/courtCases';

const LABORAL_AREA_ID = 5;
const MEA_AREA_ID = 16;

export type CourtCasesAccess = {
  isLaborAreaUser: boolean;
  isMeaAreaUser: boolean;
  defaultCaseType: CaseTypeKey;
  allowedCaseTypes: CaseTypeKey[];
};

export const getCourtCasesAccess = (areaId: number | null | undefined): CourtCasesAccess => {
  const isLaborAreaUser = areaId === LABORAL_AREA_ID;
  const isMeaAreaUser = areaId === MEA_AREA_ID;

  if (isLaborAreaUser) {
    return {
      isLaborAreaUser: true,
      isMeaAreaUser: false,
      defaultCaseType: 'labor',
      allowedCaseTypes: ['labor'],
    };
  }

  if (isMeaAreaUser) {
    return {
      isLaborAreaUser: false,
      isMeaAreaUser: true,
      defaultCaseType: 'administrative-tax',
      allowedCaseTypes: ['litigation', 'penal', 'tributary', 'administrative-tax'],
    };
  }

  return {
    isLaborAreaUser: false,
    isMeaAreaUser: false,
    defaultCaseType: 'litigation',
    allowedCaseTypes: ['litigation', 'penal', 'tributary', 'administrative-tax'],
  };
};
