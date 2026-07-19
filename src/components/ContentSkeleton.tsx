import { Skeleton } from 'antd';

/**
 * Esqueleto para el área de contenido mientras carga una página lazy.
 * Reemplaza el spinner de pantalla completa: el shell (sidebar/header) queda
 * fijo y solo el contenido muestra el placeholder, imitando el patrón dominante
 * (título + filtros + tabla). Theme-aware vía el algoritmo de AntD.
 */
export default function ContentSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      aria-label="Cargando contenido"
      style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      {/* Título */}
      <Skeleton.Input active size="large" style={{ width: 260, height: 32 }} />

      {/* Fila de filtros / acciones */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Skeleton.Button active style={{ width: 160, height: 36 }} />
        <Skeleton.Button active style={{ width: 200, height: 36 }} />
        <Skeleton.Button active style={{ width: 120, height: 36 }} />
      </div>

      {/* Filas tipo tabla */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton.Input key={i} active block style={{ height: 40 }} />
        ))}
      </div>
    </div>
  );
}
