import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  // Solo la superficie de inducción usa Tailwind/shadcn por ahora. Ampliar
  // estos globs activaría clases latentes en páginas viejas (jurisprudence)
  // que nunca se compilaron; hacerlo requiere revisarlas primero.
  content: [
    "./src/pages/induccion/**/*.{ts,tsx}",
    "./src/components/ui/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  // La clase `dark` se aplica en el wrapper de la página según useThemeStore.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        /* Dorado del diploma (única concesión fuera de la paleta del sistema) */
        gold: {
          DEFAULT: 'hsl(var(--gold))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [animate],
  corePlugins: {
    preflight: false, // El reset global chocaría con AntD; hay uno scoped en index.css
  },
}
