import type { CSSProperties } from 'react';
import { theme } from 'antd';

/**
 * Variables CSS de supervision.css a partir del token de AntD (claro/oscuro).
 * Los colores de calificación (Sí/Parcial/No/N/A, notas y semáforo) son sólidos
 * y viven en supervision.css: llevan texto blanco con ≥4.5:1 en ambos temas.
 */
export function useSupervisionVars(): CSSProperties {
  const { token } = theme.useToken();
  return {
    '--sv-bg': token.colorBgContainer,
    // Translúcidos: en celdas fijas (sticky) se pintan SOBRE --sv-bg para que
    // las filas no se vean a través al hacer scroll.
    '--sv-header-bg': token.colorFillAlter,
    '--sv-subtle': token.colorFillTertiary,
    '--sv-hover': token.colorFillQuaternary,
    '--sv-section-bg': token.colorPrimaryBg,
    '--sv-section-text': token.colorPrimaryText,
    '--sv-border': token.colorBorder,
    '--sv-split': token.colorSplit,
    '--sv-text': token.colorText,
    '--sv-muted': token.colorTextSecondary,
    '--sv-primary': token.colorPrimary,
    '--sv-success-bg': token.colorSuccessBg,
    '--sv-success-border': token.colorSuccessBorder,
    '--sv-success-text': token.colorSuccessText,
    '--sv-warning-bg': token.colorWarningBg,
    '--sv-warning-border': token.colorWarningBorder,
    '--sv-warning-text': token.colorWarningText,
  } as CSSProperties;
}
