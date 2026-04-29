import api from './axios';
import type { AccountingCheck, UploadCommentsResult } from '../types/accounting-checks.types';

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

export const listMyLiquidationChecks = async (): Promise<AccountingCheck[]> => {
  const { data } = await api.get<AccountingCheck[]>('/checks/liquidation-checks/mine');
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

export const updateLiquidationCheckComment = async (
  id: number,
  comments: string | null,
): Promise<AccountingCheck> => {
  const { data } = await api.patch<AccountingCheck>(
    `/checks/liquidation-checks/${id}/comment`,
    { comments },
  );
  return data;
};

export const uploadCheckComments = async (file: File) => {
  const formData = new FormData();
  formData.append('file_comments', file);
  return api.post<UploadCommentsResult>(
    '/checks/liquidation-checks/upload-comments',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
};
