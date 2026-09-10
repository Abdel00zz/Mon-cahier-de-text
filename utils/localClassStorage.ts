import type { ClassInfo } from '../types';
import { normalizeOfficialClassName } from '../constants';

export const CLASS_STORAGE_KEY = 'classManager_v1';

export class LocalSyncDataError extends Error {
  constructor(key: string) {
    super(`Données locales illisibles (${key}). La copie existante est conservée ; synchronisation suspendue.`);
    this.name = 'LocalSyncDataError';
  }
}

/** Une donnée endommagée n'est jamais assimilée à un cahier volontairement vide. */
export const parseLocalJson = (raw: string | null, key: string, fallback: unknown): unknown => {
  try { return raw === null ? fallback : JSON.parse(raw); }
  catch { throw new LocalSyncDataError(key); }
};

export const readStoredClasses = (storage: Pick<Storage, 'getItem'> = localStorage): ClassInfo[] => {
  const stored = parseLocalJson(storage.getItem(CLASS_STORAGE_KEY), CLASS_STORAGE_KEY, []);
  if (!Array.isArray(stored) || stored.some(c => !c || typeof c.id !== 'string' || typeof c.name !== 'string')) {
    throw new LocalSyncDataError(CLASS_STORAGE_KEY);
  }
  return stored.map((classInfo: ClassInfo) => ({ ...classInfo, name: normalizeOfficialClassName(classInfo.name), color: '' }));
};
