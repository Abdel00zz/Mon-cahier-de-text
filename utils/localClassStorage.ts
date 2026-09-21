import type { ClassInfo } from '../types';
import { normalizeOfficialClassName } from '../constants';
import { assignClassColors } from './classColors';

export const CLASS_STORAGE_KEY = 'classManager_v1';

export const DEFAULT_STARTER_CLASSES: ClassInfo[] = [
  {
    id: 'class-sp4',
    name: '2ème Bac Sciences Physiques 4',
    teacherName: 'Professeur',
    subject: 'Physique-Chimie',
    cycle: 'lycee',
    lastOpenedAt: '2026-09-17T22:02:00.000Z',
    createdAt: '2026-09-17T20:00:00.000Z',
    color: '',
  },
  {
    id: 'class-lsh6',
    name: 'Tronc commun Lettres et Sciences Humaines 6',
    teacherName: 'Professeur',
    subject: 'Lettres et Sciences Humaines',
    cycle: 'lycee',
    createdAt: '2026-09-17T19:00:00.000Z',
    color: '',
  },
  {
    id: 'class-svt2',
    name: '2ème Bac Sciences de la Vie et de la Terre 2',
    teacherName: 'Professeur',
    subject: 'Sciences de la Vie et de la Terre',
    cycle: 'lycee',
    createdAt: '2026-09-17T18:00:00.000Z',
    color: '',
  },
  {
    id: 'class-sp3',
    name: '2ème Bac Sciences Physiques 3',
    teacherName: 'Professeur',
    subject: 'Physique-Chimie',
    cycle: 'lycee',
    lastOpenedAt: '2026-09-17T21:41:00.000Z',
    createdAt: '2026-09-17T17:00:00.000Z',
    color: '',
  },
];

class LocalSyncDataError extends Error {
  constructor(key: string) {
    super(`Données locales illisibles (${key}). La copie existante est conservée ; synchronisation suspendue.`);
    this.name = 'LocalSyncDataError';
  }
}

/** Une donnée endommagée n'est jamais assimilée à un cahier volontairement vide. */
const parseLocalJson = (raw: string | null, key: string, fallback: unknown): unknown => {
  try { return raw === null ? fallback : JSON.parse(raw); }
  catch { throw new LocalSyncDataError(key); }
};

export const readStoredClasses = (storage: Pick<Storage, 'getItem'> = localStorage): ClassInfo[] => {
  const stored = parseLocalJson(storage.getItem(CLASS_STORAGE_KEY), CLASS_STORAGE_KEY, []);
  if (!Array.isArray(stored) || stored.some(c => !c || typeof c.id !== 'string' || typeof c.name !== 'string')) {
    throw new LocalSyncDataError(CLASS_STORAGE_KEY);
  }
  return assignClassColors(stored.map((classInfo: ClassInfo) => ({ ...classInfo, name: normalizeOfficialClassName(classInfo.name) })));
};
