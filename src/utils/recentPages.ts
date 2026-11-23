import { MENU, type NavItem } from '../config/menu';

/* Accesos recientes: las últimas pantallas que el usuario abrió, guardadas
   en su navegador (por usuario). Solo rutas del menú (o detalles bajo ellas);
   el inicio no cuenta. */

export interface RecentPage {
  path: string;
  label: string;
  /** módulo padre, para dar contexto ("Gestión de cheques") */
  parent: string | null;
}

const MAX = 6;
const EVENT = 'recent-pages-change';
const storeKey = (user: string | null | undefined) => `recent_pages_${user ?? 'anon'}`;

/** Hojas del menú (ruta → etiqueta y módulo padre), la ruta más larga primero. */
const LEAVES: RecentPage[] = (() => {
  const out: RecentPage[] = [];
  const walk = (items: NavItem[], parent: string | null) => {
    for (const it of items) {
      if (it.children) walk(it.children, parent ?? it.label);
      else if (it.key.startsWith('/') && it.key !== '/dashboard') out.push({ path: it.key, label: it.label, parent });
    }
  };
  walk(MENU, null);
  return out.sort((a, b) => b.path.length - a.path.length);
})();

/** La entrada del menú que corresponde a una ruta (exacta o el prefijo más largo). */
export function describePath(pathname: string): RecentPage | null {
  const clean = pathname.replace(/\/+$/, '');
  const hit = LEAVES.find((l) => clean === l.path || clean.startsWith(l.path + '/'));
  return hit ? { ...hit, path: hit.path } : null;
}

export function getRecentPages(user: string | null | undefined): RecentPage[] {
  try {
    const raw = localStorage.getItem(storeKey(user));
    const list = raw ? (JSON.parse(raw) as RecentPage[]) : [];
    return Array.isArray(list) ? list.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecentPage(user: string | null | undefined, pathname: string) {
  const page = describePath(pathname);
  if (!page) return;
  try {
    const list = getRecentPages(user).filter((p) => p.path !== page.path);
    localStorage.setItem(storeKey(user), JSON.stringify([page, ...list].slice(0, MAX)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* sin almacenamiento disponible: los recientes simplemente no se guardan */
  }
}

export function onRecentPagesChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
