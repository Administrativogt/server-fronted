import api from './axios';

export interface RateEntry {
  fecha: string; // YYYY-MM-DD
  venta: number;
  compra: number;
}

export interface CurrencyRate {
  moneda: number;
  code: string;
  name: string;
  flag: string;
  venta: number;
  compra: number;
  fecha: string;
}

export interface ExchangeRateData {
  source: 'banguat' | 'market';
  updatedAt: string;
  main: RateEntry;
  history: RateEntry[];
  currencies: CurrencyRate[];
}

export interface DateLookupResult {
  code: string;
  name: string;
  flag: string;
  fecha: string;
  venta: number;
  compra: number;
}

export async function fetchExchangeRate(days = 30): Promise<ExchangeRateData> {
  const { data } = await api.get(`/api/exchange-rate?days=${days}`);
  return data;
}

export async function fetchExchangeHistory(currency: number, days: number): Promise<RateEntry[]> {
  const { data } = await api.get(`/api/exchange-rate/history?currency=${currency}&days=${days}`);
  return data;
}

export async function fetchRateOnDate(date: string): Promise<DateLookupResult[]> {
  const { data } = await api.get(`/api/exchange-rate/on-date?date=${date}`);
  return data;
}

export const CURRENCY_INFO: Record<string, { name: string; flag: string; moneda: number }> = {
  USD: { name: 'Dólar EE.UU.', flag: '🇺🇸', moneda: 2  },
  EUR: { name: 'Euro',          flag: '🇪🇺', moneda: 24 },
  MXN: { name: 'Peso Mexicano', flag: '🇲🇽', moneda: 18 },
};
