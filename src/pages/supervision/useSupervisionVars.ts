import type { CSSProperties } from 'react';
import { theme } from 'antd';

/** Variables CSS de supervision.css a partir del token de AntD (claro/oscuro). */
export function useSupervisionVars(): CSSProperties {
  const { token } = theme.useToken();
  // Trío fondo/borde/texto de cada paleta: el algoritmo oscuro de AntD las
  // invierte, así que el contraste se mantiene en ambos temas.
  const tono = (name: string, bg: string, border: string, text: string) => ({
    [`--sv-${name}-bg`]: bg,
    [`--sv-${name}-border`]: border,
    [`--sv-${name}-text`]: text,
  });
  return {
    '--sv-bg': token.colorBgContainer,
    '--sv-header-bg': token.colorFillAlter,
    '--sv-subtle': token.colorFillTertiary,
    '--sv-hover': token.colorFillQuaternary,
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
    ...tono('ok', token.colorSuccessBg, token.colorSuccessBorder, token.colorSuccessText),
    ...tono('partial', token.colorWarningBg, token.colorWarningBorder, token.colorWarningText),
    ...tono('bad', token.colorErrorBg, token.colorErrorBorder, token.colorErrorText),
    '--sv-na-bg': token.colorFillSecondary,
    '--sv-na-border': token.colorBorder,
    ...tono('n1', token.colorErrorBg, token.colorErrorBorder, token.colorErrorText),
    ...tono('n2', token.orange1, token.orange3, token.orange9),
    ...tono('n3', token.gold1, token.gold3, token.gold9),
    ...tono('n4', token.lime1, token.lime3, token.lime9),
    ...tono('n5', token.colorSuccessBg, token.colorSuccessBorder, token.colorSuccessText),
  } as CSSProperties;
}
