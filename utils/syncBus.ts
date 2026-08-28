// Bus de synchronisation : découple les producteurs de modifications
// (Editor, useClassManager, ConfigModal) du consommateur (useCloudSync).
// État module-level : les marqueurs "dirty" survivent aux démontages de composants.

export type SyncEvent = 'dirty' | 'pull-applied' | 'config-changed' | 'classes-changed' | 'notifications-changed';

type SyncListener = (source?: symbol) => void;

const listeners = new Map<SyncEvent, Set<SyncListener>>();
const SYNC_PENDING_KEY = 'syncPending_v1';
const SYNC_META_KEY = 'syncMeta_v1';
const SETTINGS_SYNC_META_KEY = 'settingsSyncMeta_v1';

interface PersistedPendingState {
    dirtySeq: number;
    dirtyClassVersions: Record<string, number>;
    /** Format historique, conservé pour migrer les installations existantes. */
    deletedClassIds: string[];
    /** Une suppression porte son horodatage pour être comparable au cloud. */
    deletedClasses?: Record<string, string>;
    classesListVersion: number;
    classesListSyncedVersion: number;
}

interface SettingsSyncMeta {
    localUpdatedAt?: string;
    lastSyncedAt?: string;
}

const readPendingState = (): PersistedPendingState | null => {
    try {
        const raw = localStorage.getItem(SYNC_PENDING_KEY);
        return raw ? (JSON.parse(raw) as PersistedPendingState) : null;
    } catch {
        return null;
    }
};

const persistedPending = readPendingState();

// version par classe plutôt qu'un simple Set : une modification arrivée
// pendant un push en vol ne doit pas être effacée par le clear de ce push
// (même principe que le compteur de version de la liste, ci-dessous).
const dirtyClassVersions = new Map<string, number>(Object.entries(persistedPending?.dirtyClassVersions ?? {}));
let dirtySeq = persistedPending?.dirtySeq ?? 0;
const deletedClasses = new Map<string, string>([
    ...Object.entries(persistedPending?.deletedClasses ?? {}),
    // Les suppressions en attente créées avant cette version restent valides.
    ...(persistedPending?.deletedClassIds ?? [])
        .filter(id => !(persistedPending?.deletedClasses ?? {})[id])
        .map(id => [id, new Date(0).toISOString()] as [string, string]),
]);
// version plutôt que booléen : une modification arrivée pendant un push en vol
// ne doit pas être effacée par le clear de ce push.
let classesListVersion = persistedPending?.classesListVersion ?? 0;
let classesListSyncedVersion = persistedPending?.classesListSyncedVersion ?? 0;

const persistPendingState = (): void => {
    try {
        localStorage.setItem(SYNC_PENDING_KEY, JSON.stringify({
            dirtySeq,
            dirtyClassVersions: Object.fromEntries(dirtyClassVersions),
            deletedClassIds: Array.from(deletedClasses.keys()),
            deletedClasses: Object.fromEntries(deletedClasses),
            classesListVersion,
            classesListSyncedVersion,
        } satisfies PersistedPendingState));
    } catch {
        // stockage indisponible : la file reste en mémoire pour cette session
    }
};

export interface SyncMeta {
    [classId: string]: {
        localUpdatedAt: string;
        /**
         * Dernier horodatage où local et cloud étaient identiques (push réussi
         * ou pull appliqué). Sert à détecter un vrai conflit multi-appareils :
         * local ET serveur ont tous deux avancé depuis ce point commun.
         */
        lastSyncedAt?: string;
    };
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
    meta[classId] = { ...meta[classId], localUpdatedAt: new Date().toISOString() };
    writeSyncMeta(meta);
};

/** Marque local et cloud comme identiques à cet horodatage (push réussi / pull appliqué). */
export const markClassSynced = (classId: string, syncedAt: string): void => {
    const meta = readSyncMeta();
    meta[classId] = { localUpdatedAt: meta[classId]?.localUpdatedAt ?? syncedAt, lastSyncedAt: syncedAt };
    writeSyncMeta(meta);
};

export const readSettingsSyncMeta = (): SettingsSyncMeta => {
    try {
        const raw = localStorage.getItem(SETTINGS_SYNC_META_KEY);
        return raw ? (JSON.parse(raw) as SettingsSyncMeta) : {};
    } catch {
        return {};
    }
};

export const touchSettingsSyncMeta = (): string => {
    const updatedAt = new Date().toISOString();
    try {
        const current = readSettingsSyncMeta();
        localStorage.setItem(SETTINGS_SYNC_META_KEY, JSON.stringify({ ...current, localUpdatedAt: updatedAt }));
    } catch {
        // stockage indisponible : le serveur utilisera son heure si besoin
    }
    return updatedAt;
};

export const markSettingsSynced = (syncedAt: string): void => {
    try {
        const current = readSettingsSyncMeta();
        localStorage.setItem(SETTINGS_SYNC_META_KEY, JSON.stringify({
            localUpdatedAt: current.localUpdatedAt ?? syncedAt,
            lastSyncedAt: syncedAt,
        }));
    } catch {
        // non critique
    }
};

const removeClassSyncMeta = (classId: string): void => {
    const meta = readSyncMeta();
    if (meta[classId]) {
        delete meta[classId];
        writeSyncMeta(meta);
    }
};

const emit = (event: SyncEvent, source?: symbol): void => {
    listeners.get(event)?.forEach(listener => listener(source));
};

export const subscribe = (event: SyncEvent, listener: SyncListener): (() => void) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(listener);
    return () => listeners.get(event)?.delete(listener);
};

export const markClassDirty = (classId: string): void => {
    dirtyClassVersions.set(classId, ++dirtySeq);
    deletedClasses.delete(classId);
    persistPendingState();
    emit('dirty');
};

export const markClassesListDirty = (): void => {
    classesListVersion += 1;
    persistPendingState();
    emit('dirty');
};

export const markClassDeleted = (classId: string): void => {
    deletedClasses.set(classId, new Date().toISOString());
    dirtyClassVersions.delete(classId);
    removeClassSyncMeta(classId);
    classesListVersion += 1;
    persistPendingState();
    emit('dirty');
};

/** Émis après qu'un pull cloud a réécrit le localStorage : les hooks rechargent leur état. */
export const notifyPullApplied = (): void => {
    emit('pull-applied');
};

/** Informe les autres instances de useClassManager d'une mutation locale. */
export const notifyClassesChanged = (): void => {
    emit('classes-changed');
};

/** Synchronise les instances locales de configuration entre les vues. */
export const notifyConfigChanged = (source?: symbol): void => {
    emit('config-changed', source);
};

/** Rafraîchit les projections de notifications après une mutation locale
 *  (ignoré/restauré, métadonnée d'impression, etc.) sans coupler l'UI au stockage. */
export const notifyNotificationsChanged = (): void => {
    emit('notifications-changed');
};

/** Purge la file mémoire avant qu'un autre compte ne soit connecté. */
export const resetSyncState = (): void => {
    dirtyClassVersions.clear();
    deletedClasses.clear();
    dirtySeq = 0;
    classesListVersion = 0;
    classesListSyncedVersion = 0;
    try {
        localStorage.removeItem(SYNC_PENDING_KEY);
    } catch {
        // L'état mémoire est déjà purgé.
    }
};

export interface PendingWork {
    dirtyClassIds: string[];
    /** version capturée par classe : ne nettoyer que si inchangée depuis */
    dirtyClassVersions: Record<string, number>;
    deletedClassIds: string[];
    deletedClasses: Array<{ id: string; deletedAt: string }>;
    classesListDirty: boolean;
    listVersion: number;
}

export const getPendingWork = (): PendingWork => ({
    dirtyClassIds: Array.from(dirtyClassVersions.keys()),
    dirtyClassVersions: Object.fromEntries(dirtyClassVersions),
    deletedClassIds: Array.from(deletedClasses.keys()),
    deletedClasses: Array.from(deletedClasses, ([id, deletedAt]) => ({ id, deletedAt })),
    classesListDirty: classesListVersion > classesListSyncedVersion,
    listVersion: classesListVersion,
});

export const hasPendingWork = (): boolean =>
    classesListVersion > classesListSyncedVersion || dirtyClassVersions.size > 0 || deletedClasses.size > 0;

export const clearPendingWork = (work: PendingWork): void => {
    // une classe re-modifiée pendant le push (version avancée) reste sale
    for (const [id, version] of Object.entries(work.dirtyClassVersions)) {
        if (dirtyClassVersions.get(id) === version) dirtyClassVersions.delete(id);
    }
    work.deletedClasses.forEach(({ id, deletedAt }) => {
        // Une éventuelle suppression plus récente ne doit pas être acquittée
        // par la réponse d'un push plus ancien.
        if (deletedClasses.get(id) === deletedAt) deletedClasses.delete(id);
    });
    classesListSyncedVersion = Math.max(classesListSyncedVersion, work.listVersion);
    persistPendingState();
};
