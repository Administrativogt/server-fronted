export interface CargabilityUser {
  username: string;
  emailSended: boolean;
  fullName?: string;
  email?: string;
  userType?: number;
}

export interface HourData {
  total: number;
}

export interface MonthData {
  month: string;
  total: number;
}

export interface NonBillableHours {
  consortium_hours: HourData[];
  non_billable_hours: HourData[];
}

export interface TotalsByLine {
  billableHours: number;
  consortiumHours: number;
  nonBillableHours: number;
}

export interface CargabilityReport {
  username: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    tipo_usuario: number;
  };
  months: string[];
  weeks: string[];
  billableHoursPerMonth: HourData[];
  billableHoursPerWeek: HourData[];
  nonBillableHours: NonBillableHours;
  nonBillableHoursPerWeek: NonBillableHours;
  totalHoursPerWeek: Record<string, number>;
  totalHoursPerMonth: MonthData[];
  semesterTotal: number;
  totalsByLine: TotalsByLine;
  totalNonBillableHours: number;
  date: string;
}

export interface SendEmailResponse {
  message: string;
  results: Array<{
    username: string;
    success: boolean;
    error?: string;
  }>;
}