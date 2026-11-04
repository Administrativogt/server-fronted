import api from '../api/axios';

/**
 * "Iniciar sesión con Microsoft" (Entra ID) sin librerías: Authorization Code
 * + PKCE desde el navegador (app registrada como SPA, sin client secret).
 * 1. startMicrosoftLogin → redirige a Microsoft con state, nonce y code_challenge.
 * 2. Microsoft regresa a /login/microsoft?code=…&state=…
 * 3. completeMicrosoftLogin canjea el code por el ID token (CORS permitido
 *    para SPA) y el backend lo valida en POST /auth/microsoft.
 */

export interface MicrosoftSsoConfig {
  enabled: boolean;
  tenantId?: string;
  clientId?: string;
  button?: 'visible' | 'hidden';
}

const KEY = 'ms_sso_flow';
/** Marca de que en este navegador ya se usó (para mostrar el botón en el piloto). */
export const MS_SSO_USED_KEY = 'ms_sso_used';
const SCOPE = 'openid profile email';

export const redirectUri = () => `${window.location.origin}/login/microsoft`;

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const random = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));

export const getMicrosoftConfig = () => api.get<MicrosoftSsoConfig>('/auth/microsoft/config').then((r) => r.data);

export async function startMicrosoftLogin(cfg: MicrosoftSsoConfig, redirectTo: string) {
  if (!cfg.enabled || !cfg.tenantId || !cfg.clientId) throw new Error('Inicio con Microsoft no disponible');
  const verifier = random(48);
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  const state = random(16);
  const nonce = random(16);
  sessionStorage.setItem(
    KEY,
    JSON.stringify({ verifier, state, nonce, redirectTo, tenantId: cfg.tenantId, clientId: cfg.clientId, at: Date.now() }),
  );
  const q = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    response_mode: 'query',
    scope: SCOPE,
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  window.location.assign(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/authorize?${q}`);
}

/** Canjea el code de la URL y devuelve la respuesta del login del backend. */
export async function completeMicrosoftLogin(search: string) {
  const params = new URLSearchParams(search);
  const raw = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);

  if (params.get('error')) {
    const desc = params.get('error_description') || params.get('error') || '';
    if (params.get('error') === 'access_denied') throw new Error('Cancelaste el inicio de sesión con Microsoft.');
    if (/AADSTS50105/.test(desc)) throw new Error('Tu cuenta de Microsoft no tiene acceso a este sistema. Pide acceso a TI.');
    throw new Error(`Microsoft no permitió el inicio de sesión. ${desc.split('\n')[0]}`);
  }
  const flow = raw ? JSON.parse(raw) : null;
  const code = params.get('code');
  if (!flow || !code || params.get('state') !== flow.state || Date.now() - flow.at > 10 * 60_000) {
    throw new Error('La sesión de Microsoft expiró o no es válida. Intenta de nuevo.');
  }

  const res = await fetch(`https://login.microsoftonline.com/${flow.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: flow.clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      code_verifier: flow.verifier,
      scope: SCOPE,
    }),
  });
  const token = await res.json().catch(() => ({}));
  if (!res.ok || !token.id_token) {
    throw new Error(`No se pudo completar el inicio con Microsoft. ${String(token.error_description || '').split('\n')[0]}`);
  }

  const { data } = await api.post('/auth/microsoft', { id_token: token.id_token, nonce: flow.nonce });
  try {
    localStorage.setItem(MS_SSO_USED_KEY, '1');
  } catch {
    /* sin storage: solo afecta mostrar el botón */
  }
  return { data, redirectTo: typeof flow.redirectTo === 'string' ? flow.redirectTo : '/dashboard' };
}
