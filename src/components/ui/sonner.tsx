import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toaster de la superficie de inducción. `theme` viene de useThemeStore (la
 * app no pone la clase `dark` en <html>), y los estilos usan los tokens del
 * scope `induccion-ui` que el wrapper de la página define.
 */
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    className="induccion-ui pointer-events-auto"
    toastOptions={{
      classNames: {
        toast:
          'group flex items-center gap-3 w-full rounded-lg border bg-card p-4 text-card-foreground shadow-lg',
        title: 'text-sm font-semibold',
        description: 'text-sm text-muted-foreground',
        actionButton: 'bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-semibold',
        cancelButton: 'bg-secondary text-secondary-foreground rounded-md px-3 py-1.5 text-xs font-semibold',
        success: '[&_svg]:text-success',
        error: '[&_svg]:text-destructive',
        warning: '[&_svg]:text-gold',
      },
    }}
    {...props}
  />
);

export { Toaster };
