export const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return true;

    const now = Date.now() / 1000;
    return payload.exp < now;
  } catch {
    return true;
  }
};

export const isValidJwt = (token: string | null): boolean => {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    const decoded = JSON.parse(atob(parts[1]));
    return typeof decoded === 'object' && decoded !== null && 'exp' in decoded;
  } catch {
    return false;
  }
};
