// Bus de synchronisation : découple les producteurs de modifications
// (Editor, useClassManager, ConfigModal) du consommateur (useCloudSync).
// État module-level : les marqueurs "dirty" survivent aux démontages de composants.

export type SyncEvent = 'dirty' | 'pull-applied';

const listeners = new Map<SyncEvent, Set<() => void>>();

const dirtyClassIds = new Set<string>();
const deletedClassIds = new Set<string>();
// version plutôt que booléen : une modification arrivée pendant un push en vol
// ne doit pas être effacée par le clear de ce push.
let classesListVersion = 0;
let classesListSyncedVersion = 0;

const SYNC_META_KEY = 'syncMeta_v1';

export interface SyncMeta {
    [classId: string]: { localUpdatedAt: string };
}

export const readSyncMeta = (): SyncMeta => {
    try {
        const raw = localStorage.getItem(SYNC_META_KEY);
        return raw ? (JSON.parse(raw) as SyncMeta) : {};
    } catch {
        return {};
    }
};

export const writeSyncMeta = (meta: SyncMeta): void => {
    try {
        localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
    } catch {
        // stockage plein : la synchro utilisera l'horodatage courant
    }
};

export const touchClassSyncMeta = (classId: string): void => {
    const meta = readSyncMeta();
    meta[classId] = { localUpdatedAt: new Date().toISOString() };
    writeSyncMeta(meta);
};

export const removeClassSyncMeta = (classId: string): void => {
    const meta = readSyncMeta();
    if (meta[classId]) {
        delete meta[classId];
        writeSyncMeta(meta);
    }
};

const emit = (event: SyncEvent): void => {
    listeners.get(event)?.forEach(listener => listener());
};

export const subscribe = (event: SyncEvent, listener: () => void): (() => void) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(listener);
    return () => listeners.get(event)?.delete(listener);
};

export const markClassDirty = (classId: string): void => {
    dirtyClassIds.add(classId);
    deletedClassIds.delete(classId);
    emit('dirty');
};

export const markClassesListDirty = (): void => {
    classesListVersion += 1;
    emit('dirty');
};

export const markClassDeleted = (classId: string): void => {
    deletedClassIds.add(classId);
    dirtyClassIds.delete(classId);
    removeClassSyncMeta(classId);
    classesListVersion += 1;
    emit('dirty');
};

/** Émis après qu'un pull cloud a réécrit le localStorage : les hooks rechargent leur état. */
export const notifyPullApplied = (): void => {
    emit('pull-applied');
};

export interface PendingWork {
    dirtyClassIds: string[];
    deletedClassIds: string[];
    classesListDirty: boolean;
    listVersion: number;
}

export const getPendingWork = (): PendingWork => ({
    dirtyClassIds: Array.from(dirtyClassIds),
    deletedClassIds: Array.from(deletedClassIds),
    classesListDirty: classesListVersion > classesListSyncedVersion,
    listVersion: classesListVersion,
});

export const hasPendingWork = (): boolean =>
    classesListVersion > classesListSyncedVersion || dirtyClassIds.size > 0 || deletedClassIds.size > 0;

export const clearPendingWork = (work: PendingWork): void => {
    work.dirtyClassIds.forEach(id => dirtyClassIds.delete(id));
    work.deletedClassIds.forEach(id => deletedClassIds.delete(id));
    classesListSyncedVersion = Math.max(classesListSyncedVersion, work.listVersion);
};
