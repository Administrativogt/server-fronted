export interface AccountingCheck {
  id: number;
  date: string;
  document_type: string;
  check_number: number;
  user: string;
  user_full_name?: string | null;
  description: string;
  amount: string;
  announcements: number;
  active: boolean;
  comments?: string | null;
}

export interface UploadCommentsResult {
  matched: number;
  skipped_empty: number;
  unmatched: { check_number: number; comment: string }[];
}
