/** A missing value is distinct from an unreadable value on a write/sync path. */
export class LocalSyncDataError extends Error {
  constructor(key: string, cause?: unknown) {
    super(`Données locales illisibles (${key}). La copie existante est conservée ; synchronisation suspendue.`, { cause });
    this.name = 'LocalSyncDataError';
  }
}

export function readLocalJson(key: string, fallback: unknown, storage: Pick<Storage, 'getItem'> = localStorage): unknown {
  try {
    const raw = storage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (cause) {
    throw new LocalSyncDataError(key, cause);
  }
}
