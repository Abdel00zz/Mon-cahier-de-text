import type { ClassInfo } from '../../types';
import { normalizeOfficialClassName } from '../../constants';
import { readStoredClasses } from '../../infrastructure/storage/localClassStorage';

type AppView = 'dashboard' | 'editor' | 'settings' | 'help';
export interface AppRoute { view: AppView; activeClass: ClassInfo | null; }
export const DASHBOARD_ROUTE: AppRoute = { view: 'dashboard', activeClass: null };
export const DASHBOARD_HASH = '#/';
export const SETTINGS_HASH = '#/parametres';
export const HELP_HASH = '#/aide';
export const classRoute = (classId: string) => `#/classe/${encodeURIComponent(classId)}`;
export const scrollKey = ({ view, activeClass }: AppRoute) => view === 'editor' && activeClass ? `editor:${activeClass.id}` : view;

/** Unknown and retired routes resolve to the class dashboard. */
function resolveAppRoute(hash: string, classes: readonly ClassInfo[]): AppRoute {
  if (hash === SETTINGS_HASH) return { view: 'settings', activeClass: null };
  if (hash === HELP_HASH) return { view: 'help', activeClass: null };
  const match = hash.match(/^#\/classe\/([^/]+)$/);
  if (!match) return DASHBOARD_ROUTE;
  let id: string;
  try { id = decodeURIComponent(match[1]); } catch { return DASHBOARD_ROUTE; }
  const classInfo = classes.find(item => item.id === id);
  return classInfo ? { view: 'editor', activeClass: { ...classInfo, name: normalizeOfficialClassName(classInfo.name) } } : DASHBOARD_ROUTE;
}

export function readAppRoute(): AppRoute {
  try { return resolveAppRoute(window.location.hash, readStoredClasses()); }
  catch { return DASHBOARD_ROUTE; }
}
