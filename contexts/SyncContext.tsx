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
    notifyPullApplied,
    readSyncMeta,
    subscribe,
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

            const lessons = work.dirtyClassIds
                .filter(id => classes.some(c => c.id === id))
                .map(id => ({
                    classId: id,
                    lessonsData: readLessonsCached(id),
                    updatedAt: syncMeta[id]?.localUpdatedAt ?? now,
                }));

            const snapshot = computeTeacherSnapshot(
                currentUser,
                classes,
                schedules,
                config.notificationSettings,
                readLessonsCached,
                config.absences
            );

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
            // point de synchro commun local/cloud, base de la détection de conflit
            for (const entry of lessons) {
                markClassSynced(entry.classId, entry.updatedAt);
            }
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
