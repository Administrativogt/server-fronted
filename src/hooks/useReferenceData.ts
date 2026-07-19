import { useState, useEffect, useCallback } from 'react';
import { getAreas, getEquipos, getGroups, getAllUsers } from '../api/users';
import type { UserArea, UserEquipo, Group, User } from '../types/user.types';

/**
 * Datos de referencia compartidos del módulo de administración
 * (áreas, equipos, grupos y usuarios activos para el select de "Jefe").
 *
 * Antes cada modal (Crear / Editar) y la página los pedía por separado, así que
 * abrir varios formularios disparaba las mismas 4 llamadas una y otra vez. Aquí
 * se cachean a nivel de módulo con dedup de peticiones en vuelo y un TTL corto:
 * cambian rara vez, así que basta con refrescar cada pocos minutos o tras un alta.
 */
export interface ReferenceData {
  areas: UserArea[];
  equipos: UserEquipo[];
  groups: Group[];
  usuarios: User[];
}

const EMPTY: ReferenceData = { areas: [], equipos: [], groups: [], usuarios: [] };
const TTL = 5 * 60 * 1000; // 5 minutos

let cache: ReferenceData | null = null;
let cachedAt = 0;
let inFlight: Promise<ReferenceData> | null = null;

async function fetchReferenceData(): Promise<ReferenceData> {
  const [areasRes, equiposRes, groupsRes, usersRes] = await Promise.all([
    getAreas(),
    getEquipos(),
    getGroups(),
    getAllUsers(),
  ]);
  return {
    areas: [...areasRes.data].sort((a: UserArea, b: UserArea) => a.nombre.localeCompare(b.nombre)),
    equipos: [...equiposRes.data].sort((a: UserEquipo, b: UserEquipo) => a.nombre.localeCompare(b.nombre)),
    groups: [...groupsRes.data].sort((a: Group, b: Group) => a.name.localeCompare(b.name)),
    usuarios: [...usersRes.data].sort((a: User, b: User) => a.first_name.localeCompare(b.first_name)),
  };
}

/** Invalida la caché (p. ej. tras crear un usuario, para que aparezca como "Jefe"). */
export function invalidateReferenceData() {
  cache = null;
  cachedAt = 0;
}

/**
 * @param enabled  sólo dispara la carga cuando el consumidor la necesita
 *                 (p. ej. cuando un modal está abierto).
 */
export function useReferenceData(enabled: boolean) {
  const [data, setData] = useState<ReferenceData>(cache ?? EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async (force = false) => {
    const fresh = cache && Date.now() - cachedAt < TTL;
    if (fresh && !force) {
      setData(cache!);
      return;
    }
    if (!inFlight || force) {
      inFlight = fetchReferenceData()
        .then((d) => {
          cache = d;
          cachedAt = Date.now();
          inFlight = null;
          return d;
        })
        .catch((e) => {
          inFlight = null;
          throw e;
        });
    }
    try {
      setLoading(true);
      setError(null);
      setData(await inFlight);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  return { ...data, loading, error, reload: () => load(true) };
}
