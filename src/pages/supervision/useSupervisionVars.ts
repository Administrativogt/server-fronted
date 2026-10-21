import type { CSSProperties } from 'react';
import { theme } from 'antd';

/** Variables CSS de supervision.css a partir del token de AntD (claro/oscuro). */
export function useSupervisionVars(): CSSProperties {
  const { token } = theme.useToken();
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
    '--sv-ok': token.colorSuccess,
    '--sv-partial': token.colorWarning,
    '--sv-bad': token.colorError,
    '--sv-na': token.colorTextTertiary,
    '--sv-n1': token.colorError,
    '--sv-n2': token.orange,
    '--sv-n3': token.gold,
    '--sv-n4': token.lime,
    '--sv-n5': token.colorSuccess,
  } as CSSProperties;
}
