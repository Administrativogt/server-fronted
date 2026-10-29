const API_URL: string = import.meta.env.VITE_API_URL ?? '';

/** true cuando la app apunta a producción (datos y correos reales). */
export const IS_PROD_API = API_URL.includes('administrativogt.com');

/** Nombre legible del servidor, para el login y "Mi cuenta". */
export const API_LABEL = IS_PROD_API
  ? 'Producción'
  : API_URL.includes('10.0.2.2')
    ? 'Local (emulador)'
    : API_URL || 'Local';
