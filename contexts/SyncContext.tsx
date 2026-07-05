import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppConfig, ClassInfo, LessonsData } from '../types';
import { computeTeacherSnapshot } from '../utils/progression';
import { migrateLessonsData } from '../utils/dataUtils';
import {
    clearPendingWork,
    getPendingWork,
    hasPendingWork,
    markClassDirty,
    markClassesListDirty,
    notifyPullApplied,
    readSyncMeta,
    subscribe,
    writeSyncMeta,
} from '../utils/syncBus';
import { useAuth } from './AuthContext';
import { logger } from '../utils/logger';
import { SyncableSettings, extractSyncableSettings, mergeSyncableSettings } from '../utils/syncSettings';

export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'offline' | 'error';

interface SyncContextValue {
    syncStatus: SyncStatus;
    lastSyncAt: string | null;
    syncNow: () => void;
}

const SyncContext = createContext<SyncContextValue>({ syncStatus: 'idle', lastSyncAt: null, syncNow: () => {} });

const PUSH_DEBOUNCE_MS = 20_000;

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

interface ServerClassesBlob {
    classes: ClassInfo[];
    schedules: AppConfig['schedules'];
    timetable: AppConfig['timetable'];
    settings?: SyncableSettings;
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

    const push = useCallback(async () => {
        const currentUser = userRef.current;
        if (!currentUser || pushingRef.current || !hasPendingWork()) return;

        pushingRef.current = true;
        setSyncStatus('syncing');
        const work = getPendingWork();

        try {
            const classes = readLocalClasses();
            const config = readLocalConfig();
            const syncMeta = readSyncMeta();
            const now = new Date().toISOString();

            const lessons = work.dirtyClassIds
                .filter(id => classes.some(c => c.id === id))
                .map(id => ({
                    classId: id,
                    lessonsData: readLocalLessons(id),
                    updatedAt: syncMeta[id]?.localUpdatedAt ?? now,
                }));

            const snapshot = computeTeacherSnapshot(
                currentUser,
                classes,
                config.schedules,
                config.notificationSettings,
                readLocalLessons,
                config.absences
            );

            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    classes,
                    schedules: config.schedules ?? [],
                    timetable: config.timetable ?? [],
                    settings: extractSyncableSettings(config),
                    deletedClassIds: work.deletedClassIds,
                    lessons,
                    snapshot,
                }),
            });

            if (!response.ok) {
                setSyncStatus('error');
                return;
            }

            const data = await response.json();
            clearPendingWork(work);
            setLastSyncAt(typeof data.serverTime === 'string' ? data.serverTime : new Date().toISOString());
            setSyncStatus(hasPendingWork() ? 'pending' : 'synced');
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
                    if (!cancelled) setSyncStatus('error');
                    return;
                }
                const server = (await response.json()) as ServerClassesBlob;
                if (cancelled) return;

                const localClasses = readLocalClasses();
                const syncMeta = readSyncMeta();

                if ((server.classes?.length ?? 0) === 0 && localClasses.length > 0) {
                    // Première association : des cahiers locaux existent mais le cloud est vide.
                    const associate = window.confirm(
                        `Associer les ${localClasses.length} cahier(s) présents sur cet appareil à votre compte ?\n` +
                            'Ils seront synchronisés en ligne et suivis dans votre progression.'
                    );
                    if (associate) {
                        localClasses.forEach(c => markClassDirty(c.id));
                        markClassesListDirty();
                        schedulePush(500);
                    } else {
                        setSyncStatus('synced');
                    }
                    return;
                }

                const mergedClasses = [...localClasses];
                let localChanged = false;

                for (const serverClass of server.classes ?? []) {
                    const serverUpdatedAt = server.classMeta?.[serverClass.id]?.updatedAt;
                    const localUpdatedAt = syncMeta[serverClass.id]?.localUpdatedAt;
                    const localIndex = mergedClasses.findIndex(c => c.id === serverClass.id);

                    const serverIsNewer =
                        !!serverUpdatedAt && (!localUpdatedAt || serverUpdatedAt > localUpdatedAt);

                    if (localIndex === -1 || serverIsNewer) {
                        try {
                            const blobResponse = await fetch(
                                `/api/sync?classId=${encodeURIComponent(serverClass.id)}`,
                                { credentials: 'same-origin' }
                            );
                            if (blobResponse.ok) {
                                const blob = await blobResponse.json();
                                localStorage.setItem(
                                    `classData_v1_${serverClass.id}`,
                                    JSON.stringify(blob.lessonsData ?? [])
                                );
                                syncMeta[serverClass.id] = {
                                    localUpdatedAt: blob.updatedAt ?? serverUpdatedAt ?? new Date().toISOString(),
                                };
                                localChanged = true;
                            }
                        } catch (error) {
                            logger.error('Pull d\'une classe impossible', error);
                        }
                        if (localIndex === -1) {
                            mergedClasses.push(serverClass);
                        } else {
                            mergedClasses[localIndex] = { ...mergedClasses[localIndex], ...serverClass };
                        }
                    } else if (localUpdatedAt && (!serverUpdatedAt || localUpdatedAt > serverUpdatedAt)) {
                        // modifications locales jamais poussées (fermeture avant flush) : on les remet en file
                        markClassDirty(serverClass.id);
                    }
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
                const localHasSettings =
                    (config.schedules?.length ?? 0) > 0 ||
                    (config.timetable?.length ?? 0) > 0 ||
                    !!config.establishmentName ||
                    !!config.assessmentDates;
                if (settings && !localHasSettings) {
                    try {
                        localStorage.setItem('appConfig_v1', JSON.stringify(mergeSyncableSettings(config, settings)));
                        localChanged = true;
                    } catch { /* stockage plein */ }
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
            void push();
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
