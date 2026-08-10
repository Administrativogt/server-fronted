/**
 * Espejo del backend (INDUCTION_ADMINS): superusuarios + RRHH (MEJ000).
 * Única fuente de la regla en el front; el menú (DashboardLayout) y la ruta
 * (InductionRoute) la comparten. El backend valida igual en cada endpoint:
 * esto solo evita mostrar la página rota a quien entra sin permiso.
 */
export const canManageInduction = (
  isSuperuser: boolean | null | undefined,
  username: string | null | undefined,
): boolean => !!isSuperuser || (username ?? '').toUpperCase() === 'MEJ000';
