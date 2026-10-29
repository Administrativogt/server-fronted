// Helpers de formato de la app Android.
export const initials = (first?: string, last?: string) =>
  `${(first ?? '').trim().charAt(0)}${(last ?? '').trim().charAt(0)}`.toUpperCase() || '·';

export const plural = (n: number, one = 'día', many = 'días') => (Math.abs(n) === 1 ? one : many);

/** Monto con símbolo de moneda (GTQ por defecto). */
export const money = (amount: number | string, currency?: string | number | null) => {
  const usd = currency === 'USD' || Number(currency) === 2;
  return `${usd ? 'US$' : 'Q'} ${Number(amount || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const hhmm = (s?: string | null) => (s ? s.slice(0, 5) : '');

export const fullName = (u?: { first_name?: string; last_name?: string } | null) =>
  u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : '';
