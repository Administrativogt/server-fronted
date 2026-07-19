// src/hooks/usePermissions.ts
import useAuthStore from '../auth/useAuthStore';

export type UserRole = 'admin' | 'receptionist' | 'messenger';

export const getUserRole = (): UserRole => {
  return 'receptionist'; // Simulado: luego lo conectas al login real
};

/**
 * Hook principal para verificar permisos específicos del usuario
 * Compatible con el sistema de permisos del backend NestJS
 */
export const usePermissions = () => {
  const is_superuser = useAuthStore(state => state.is_superuser);
  const permissions = useAuthStore(state => state.permissions) || [];

  const hasPermission = (permission: string): boolean => {
    // Si es superusuario, tiene todos los permisos
    if (is_superuser) return true;
    
    // Verificar si el permiso está en la lista
    return permissions.includes(permission);
  };

  const isSuperUser = (): boolean => {
    return is_superuser === true;
  };

  return {
    hasPermission,
    isSuperUser,
    permissions,
  };
};

// Equipo de mensajería autorizado a fijar/modificar la fecha de realización.
// Debe coincidir con el backend (encargos.service.ts MENSAJERIA_TEAM_IDS):
// mensajeros (tipo_usuario=8) + IDs especiales Wendy, Amalia, Mara Ortiz,
// Pedro Luis Toribio.
export const MENSAJERIA_TEAM_IDS = [185, 159, 172, 203];

// ✅ NUEVO: Hook mejorado para permisos de mensajería
export const useMensajeriaPermissions = () => {
  const { tipo_usuario, username, userId } = useAuthStore();

  // Verificar si puede asignar mensajeros (solo coordinadores tipo 8 y 10, o admins específicos)
  const canAssignMensajero = tipo_usuario === 8 || tipo_usuario === 10;

  // Verificar si es mensajero
  const isMensajero = tipo_usuario === 8;

  // Verificar si es coordinador
  const isCoordinador = tipo_usuario === 10;

  // Equipo de mensajería: único autorizado a editar la fecha de realización
  // (mensajeros + IDs especiales). NO incluye a todos los admins.
  const isEquipoMensajeria =
    tipo_usuario === 8 ||
    (userId != null && MENSAJERIA_TEAM_IDS.includes(userId));

  // Usuarios admin específicos que pueden ver todos los envíos asignados
  const isAdminMensajeria = username === 'ESC002' || username === 'BAR008';

  return {
    canAssignMensajero,
    isMensajero,
    isCoordinador,
    isEquipoMensajeria,
    isAdminMensajeria,
  };
};

/**
 * Hook para permisos de administración de usuarios
 * Superadmins y usuarios admin tienen acceso completo.
 * MIR001 tiene acceso restringido: solo puede editar el código de directorio Sirvo.
 */
export const useUserAdminPermissions = () => {
  const is_superuser = useAuthStore(state => state.is_superuser);
  const username = useAuthStore(state => state.username);

  const adminUsernames = ['TOR002', 'ESC002', 'BAR008', 'MEJ000'];
  const sirvoCodeUsernames = ['MIR001'];

  const isFullAdmin = is_superuser || adminUsernames.includes(username);
  const isSirvoCodeUser = sirvoCodeUsernames.includes(username);
  const canAccessUserAdmin = isFullAdmin || isSirvoCodeUser;

  return { canAccessUserAdmin, isFullAdmin, isSirvoCodeUser };
};
