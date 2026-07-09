import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppConfig, ClassInfo, LessonsData } from '../types';
import { computeTeacherSnapshot } from '../utils/progression';
import { migrateLessonsData } from '../utils/dataUtils';
import { toast } from 'sonner';
import {
    clearPendingWork,
    getPendingWork,
    hasPendingWork,
    markClassDirty,
    markClassesListDirty,
    markClassSynced,
    markSettingsSynced,
    notifyPullApplied,
    readSettingsSyncMeta,
    readSyncMeta,
    subscribe,
    touchSettingsSyncMeta,
    writeSyncMeta,
} from '../utils/syncBus';
import { useAuth } from './AuthContext';
import { logger } from '../utils/logger';
import { SyncableSettings, extractSyncableSettings, mergeSyncableSettings } from '../utils/syncSettings';
import { effectiveSchedules } from '../utils/timetable';

export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'offline' | 'error';

interface SyncContextValue {
    syncStatus: SyncStatus;
    lastSyncAt: string | null;
    syncNow: () => void;
}

const SyncContext = createContext<SyncContextValue>({ syncStatus: 'idle', lastSyncAt: null, syncNow: () => {} });

const PUSH_DEBOUNCE_MS = 20_000;
/** budget par requête de push — marge confortable sous la limite serveur (~950 Ko) */
const MAX_PUSH_BYTES = 700_000;

const readLocalClasses = (): ClassInfo[] => {
    try {
        return JSON.parse(localStorage.getItem('classManager_v1') || '[]') as ClassInfo[];
    } catch {
        return [];
    }
};

const readLocalLessons = (classId: string): LessonsData => {
    try {
        const raw = localStorage.getItem(`classData_v1_${classId}`);
        const parsed = raw ? JSON.parse(raw) : [];
        const lessons = Array.isArray(parsed) ? parsed : (parsed.lessonsData ?? []);
        return migrateLessonsData(lessons);
    } catch {
        return [];
    }
};

const readLocalConfig = (): Partial<AppConfig> => {
    try {
        const raw = localStorage.getItem('appConfig_v1');
        return raw ? (JSON.parse(raw) as Partial<AppConfig>) : {};
    } catch {
        return {};
    }
};

interface RemoteLessonsBlob {
    lessonsData?: LessonsData;
    updatedAt?: string;
}

const fetchLessonsBlob = async (classId: string): Promise<RemoteLessonsBlob | null> => {
    try {
        const response = await fetch(`/api/sync?classId=${encodeURIComponent(classId)}`, {
            credentials: 'same-origin',
        });
        return response.ok ? ((await response.json()) as RemoteLessonsBlob) : null;
    } catch (error) {
        logger.error('Pull d\'une classe impossible', error);
        return null;
    }
};

/**
 * Conflit multi-appareils : la version perdante (locale ou cloud) est
 * archivée avant écrasement — aucune donnée n'est jamais détruite en silence.
 * Une seule copie par classe (la plus récente), récupérable via
 * `classDataConflict_v1_{classId}`.
 */
const backupConflictVersion = (classId: string, lessonsData: unknown, source: 'local' | 'cloud'): void => {
    try {
        localStorage.setItem(
            `classDataConflict_v1_${classId}`,
            JSON.stringify({ savedAt: new Date().toISOString(), source, lessonsData })
        );
    } catch {
        // stockage plein : on privilégie les données vivantes
    }
};

interface ServerClassesBlob {
    classes: ClassInfo[];
    schedules: AppConfig['schedules'];
    timetable: AppConfig['timetable'];
    settings?: SyncableSettings;
    settingsUpdatedAt?: string;
    classMeta: Record<string, { updatedAt: string }>;
    updatedAt: string;
}

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, status: authStatus } = useAuth();
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
    const debounceRef = useRef<number | null>(null);
    const pushingRef = useRef(false);
    const userRef = useRef(user);
    userRef.current = user;
    // dernière cause d'erreur notifiée : un toast par cause, pas par tentative
    const lastErrorKeyRef = useRef<string | null>(null);

    const notifySyncError = useCallback((status: number, message?: string) => {
        const key = String(status);
        if (lastErrorKeyRef.current === key) return;
        lastErrorKeyRef.current = key;
        if (status === 401) {
            toast.error('Session expirée : reconnectez-vous pour reprendre la synchronisation.', { duration: 10_000 });
        } else if (status === 413) {
            toast.error(message ?? 'Un cahier dépasse la taille maximale de synchronisation (~950 Ko).', { duration: 10_000 });
        } else {
            toast.error(
                message ? `Synchronisation impossible : ${message}` : 'Synchronisation impossible (erreur serveur). Nouvel essai automatique dans une minute.',
                { duration: 8_000 }
            );
        }
    }, []);

    const push = useCallback(async (options?: { keepalive?: boolean }) => {
        const currentUser = userRef.current;
        if (!currentUser || pushingRef.current || !hasPendingWork()) return;

        pushingRef.current = true;
        setSyncStatus('syncing');
        const work = getPendingWork();

        try {
            const classes = readLocalClasses();
            const config = readLocalConfig();
            // schedules toujours re-dérivés de la grille : l'instantané poussé au
            // cron reflète la règle de fusion des créneaux consécutifs, même si
            // le localStorage porte encore d'anciens schedules non normalisés.
            const schedules = effectiveSchedules(config);
            const syncMeta = readSyncMeta();
            const now = new Date().toISOString();
            const settingsMeta = readSettingsSyncMeta();
            const settingsUpdatedAt = settingsMeta.localUpdatedAt ?? now;

            // une seule lecture/migration par classe et par push : le corps du
            // push ET l'instantané réutilisent le même résultat
            const lessonsCache = new Map<string, LessonsData>();
            const readLessonsCached = (classId: string): LessonsData => {
                let data = lessonsCache.get(classId);
                if (!data) {
                    data = readLocalLessons(classId);
                    lessonsCache.set(classId, data);
                }
                return data;
            };

            const entries = work.dirtyClassIds
                .filter(id => classes.some(c => c.id === id))
                .map(id => {
                    const lessonsData = readLessonsCached(id);
                    return {
                        classId: id,
                        lessonsData,
                        updatedAt: syncMeta[id]?.localUpdatedAt ?? now,
                        bytes: JSON.stringify(lessonsData).length,
                    };
                });

            /*
             * DÉCOUPAGE EN LOTS : le serveur refuse les corps > ~950 Ko (413).
             * Un push monolithique avec plusieurs gros cahiers (programmes
             * officiels) échouait alors À CHAQUE tentative — c'est la cause
             * du badge « Erreur de synchro » permanent. Chaque lot reste sous
             * ~700 Ko ; un cahier volumineux part seul dans son propre lot.
             */
            const batches: (typeof entries)[] = [];
            let current: typeof entries = [];
            let currentBytes = 0;
            for (const entry of entries) {
                if (current.length > 0 && currentBytes + entry.bytes > MAX_PUSH_BYTES) {
                    batches.push(current);
                    current = [];
                    currentBytes = 0;
                }
                current.push(entry);
                currentBytes += entry.bytes;
            }
            if (current.length > 0) batches.push(current);
            if (batches.length === 0) batches.push([]); // métadonnées seules (liste/settings)

            const snapshot = computeTeacherSnapshot(
                currentUser,
                classes,
                schedules,
                config.notificationSettings,
                readLessonsCached,
                config.absences
            );

            const pushedIds: string[] = [];
            let serverTime: string | null = null;
            let pushedSettingsAt: string | null = null;
            let failure: { status: number; message?: string; firstBatch: boolean } | null = null;

            for (let i = 0; i < batches.length; i++) {
                const isFirst = i === 0;
                const includeSettings = isFirst && work.classesListDirty;
                const response = await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    // keepalive : la requête survit à la fermeture de la page (flush
                    // pagehide). Limite ~64 Ko : au-delà le fetch rejette et le
                    // travail en attente sera resynchronisé au prochain démarrage.
                    keepalive: options?.keepalive === true,
                    body: JSON.stringify({
                        classes,
                        schedules,
                        timetable: config.timetable ?? [],
                        // métadonnées portées par le premier lot uniquement
                        settings: includeSettings ? extractSyncableSettings(config) : undefined,
                        settingsUpdatedAt: includeSettings ? settingsUpdatedAt : undefined,
                        deletedClassIds: isFirst ? work.deletedClassIds : [],
                        lessons: batches[i].map(({ classId, lessonsData, updatedAt }) => ({ classId, lessonsData, updatedAt })),
                        snapshot: isFirst ? snapshot : undefined,
                    }),
                });

                if (!response.ok) {
                    let message: string | undefined;
                    try {
                        message = ((await response.json()) as { error?: string }).error;
                    } catch { /* corps non JSON */ }
                    failure = { status: response.status, message, firstBatch: isFirst };
                    break;
                }

                const data = (await response.json()) as { serverTime?: string };
                if (typeof data.serverTime === 'string') serverTime = data.serverTime;
                if (includeSettings) pushedSettingsAt = settingsUpdatedAt;
                for (const entry of batches[i]) {
                    pushedIds.push(entry.classId);
                    // point de synchro commun local/cloud (détection de conflit)
                    markClassSynced(entry.classId, entry.updatedAt);
                }
            }

            if (!failure) {
                if (pushedSettingsAt) markSettingsSynced(pushedSettingsAt);
                clearPendingWork(work);
                lastErrorKeyRef.current = null;
                setLastSyncAt(serverTime ?? new Date().toISOString());
                setSyncStatus(hasPendingWork() ? 'pending' : 'synced');
                return;
            }

            // échec partiel : ne nettoyer QUE ce qui est réellement parti
            if (!failure.firstBatch || pushedIds.length > 0) {
                const pushedVersions: Record<string, number> = {};
                for (const id of pushedIds) {
                    const version = work.dirtyClassVersions[id];
                    if (version !== undefined) pushedVersions[id] = version;
                }
                clearPendingWork({
                    ...work,
                    dirtyClassIds: pushedIds,
                    dirtyClassVersions: pushedVersions,
                    // liste/settings/suppressions portées par le 1er lot
                    listVersion: failure.firstBatch ? 0 : work.listVersion,
                    deletedClassIds: failure.firstBatch ? [] : work.deletedClassIds,
                });
            }
            setSyncStatus('error');
            notifySyncError(failure.status, failure.message);
            // 5xx / 429 : panne passagère → nouvel essai automatique dans 1 min.
            // 401 (reconnexion) et 413 (cahier trop gros) : inutile d'insister.
            if (failure.status >= 500 || failure.status === 429) {
                if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
                debounceRef.current = window.setTimeout(() => {
                    debounceRef.current = null;
                    void push();
                }, 60_000);
            }
        } catch (error) {
            logger.error('Sync push failed (offline?)', error);
            setSyncStatus('offline');
        } finally {
            pushingRef.current = false;
        }
    }, []);

    const schedulePush = useCallback(
        (delayMs: number = PUSH_DEBOUNCE_MS) => {
            if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
            debounceRef.current = window.setTimeout(() => {
                debounceRef.current = null;
                void push();
            }, delayMs);
        },
        [push]
    );

    const syncNow = useCallback(() => {
        if (debounceRef.current !== null) {
            window.clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        void push();
    }, [push]);

    // ── Pull initial après authentification ────────────────────────────────
    useEffect(() => {
        if (authStatus !== 'authenticated' || !user) return;
        let cancelled = false;

        (async () => {
            setSyncStatus('syncing');
            try {
                const response = await fetch('/api/sync', { credentials: 'same-origin' });
                if (!response.ok) {
                    if (!cancelled) {
                        setSyncStatus('error');
                        notifySyncError(response.status);
                    }
                    return;
                }
                const server = (await response.json()) as ServerClassesBlob;
                if (cancelled) return;

                const localClasses = readLocalClasses();
                const syncMeta = readSyncMeta();

                if ((server.classes?.length ?? 0) === 0 && localClasses.length > 0) {
                    // Première association : des cahiers locaux existent mais le
                    // cloud est vide. Proposition NON bloquante (toast avec action)
                    // — l'app conseille, le prof décide, rien n'est interrompu.
                    setSyncStatus('synced');
                    toast.info(
                        `${localClasses.length} cahier(s) présents sur cet appareil ne sont pas encore associés à votre compte.`,
                        {
                            duration: 15_000,
                            action: {
                                label: 'Associer',
                                onClick: () => {
                                    localClasses.forEach(c => markClassDirty(c.id));
                                    markClassesListDirty();
                                    schedulePush(500);
                                },
                            },
                        }
                    );
                    return;
                }

                const mergedClasses = [...localClasses];
                let localChanged = false;
                const conflictNames: string[] = [];

                // ── Phase 1 : décisions (synchrone, LWW + détection de conflit) ──
                interface PullDecision {
                    serverClass: ClassInfo;
                    serverUpdatedAt?: string;
                    localIndex: number;
                    action: 'apply' | 'requeue' | 'none';
                    conflict: boolean;
                }
                const decisions: PullDecision[] = (server.classes ?? []).map(serverClass => {
                    const serverUpdatedAt = server.classMeta?.[serverClass.id]?.updatedAt;
                    const meta = syncMeta[serverClass.id];
                    const localUpdatedAt = meta?.localUpdatedAt;
                    const lastSyncedAt = meta?.lastSyncedAt;
                    const localIndex = mergedClasses.findIndex(c => c.id === serverClass.id);

                    const serverIsNewer =
                        !!serverUpdatedAt && (!localUpdatedAt || serverUpdatedAt > localUpdatedAt);

                    // vrai conflit : local ET cloud ont chacun avancé depuis leur
                    // dernier point commun (édition sur deux appareils hors-ligne)
                    const conflict =
                        localIndex !== -1 &&
                        !!serverUpdatedAt && !!localUpdatedAt && !!lastSyncedAt &&
                        serverUpdatedAt > lastSyncedAt && localUpdatedAt > lastSyncedAt &&
                        serverUpdatedAt !== localUpdatedAt;

                    const action: PullDecision['action'] =
                        localIndex === -1 || serverIsNewer
                            ? 'apply'
                            : localUpdatedAt && (!serverUpdatedAt || localUpdatedAt > serverUpdatedAt)
                                ? 'requeue' // modifications locales jamais poussées : on les remet en file
                                : 'none';

                    return { serverClass, serverUpdatedAt, localIndex, action, conflict };
                });

                // ── Phase 2 : exécution en parallèle (un aller-retour par classe) ──
                await Promise.all(decisions.map(async ({ serverClass, serverUpdatedAt, localIndex, action, conflict }) => {
                    if (action === 'apply') {
                        // le cloud va remplacer le local : archiver la version locale perdante
                        if (conflict) {
                            backupConflictVersion(serverClass.id, readLocalLessons(serverClass.id), 'local');
                            conflictNames.push(serverClass.name);
                        }
                        const blob = await fetchLessonsBlob(serverClass.id);
                        if (blob) {
                            localStorage.setItem(
                                `classData_v1_${serverClass.id}`,
                                JSON.stringify(blob.lessonsData ?? [])
                            );
                            const syncedAt = blob.updatedAt ?? serverUpdatedAt ?? new Date().toISOString();
                            syncMeta[serverClass.id] = { localUpdatedAt: syncedAt, lastSyncedAt: syncedAt };
                            localChanged = true;
                        }
                        if (localIndex === -1) {
                            mergedClasses.push(serverClass);
                        } else {
                            mergedClasses[localIndex] = { ...mergedClasses[localIndex], ...serverClass };
                        }
                    } else if (action === 'requeue') {
                        // le local va écraser le cloud au prochain push : archiver la version cloud perdante
                        if (conflict) {
                            const blob = await fetchLessonsBlob(serverClass.id);
                            if (blob) backupConflictVersion(serverClass.id, blob.lessonsData ?? [], 'cloud');
                            conflictNames.push(serverClass.name);
                        }
                        markClassDirty(serverClass.id);
                    }
                }));

                if (conflictNames.length > 0) {
                    toast.warning(
                        conflictNames.length === 1
                            ? `« ${conflictNames[0]} » a été modifié sur un autre appareil. La version la plus récente a été conservée ; l'autre est archivée sur cet appareil.`
                            : `${conflictNames.length} cahiers modifiés sur un autre appareil (${conflictNames.slice(0, 3).join(', ')}${conflictNames.length > 3 ? '…' : ''}). Les versions les plus récentes ont été conservées ; les autres sont archivées.`,
                        { duration: 10000 }
                    );
                }

                // classes locales inconnues du serveur → à pousser
                for (const localClass of localClasses) {
                    if (!(server.classes ?? []).some(c => c.id === localClass.id)) {
                        markClassDirty(localClass.id);
                        markClassesListDirty();
                    }
                }

                /*
                 * Réglages du professeur (emploi du temps, devoirs, absences,
                 * matières, préférences…) : sur un APPAREIL NEUF (aucun réglage
                 * local), on restaure l'ensemble depuis le cloud. Sinon on
                 * respecte les réglages locaux (l'état push reste par appareil).
                 */
                const config = readLocalConfig();
                const settings: SyncableSettings | undefined =
                    server.settings ??
                    (server.schedules || server.timetable
                        ? ({ schedules: server.schedules, timetable: server.timetable } as SyncableSettings)
                        : undefined);
                const settingsMeta = readSettingsSyncMeta();
                const remoteSettingsAt = server.settingsUpdatedAt || server.updatedAt || '';
                const localHasSettings =
                    (config.schedules?.length ?? 0) > 0 ||
                    (config.timetable?.length ?? 0) > 0 ||
                    !!config.establishmentName ||
                    Object.keys(config.assessmentDates ?? {}).length > 0;
                const shouldApplyRemoteSettings =
                    !!settings &&
                    (
                        (!localHasSettings && !settingsMeta.localUpdatedAt) ||
                        (!!remoteSettingsAt && !!settingsMeta.localUpdatedAt && remoteSettingsAt > settingsMeta.localUpdatedAt)
                    );
                if (settings && shouldApplyRemoteSettings) {
                    try {
                        localStorage.setItem('appConfig_v1', JSON.stringify(mergeSyncableSettings(config, settings)));
                        if (remoteSettingsAt) markSettingsSynced(remoteSettingsAt);
                        localChanged = true;
                    } catch { /* stockage plein */ }
                } else if (settings && localHasSettings && !settingsMeta.localUpdatedAt && remoteSettingsAt) {
                    touchSettingsSyncMeta();
                    markClassesListDirty();
                }

                if (localChanged) {
                    localStorage.setItem('classManager_v1', JSON.stringify(mergedClasses));
                    writeSyncMeta(syncMeta);
                    notifyPullApplied();
                }

                setLastSyncAt(server.updatedAt || null);
                if (hasPendingWork()) {
                    setSyncStatus('pending');
                    schedulePush(500);
                } else {
                    setSyncStatus('synced');
                }
            } catch (error) {
                logger.error('Sync pull failed (offline?)', error);
                if (!cancelled) setSyncStatus('offline');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [authStatus, user, schedulePush]);

    // ── Déclencheurs : événements dirty, retour en ligne, fermeture ─────────
    useEffect(() => {
        if (authStatus !== 'authenticated') return;

        const unsubscribeDirty = subscribe('dirty', () => {
            setSyncStatus(current => (current === 'syncing' ? current : 'pending'));
            schedulePush();
        });

        const handleOnline = () => {
            if (hasPendingWork()) schedulePush(1_000);
        };

        const flush = () => {
            if (!hasPendingWork() || document.visibilityState !== 'hidden') return;
            // best-effort : keepalive est limité à ~64 Ko, un gros cahier sera
            // resynchronisé au prochain démarrage grâce à syncMeta_v1 (LWW).
            void push({ keepalive: true });
        };

        window.addEventListener('online', handleOnline);
        document.addEventListener('visibilitychange', flush);
        window.addEventListener('pagehide', flush);
        return () => {
            unsubscribeDirty();
            window.removeEventListener('online', handleOnline);
            document.removeEventListener('visibilitychange', flush);
            window.removeEventListener('pagehide', flush);
            if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
        };
    }, [authStatus, schedulePush, push]);

    const value = useMemo(
        () => ({ syncStatus, lastSyncAt, syncNow }),
        [syncStatus, lastSyncAt, syncNow]
    );

    return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export const useSync = (): SyncContextValue => useContext(SyncContext);
