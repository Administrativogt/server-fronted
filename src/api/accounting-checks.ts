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

export const getLiquidationReportDate = async (): Promise<string | null> => {
  const { data } = await api.get<{ email_date: string | null }>(
    '/checks/liquidation-checks/report-date',
  );
  return data.email_date;
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

export interface CommentsSummary {
  total: number;
  users: number;
  last_updated_at: string | null;
  by_user: Array<{
    user_code: string;
    user_name: string;
    count: number;
    last_comment_at: string | null;
  }>;
}

export const getCommentsSummary = async (): Promise<CommentsSummary> => {
  const { data } = await api.get<CommentsSummary>(
    '/checks/liquidation-checks/comments-summary',
  );
  return data;
};

export const sendCommentsDigest = async (
  windowHours?: number,
): Promise<{ matched: number; users: number; sent: boolean }> => {
  const { data } = await api.post<{
    matched: number;
    users: number;
    sent: boolean;
  }>(
    '/checks/liquidation-checks/send-comments-digest',
    typeof windowHours === 'number' ? { windowHours } : {},
  );
  return data;
};
