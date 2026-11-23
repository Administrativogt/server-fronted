const API_URL: string = import.meta.env.VITE_API_URL ?? '';

/** true cuando la app apunta a producción (datos y correos reales). */
export const IS_PROD_API = API_URL.includes('administrativogt.com');

/** Nombre legible del servidor, para el login y "Mi cuenta". */
export const API_LABEL = IS_PROD_API
  ? 'Producción'
  : API_URL.includes('10.0.2.2') || API_URL.includes('localhost')
    ? 'Local (emulador)'
    : /^https?:\/\/(\d+\.){3}\d+/.test(API_URL)
      ? 'Local (Wi-Fi)'
      : API_URL || 'Local';

declare const __APP_VERSION__: string | undefined;
/** Versión de la app (mobile-version.json), p. ej. "1.1.0 (2)". */
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
