import { createContext } from 'react';

/* Pantallas del menú que el usuario puede abrir (ya filtradas por permisos
   en DashboardLayout). Las usa el buscador global para encontrar pantallas
   además de registros: un solo buscador para todo. */

export interface NavPage {
  path: string;
  label: string;
  /** módulo padre ("Gestión de cheques"), para dar contexto */
  parent: string | null;
}

export const NavPagesContext = createContext<NavPage[]>([]);

type MenuLike = { key?: unknown; label?: unknown; searchText?: unknown; children?: MenuLike[] };

/** Hojas navegables de los ítems del menú (sin el inicio). */
export function flattenNav(items: MenuLike[], parent: string | null = null): NavPage[] {
  return items.flatMap((it) => {
    const text = typeof it.searchText === 'string' ? it.searchText : typeof it.label === 'string' ? it.label : '';
    if (it.children?.length) return flattenNav(it.children, parent ?? (text || null));
    const key = String(it.key ?? '');
    return key.startsWith('/') && key !== '/dashboard' && text ? [{ path: key, label: text, parent }] : [];
  });
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Pantallas cuyo nombre o módulo contiene todas las palabras buscadas. */
export function matchPages(pages: NavPage[], q: string, limit = 5): NavPage[] {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return pages
    .filter((p) => {
      const hay = fold(`${p.parent ?? ''} ${p.label}`);
      return words.every((w) => hay.includes(w));
    })
    .slice(0, limit);
}
