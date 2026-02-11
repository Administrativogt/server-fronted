// src/hooks/usePermissions.ts
import useAuthStore from '../auth/useAuthStore';

export type UserRole = 'admin' | 'receptionist' | 'messenger';

export const getUserRole = (): UserRole => {
  return 'receptionist'; // Simulado: luego lo conectas al login real
};

const rolePermissions: Record<UserRole, Record<string, boolean>> = {
  admin: {
    view: true,
    add: true,
    edit: true,
    delete: true,
    confirm: true,
  },
  receptionist: {
    view: true,
    add: true,
    edit: true,
    delete: false,
    confirm: true,
  },
  messenger: {
    view: true,
    add: false,
    edit: false,
    delete: false,
    confirm: false,
  },
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

// ✅ NUEVO: Hook mejorado para permisos de mensajería
export const useMensajeriaPermissions = () => {
  const { tipo_usuario, username } = useAuthStore();

  // Verificar si puede asignar mensajeros (solo coordinadores tipo 8 y 10, o admins específicos)
  const canAssignMensajero = tipo_usuario === 8 || tipo_usuario === 10;

  // Verificar si es mensajero
  const isMensajero = tipo_usuario === 8;

  // Verificar si es coordinador
  const isCoordinador = tipo_usuario === 10;

  // Usuarios admin específicos que pueden ver todos los envíos asignados
  const isAdminMensajeria = username === 'ESC002' || username === 'BAR008';

  return {
    canAssignMensajero,
    isMensajero,
    isCoordinador,
    isAdminMensajeria,
  };
};

/**
 * Hook para permisos de administración de usuarios
 * Solo superadmins y Pedro Luis pueden acceder al módulo de administración
 */
export const useUserAdminPermissions = () => {
  const is_superuser = useAuthStore(state => state.is_superuser);
  const username = useAuthStore(state => state.username);

  const adminUsernames = ['TOR002', 'ESC002', 'BAR008'];
  const canAccessUserAdmin = is_superuser || adminUsernames.includes(username);

  return { canAccessUserAdmin };
};
