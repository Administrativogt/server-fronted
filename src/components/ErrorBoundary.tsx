import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result, Typography } from 'antd';
import { ReloadOutlined, HomeOutlined } from '@ant-design/icons';
import useThemeStore from '../hooks/useThemeStore';

const { Paragraph, Text } = Typography;

/** Errores de carga de chunk (redeploy dejó los assets viejos sin servir). */
const isChunkLoadError = (error: unknown): boolean => {
  const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i.test(
    msg,
  );
};

/** Fallback visual (función aparte para poder usar el hook de tema). */
function ErrorFallback({ error, fullScreen = true }: { error: Error | null; fullScreen?: boolean }) {
  const isDark = useThemeStore((s) => s.mode === 'dark');
  const chunk = isChunkLoadError(error);

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: fullScreen ? '100vh' : 360,
        padding: 24,
        background: fullScreen ? (isDark ? '#161824' : '#EFF4FB') : 'transparent',
      }}
    >
      <Result
        status={chunk ? 'info' : 'error'}
        title={chunk ? 'Hay una versión nueva disponible' : 'Algo salió mal'}
        subTitle={
          chunk
            ? 'La aplicación se actualizó mientras trabajabas. Recarga para continuar con la última versión.'
            : 'Ocurrió un error inesperado al mostrar esta pantalla. Puedes recargar o volver al inicio.'
        }
        extra={[
          <Button
            key="reload"
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => window.location.reload()}
          >
            Recargar
          </Button>,
          !chunk && (
            <Button
              key="home"
              icon={<HomeOutlined />}
              onClick={() => window.location.assign('/dashboard')}
            >
              Ir al inicio
            </Button>
          ),
        ].filter(Boolean)}
      >
        {!chunk && error?.message && (
          <Paragraph style={{ marginBottom: 0 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Detalle técnico: {error.message}
            </Text>
          </Paragraph>
        )}
      </Result>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** false → el fallback ocupa el área de contenido, no toda la pantalla. */
  fullScreen?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Límite de error global. Evita que un error de render (incluidos los chunks
 * lazy que fallan tras un redeploy) deje la app en pantalla en blanco.
 * Se remonta con `key={location.pathname}` en App, así se resetea al navegar.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Punto único para enganchar un logger externo (Sentry, etc.) más adelante.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} fullScreen={this.props.fullScreen} />;
    }
    return this.props.children;
  }
}
