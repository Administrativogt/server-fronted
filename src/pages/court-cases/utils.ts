import dayjs from 'dayjs';

export type FormDate = dayjs.Dayjs | string | null | undefined;

export function toApiDate(value: FormDate): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.format('YYYY-MM-DD');
}

export function parseAdjustments(raw?: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializeAdjustments(adjustments?: unknown) {
  if (!adjustments) return undefined;
  try {
    return JSON.stringify(adjustments);
  } catch {
    return undefined;
  }
}

export function normalizeCasePayload(values: Record<string, any>) {
  const payload = { ...values };

  if ('init_date' in payload) payload.init_date = toApiDate(payload.init_date);
  if ('end_date' in payload) payload.end_date = toApiDate(payload.end_date);

  if ('adjustments' in payload) payload.adjustments = serializeAdjustments(payload.adjustments);

  return payload;
}
