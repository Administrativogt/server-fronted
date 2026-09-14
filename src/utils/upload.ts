/**
 * Límite de subida de archivos.
 *
 * El tope real lo pone nginx en producción (`client_max_body_size 50m`):
 * un archivo más grande ni siquiera llega al backend y nginx responde 413
 * con una página HTML. Validamos aquí ANTES de enviar para que el usuario
 * vea un mensaje entendible y sepa que debe comprimir el archivo.
 */
export const MAX_UPLOAD_MB = 50;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export function formatearMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Mensaje que ve el usuario cuando nginx rechaza la petición con 413. */
export const MENSAJE_413 =
  `El archivo supera el tamaño máximo permitido de ${MAX_UPLOAD_MB} MB. ` +
  'Comprima el PDF (por ejemplo con "Reducir tamaño" de Adobe o un compresor en línea) ' +
  'o vuelva a escanearlo a menor resolución e intente de nuevo.';

/**
 * Devuelve null si el archivo cabe en el límite, o el mensaje de error listo
 * para mostrar si lo supera.
 */
export function validarPesoArchivo(file: { name: string; size: number }): string | null {
  if (file.size <= MAX_UPLOAD_BYTES) return null;
  return (
    `"${file.name}" pesa ${formatearMb(file.size)} y el máximo permitido es ${MAX_UPLOAD_MB} MB. ` +
    'Comprima el PDF (por ejemplo con "Reducir tamaño" de Adobe o un compresor en línea) ' +
    'o vuelva a escanearlo a menor resolución antes de subirlo.'
  );
}
