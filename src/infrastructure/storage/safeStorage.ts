/**
 * Écritures locales robustes. localStorage n'a ni transaction ni quota garanti :
 * - un cahier illisible n'est jamais écrasé sans copie de quarantaine ;
 * - un quota plein ne libère que des données de confort, jamais un cahier ;
 * - le navigateur est invité à rendre le stockage persistant.
 */
type WritableStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

export const QUARANTINE_PREFIX = 'classDataQuarantine_v1_';
const JOURNAL_PREFIX = 'editJournal_v1_';
/** Entrées conservées par journal quand l'espace manque (le journal plein en garde 60). */
const JOURNAL_KEEP_UNDER_PRESSURE = 10;
const MAX_QUARANTINE_COPIES = 3;

export class LocalQuotaError extends Error {
  constructor(key: string, cause?: unknown) {
    super(`Espace de stockage plein (${key}). Les données précédentes sont conservées.`, { cause });
    this.name = 'LocalQuotaError';
  }
}

export const isQuotaError = (error: unknown): boolean => {
  if (error instanceof LocalQuotaError) return true;
  if (!error || typeof error !== 'object') return false;
  const { name, code, message } = error as { name?: unknown; code?: unknown; message?: unknown };
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22 || code === 1014
    || (typeof message === 'string' && /quota/i.test(message));
};

const storageKeys = (storage: WritableStorage): string[] => {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key !== null) keys.push(key);
  }
  return keys;
};

/** Raccourcit les journaux d'édition (confort). Retourne le nombre d'octets libérés (≈ caractères × 2). */
export function releaseComfortSpace(storage: WritableStorage = localStorage): number {
  let freed = 0;
  for (const key of storageKeys(storage)) {
    if (!key.startsWith(JOURNAL_PREFIX)) continue;
    const raw = storage.getItem(key);
    if (raw === null) continue;
    try {
      const entries = JSON.parse(raw);
      if (!Array.isArray(entries) || entries.length <= JOURNAL_KEEP_UNDER_PRESSURE) continue;
      const trimmed = JSON.stringify(entries.slice(0, JOURNAL_KEEP_UNDER_PRESSURE));
      storage.setItem(key, trimmed);
      freed += (raw.length - trimmed.length) * 2;
    } catch {
      // Journal illisible : il ne porte aucune donnée pédagogique.
      storage.removeItem(key);
      freed += raw.length * 2;
    }
  }
  return freed;
}

/**
 * Écrit puis relit. En cas de quota plein, libère l'espace de confort et réessaie
 * une seule fois ; sinon lève LocalQuotaError en laissant la valeur précédente intacte.
 */
export function writeDurably(key: string, value: string, storage: WritableStorage = localStorage): void {
  try {
    storage.setItem(key, value);
  } catch (error) {
    if (!isQuotaError(error)) throw error;
    if (releaseComfortSpace(storage) <= 0) throw new LocalQuotaError(key, error);
    try {
      storage.setItem(key, value);
    } catch (retry) {
      if (isQuotaError(retry)) throw new LocalQuotaError(key, retry);
      throw retry;
    }
  }
  if (storage.getItem(key) !== value) throw new Error(`Vérification de l'écriture locale échouée (${key}).`);
}

/** Conserve une copie brute avant tout écrasement d'une valeur illisible. */
export function quarantineRaw(classId: string, raw: string, storage: WritableStorage = localStorage, now = Date.now()): string {
  const prefix = `${QUARANTINE_PREFIX}${classId}_`;
  const existing = storageKeys(storage).filter(key => key.startsWith(prefix)).sort();
  if (existing.some(key => storage.getItem(key) === raw)) return existing.find(key => storage.getItem(key) === raw)!;
  const target = `${prefix}${now}`;
  writeDurably(target, raw, storage);
  // Les copies les plus anciennes partent seulement après une écriture réussie.
  for (const old of existing.slice(0, Math.max(0, existing.length + 1 - MAX_QUARANTINE_COPIES))) storage.removeItem(old);
  return target;
}

/** Supprime les copies de quarantaine d'une classe que l'enseignant a supprimée. */
export function removeQuarantine(classId: string, storage: WritableStorage = localStorage): void {
  const prefix = `${QUARANTINE_PREFIX}${classId}_`;
  for (const key of storageKeys(storage)) if (key.startsWith(prefix)) storage.removeItem(key);
}

export interface StorageHealth {
  persisted: boolean | null;
  usageBytes: number | null;
  quotaBytes: number | null;
  quarantinedCopies: number;
}

/** Demande la persistance (protège contre l'éviction automatique) ; sans effet si non supporté. */
export async function requestPersistentStorage(): Promise<boolean | null> {
  const manager = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!manager?.persist || !manager.persisted) return null;
  try {
    return (await manager.persisted()) || (await manager.persist());
  } catch {
    return null;
  }
}

export async function readStorageHealth(storage: WritableStorage = localStorage): Promise<StorageHealth> {
  const manager = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  let persisted: boolean | null = null;
  let usageBytes: number | null = null;
  let quotaBytes: number | null = null;
  try { persisted = manager?.persisted ? await manager.persisted() : null; } catch { /* non supporté */ }
  try {
    const estimate = manager?.estimate ? await manager.estimate() : undefined;
    usageBytes = estimate?.usage ?? null;
    quotaBytes = estimate?.quota ?? null;
  } catch { /* non supporté */ }
  const quarantinedCopies = storageKeys(storage).filter(key => key.startsWith(QUARANTINE_PREFIX)).length;
  return { persisted, usageBytes, quotaBytes, quarantinedCopies };
}
