export interface AccountingCheck {
  id: number;
  date: string;
  document_type: string;
  check_number: number;
  user: string;
  description: string;
  amount: string;
  announcements: number;
  active: boolean;
}
