import api from './axios';
import type { AccountingCheck } from '../types/accounting-checks.types';

export const uploadLiquidationChecks = async (file: File) => {
  const formData = new FormData();
  formData.append('file_liquidate_checks', file);
  return api.post<{ unmatched: { codigo: string; nombre: string }[] }>(
    '/checks/liquidation-checks/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
};

export const listLiquidationChecks = async (search?: string): Promise<AccountingCheck[]> => {
  const { data } = await api.get<AccountingCheck[]>('/checks/liquidation-checks', {
    params: search ? { search } : undefined,
  });
  return data;
};

export const sendEmailLiquidationChecks = async (
  user: string,
  checkIds?: number[],
): Promise<void> => {
  await api.post(
    '/checks/liquidation-checks/send-email',
    checkIds && checkIds.length > 0 ? { check_ids: checkIds } : {},
    { params: { user } },
  );
};
