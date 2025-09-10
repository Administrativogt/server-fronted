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

export default function usePermissions() {
  const role = getUserRole();
  return rolePermissions[role];
}
