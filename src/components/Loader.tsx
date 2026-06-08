import useThemeStore from '../hooks/useThemeStore';
import './Loader.css';

interface LoaderProps {
  /** Ocupa toda la pantalla y pinta fondo según el tema (para fallback de rutas). */
  fullScreen?: boolean;
  /** Tamaño del icono en px. */
  size?: number;
  /** Texto opcional debajo de la balanza. */
  label?: string;
}

export default function Loader({ fullScreen = false, size = 72, label }: LoaderProps) {
  const isDark = useThemeStore((s) => s.mode === 'dark');
  const color = isDark ? '#7C8BF5' : '#3C50E0';
  const labelColor = isDark ? '#A0A4B3' : '#64748B';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        width: '100%',
        minHeight: fullScreen ? '100vh' : 240,
        background: fullScreen ? (isDark ? '#161824' : '#EFF4FB') : 'transparent',
      }}
      role="status"
      aria-label={label ?? 'Cargando'}
    >
      <svg
        className="scales-loader"
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Base */}
        <path d="M33 90 H67" />
        <path d="M43 90 L45 80 H55 L57 90" />
        {/* Mástil */}
        <path d="M50 80 V30" />
        {/* Fulcro */}
        <circle className="scales-pivot" cx="50" cy="30" r="3" fill={color} stroke="none" />

        {/* Conjunto que se mece: viga, cadenas y platillos */}
        <g className="scales-beam">
          {/* Viga */}
          <path d="M16 30 H84" />

          {/* Lado izquierdo */}
          <path d="M18 30 L11 48" />
          <path d="M18 30 L25 48" />
          <path d="M9 48 Q18 58 27 48" />

          {/* Lado derecho */}
          <path d="M82 30 L75 48" />
          <path d="M82 30 L89 48" />
          <path d="M73 48 Q82 58 91 48" />
        </g>
      </svg>

      {label && (
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: labelColor,
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
