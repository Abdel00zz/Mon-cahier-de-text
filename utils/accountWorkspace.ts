/** Account-local snapshots. Never include auth cookies/tokens or another snapshot. */
export const WORKSPACE_SCOPE_KEY = 'workspaceScope_v1';
export const WORKSPACE_SNAPSHOT_PREFIX = 'workspaceSnapshot_v1_';
export interface WorkspaceScope { owner: string | null; revision: string }
interface WorkspaceSnapshot { version: 1; owner: string | null; savedAt: string; entries: Record<string, string> }
type WorkspaceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
const pendingWriters = new Set<() => boolean>();

/** Flush editor work before snapshotting, not after the old component unmounts. */
export const registerWorkspaceWriter = (flush: () => boolean): (() => void) => {
  pendingWriters.add(flush);
  return () => { pendingWriters.delete(flush); };
};

/** Capture once per component lifetime; reject writes from a previous workspace. */
export const captureWorkspaceLease = (storage: WorkspaceStorage = localStorage): (() => boolean) => {
  const marker = storage.getItem(WORKSPACE_SCOPE_KEY);
  return () => {
    try { return storage.getItem(WORKSPACE_SCOPE_KEY) === marker; } catch { return false; }
  };
};

const EXACT_KEYS = new Set([
  'appConfig_v1', 'classManager_v1', 'app_first_launch_v1', 'syncPending_v1',
  'syncMeta_v1', 'settingsSyncMeta_v1', 'archives_v1_index', 'onboarding_lang_v1',
]);
const PREFIXES = [
  'classData_v1_', 'classDataConflict_v1_', 'editJournal_v1_', 'printMeta_v1_',
  'archive_', 'assessmentSnooze_', 'latenessSnooze_', 'editor_actions_ignored_v1_',
];
export const isWorkspaceKey = (key: string): boolean => EXACT_KEYS.has(key) || PREFIXES.some(prefix => key.startsWith(prefix));
const validOwner = (owner: unknown): owner is string => typeof owner === 'string' && /^\d{8,15}$/.test(owner);

export class WorkspaceSwitchError extends Error {
  constructor() { super('Impossible de changer de compte sans préserver les données locales. Libérez de l’espace puis réessayez.'); }
}

export const readWorkspaceScope = (storage: WorkspaceStorage = localStorage): WorkspaceScope | null => {
  try {
    const raw = storage.getItem(WORKSPACE_SCOPE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return value && (value.owner === null || validOwner(value.owner)) && typeof value.revision === 'string'
      ? value : null;
  } catch { return null; }
};
export const workspaceIsCurrent = (scope: WorkspaceScope | null, storage: WorkspaceStorage = localStorage): boolean => {
  const current = readWorkspaceScope(storage);
  return Boolean(scope && scope.owner && current?.owner === scope.owner && current.revision === scope.revision);
};

const snapshotEntries = (storage: WorkspaceStorage): Record<string, string> => {
  const entries: Record<string, string> = {};
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key && isWorkspaceKey(key)) {
      const value = storage.getItem(key);
      if (value !== null) entries[key] = value;
    }
  }
  return entries;
};
const replaceEntries = (storage: WorkspaceStorage, entries: Record<string, string>): void => {
  for (const key of Object.keys(snapshotEntries(storage))) storage.removeItem(key);
  for (const [key, value] of Object.entries(entries)) storage.setItem(key, value);
};
const parseSnapshot = (raw: string | null, owner: string): Record<string, string> => {
  if (!raw) return {};
  const value = JSON.parse(raw) as WorkspaceSnapshot;
  if (value?.version !== 1 || value.owner !== owner || !value.entries || typeof value.entries !== 'object' || Array.isArray(value.entries)) throw new WorkspaceSwitchError();
  for (const [key, entry] of Object.entries(value.entries)) {
    if (!isWorkspaceKey(key) || typeof entry !== 'string') throw new WorkspaceSwitchError();
  }
  return value.entries;
};

/**
 * Save BEFORE clearing; failure blocks authentication instead of discarding work.
 * An ownerless legacy workspace is quarantined, never assigned to a new account.
 * A trusted legacy owner comes only from the previous cached session, not a login input.
 */
export const switchAccountWorkspace = (
  owner: string | null,
  options: { storage?: WorkspaceStorage; legacyOwner?: string; revision?: string } = {},
): WorkspaceScope => {
  const storage = options.storage ?? localStorage;
  if (owner !== null && !validOwner(owner)) throw new WorkspaceSwitchError();
  for (const flush of pendingWriters) {
    try { if (!flush()) throw new WorkspaceSwitchError(); } catch { throw new WorkspaceSwitchError(); }
  }
  const oldScope = readWorkspaceScope(storage);
  const previousOwner = oldScope ? oldScope.owner : (validOwner(options.legacyOwner) ? options.legacyOwner : null);
  const revision = options.revision ?? crypto.randomUUID();
  if (owner !== null && previousOwner === owner) {
    const scope = oldScope ?? { owner, revision };
    storage.setItem(WORKSPACE_SCOPE_KEY, JSON.stringify(scope));
    return scope;
  }
  const previous = snapshotEntries(storage);
  const previousMarker = storage.getItem(WORKSPACE_SCOPE_KEY);
  let switching = false;
  try {
    // Validate the destination before making any changes to the active workspace.
    const target = owner === null ? {} : parseSnapshot(storage.getItem(WORKSPACE_SNAPSHOT_PREFIX + owner), owner);
    if (Object.keys(previous).length > 0) {
      const snapshot: WorkspaceSnapshot = { version: 1, owner: previousOwner, savedAt: new Date().toISOString(), entries: previous };
      storage.setItem(WORKSPACE_SNAPSHOT_PREFIX + (previousOwner ?? `unassigned_${revision}`), JSON.stringify(snapshot));
    }
    // Fence pending requests before replacing the active keys.
    storage.setItem(WORKSPACE_SCOPE_KEY, JSON.stringify({ owner: null, revision }));
    switching = true;
    replaceEntries(storage, target);
    // Language is safe to reuse only for a new, empty space; never overwrite a restored profile.
    if (!target.appConfig_v1) {
      let locale: unknown;
      try { locale = JSON.parse(previous.appConfig_v1 ?? '{}').applicationLocale; } catch { /* damaged legacy config remains in its snapshot */ }
      if (locale === 'fr' || locale === 'ar' || locale === 'en') storage.setItem('appConfig_v1', JSON.stringify({ applicationLocale: locale }));
    }
    const scope = { owner, revision };
    storage.setItem(WORKSPACE_SCOPE_KEY, JSON.stringify(scope));
    // The live workspace is now authoritative; retaining a duplicate wastes quota.
    if (owner !== null) storage.removeItem(WORKSPACE_SNAPSHOT_PREFIX + owner);
    return scope;
  } catch {
    if (switching) {
      try {
        replaceEntries(storage, previous);
        if (previousMarker === null) storage.removeItem(WORKSPACE_SCOPE_KEY);
        else storage.setItem(WORKSPACE_SCOPE_KEY, previousMarker);
      } catch {
        // The verified outgoing snapshot is retained for recovery; the anonymous fence remains.
      }
    }
    throw new WorkspaceSwitchError();
  }
};
