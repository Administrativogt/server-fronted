export interface SchedulerEvent {
  id: number;
  title: string;
  description?: string;
  start: string;       // era "startDate"
  end: string;         // era "endDate"
  place?: string;      // era "location"
  participants?: string;
  creator?: any;
}

export interface CreateSchedulerEventDto {
  title: string;
  description?: string;
  start: string;
  end: string;
  place?: string;
  participants?: string;
}

export interface UpdateSchedulerEventDto {
  title?: string;
  description?: string;
  start?: string;
  end?: string;
  place?: string;
  participants?: string;
}

export interface SchedulerFilters {
  page?: number;
  limit?: number;
}

export interface SchedulerListResponse {
  data: SchedulerEvent[];
  count: number;     // era "total"
  page: number;
  limit: number;
  totalPages: number;
}
