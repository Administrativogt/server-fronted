import axios from './axios';

/**
 * Doble factor con app autenticadora (Microsoft Authenticator, Google
 * Authenticator...). Ver MfaController en el backend.
 */

export interface MfaSetupInfo {
  secret: string;
  otpauth_url: string;
  issuer: string;
  account: string;
}

export interface MfaStatus {
  enabled: boolean;
  enabled_at: string | null;
  recovery_codes_remaining: number;
  required: boolean;
}

// ─── Durante el login (con el token temporal de /auth/login) ─────────────

export const verifyMfaLogin = (mfa_token: string, code: string) =>
  axios.post('/auth/mfa/verify', { mfa_token, code });

export const startMfaSetupFromLogin = (mfa_token: string) =>
  axios.post<MfaSetupInfo>('/auth/mfa/setup/challenge', { mfa_token });

export const enableMfaFromLogin = (mfa_token: string, code: string) =>
  axios.post('/auth/mfa/enable/challenge', { mfa_token, code });

// ─── Con sesión iniciada ─────────────────────────────────────────────────

export const getMfaStatus = () => axios.get<MfaStatus>('/auth/mfa/status');

export const startMfaSetup = () => axios.post<MfaSetupInfo>('/auth/mfa/setup');

export const enableMfa = (code: string) =>
  axios.post<{ recovery_codes: string[] }>('/auth/mfa/enable', { code });

export const disableMfa = (code: string) => axios.post('/auth/mfa/disable', { code });

export const regenerateRecoveryCodes = (code: string) =>
  axios.post<{ recovery_codes: string[] }>('/auth/mfa/recovery-codes', { code });

// ─── Superusuario ────────────────────────────────────────────────────────

export const getMfaEnabledUsers = () =>
  axios.get<Array<{ user_id: number; enabled_at: string | null }>>('/auth/mfa/users');

export const resetUserMfa = (userId: number) => axios.delete(`/auth/mfa/users/${userId}`);
