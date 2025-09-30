/* eslint-disable @typescript-eslint/no-unused-vars */
// src/utils/auth.ts
export const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return true;

    const now = Date.now() / 1000;
    return payload.exp < now;
  } catch (err) {
    return true;
  }
};