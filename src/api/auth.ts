// src/api/auth.ts
import api from './axios';

export interface BroadcastRecipient {
  id: number;
  username: string;
  email: string;
  status: string;
  /** Solo en el envío a socios: qué recibió/recibirá cada uno. */
  tipo?: 'default' | 'personalizada';
}

export interface BroadcastResult {
  dryRun: boolean;
  total: number;
  sent: number;
  skipped: number;
  failed: number;
  recipients: BroadcastRecipient[];
}

export interface BroadcastTestResult {
  sent: boolean;
  username: string;
  email: string;
  setPasswordLink: string;
}

/** Envío masivo de credenciales de lanzamiento (solo superusuario). */
export async function broadcastCredentials(dryRun: boolean): Promise<BroadcastResult> {
  const { data } = await api.post<BroadcastResult>(
    `/auth/broadcast-credentials?dryRun=${dryRun ? 'true' : 'false'}`,
  );
  return data;
}

/** Envía el correo de credenciales solo a tu propio usuario (prueba). */
export async function broadcastCredentialsTest(): Promise<BroadcastTestResult> {
  const { data } = await api.post<BroadcastTestResult>('/auth/broadcast-credentials/test');
  return data;
}

export interface SociosBroadcastResult {
  dryRun: boolean;
  sharedPassword: string | null;
  total: number;
  sent: number;
  skipped: number;
  failed: number;
  recipients: BroadcastRecipient[];
}

/**
 * Envía credenciales a los socios activos. Los IDs en `customPasswordUserIds`
 * reciben el enlace para crear su PROPIA contraseña (form); el resto recibe la
 * clave por defecto compartida.
 */
export async function broadcastSociosPassword(
  dryRun: boolean,
  customPasswordUserIds: number[] = [],
): Promise<SociosBroadcastResult> {
  const { data } = await api.post<SociosBroadcastResult>(
    `/auth/broadcast-socios-password?dryRun=${dryRun ? 'true' : 'false'}`,
    { customPasswordUserIds },
  );
  return data;
}

export interface SociosBroadcastTestResult {
  sent: boolean;
  variant: 'default' | 'personalizada';
  username: string;
  email: string;
  /** Solo variante 'default'. */
  samplePassword?: string;
  /** Solo variante 'personalizada'. */
  setPasswordLink?: string;
}

/**
 * Envía el correo de socios solo a tu usuario, sin cambiar nada.
 * `custom=true` prueba la variante personalizada (correo con enlace-form).
 */
export async function broadcastSociosPasswordTest(
  custom = false,
): Promise<SociosBroadcastTestResult> {
  const { data } = await api.post<SociosBroadcastTestResult>(
    `/auth/broadcast-socios-password/test${custom ? '?custom=true' : ''}`,
  );
  return data;
}

export interface SetPasswordTokenParams {
  uid: string;
  subject_id: string;
  exp: string;
  sig: string;
}

/** Valida el enlace "crear contraseña" antes de mostrar el formulario. */
export async function validateSetPasswordToken(
  params: SetPasswordTokenParams,
): Promise<{ valid: boolean; username?: string }> {
  const { data } = await api.get('/auth/set-password/validate', { params });
  return data;
}

/** Fija la contraseña del usuario a partir del enlace firmado del correo. */
export async function setPasswordWithToken(payload: {
  uid: string;
  subjectId: string;
  exp: string;
  sig: string;
  newPassword: string;
}): Promise<{ message: string }> {
  const { data } = await api.post('/auth/set-password', payload);
  return data;
}
