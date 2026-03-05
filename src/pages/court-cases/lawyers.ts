import type { CaseTypeKey } from '../../api/courtCases';
import type { UserLite } from '../../api/users';

const LABORAL_AREA_ID = 5;
const PENAL_AREA_ID = 10;
const MEA_AREA_ID = 16;

const ALLOWED_TIPO_USUARIO = new Set([1, 3, 4, 5, 11]);
const MEA_ALLOWED_AREAS = new Set([3, 6, 7, 9, 16]);

const hasEnoughMetadata = (users: UserLite[]): boolean => {
  return users.some((user) => {
    return (
      user.tipo_usuario != null ||
      user.estado != null ||
      user.area?.id != null ||
      user.equipo?.id != null
    );
  });
};

const isActiveUser = (user: UserLite): boolean => {
  // Django uses estado=1 for active users in this module.
  if (user.estado == null) return true;
  return user.estado === 1;
};

const byTipoUsuario = (user: UserLite, expected: number[] | Set<number>): boolean => {
  if (user.tipo_usuario == null) return true;
  if (Array.isArray(expected)) return expected.includes(user.tipo_usuario);
  return expected.has(user.tipo_usuario);
};

const byAreaId = (user: UserLite, expected: number[] | Set<number>): boolean => {
  if (user.area?.id == null) return true;
  if (Array.isArray(expected)) return expected.includes(user.area.id);
  return expected.has(user.area.id);
};

const byEquipoId = (user: UserLite, expected: number[]): boolean => {
  if (user.equipo?.id == null) return true;
  return expected.includes(user.equipo.id);
};

export const filterLawyersForCourtCases = (
  users: UserLite[],
  currentAreaId: number | null | undefined,
  caseType: CaseTypeKey,
  mode: 'create' | 'list',
): UserLite[] => {
  if (!users.length || !hasEnoughMetadata(users)) {
    return users;
  }

  const baseTeamIds = mode === 'create' ? [6, 7] : [6, 7, 12];

  // Django behavior: labor form/labor users only labor lawyers.
  if (caseType === 'labor' || currentAreaId === LABORAL_AREA_ID) {
    return users.filter(
      (user) =>
        isActiveUser(user) &&
        byAreaId(user, [LABORAL_AREA_ID]) &&
        byTipoUsuario(user, ALLOWED_TIPO_USUARIO),
    );
  }

  // Django behavior for MEA users.
  if (currentAreaId === MEA_AREA_ID) {
    return users.filter(
      (user) => isActiveUser(user) && byAreaId(user, MEA_ALLOWED_AREAS) && byTipoUsuario(user, [1]),
    );
  }

  // Django behavior in create view for PENAL users.
  if (mode === 'create' && currentAreaId === PENAL_AREA_ID) {
    return users.filter(
      (user) =>
        isActiveUser(user) &&
        byAreaId(user, [PENAL_AREA_ID]) &&
        byTipoUsuario(user, ALLOWED_TIPO_USUARIO),
    );
  }

  return users.filter(
    (user) =>
      isActiveUser(user) &&
      byEquipoId(user, baseTeamIds) &&
      byTipoUsuario(user, ALLOWED_TIPO_USUARIO),
  );
};
