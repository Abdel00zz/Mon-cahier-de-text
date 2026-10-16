import type { ClassInfo } from '../../types';
import { normalizeOfficialClassName } from '../../constants';
import { assignClassColors } from '../../domain/classes/classColors';
import { LocalSyncDataError, readLocalJson } from './localJson';

export const CLASS_STORAGE_KEY = 'classManager_v1';

export const readStoredClasses = (storage?: Pick<Storage, 'getItem'>): ClassInfo[] => {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return [];
  const stored = readLocalJson(CLASS_STORAGE_KEY, [], store);
  if (!Array.isArray(stored) || stored.some(c => !c || typeof c.id !== 'string' || typeof c.name !== 'string')) {
    throw new LocalSyncDataError(CLASS_STORAGE_KEY);
  }
  return assignClassColors(stored.map((classInfo: ClassInfo) => ({ ...classInfo, name: normalizeOfficialClassName(classInfo.name) })));
};

