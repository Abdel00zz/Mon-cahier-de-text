import { apiFetch } from '@/platform/nativeHttp';
import { accountOwner } from '../domain/auth/accountIdentity';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppConfig, ClassInfo, ContentDirection, LessonsData, TimetableClockPolicy } from '../types';
import { computeTeacherSnapshot } from '../domain/curriculum/progression';
import { teacherDeclaredSubjects, teacherDisplayName } from '../domain/classes/teacherIdentity';
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
} from '../infrastructure/sync/syncBus';
import { useAuth } from './AuthContext';
import { logger } from '../lib/logger';
import { SyncableSettings, extractSyncableSettings, mergeSyncableSettings } from '../infrastructure/sync/syncSettings';
import { effectiveSchedules, normalizeTimetableClock } from '../domain/calendar/timetable';
import { translateLocaleMessage } from '../i18n/messages';
import { isContentDirection } from '../domain/notebook/contentDirection';
import { readWorkspaceScope, workspaceIsCurrent } from '../infrastructure/storage/accountWorkspace';
import { bootstrapStore } from '../infrastructure/sync/bootstrapStore';
import { notifySyncProgress } from '../infrastructure/sync/syncBus';
import { measurements, MEASURES } from '../platform/performanceMarks';
import { withCurriculumSettings } from '../domain/classes/classCurriculumSettings';
import { assignClassColors } from '../domain/classes/classColors';
import { isForegroundOnline, startForegroundPolling } from '../platform/mobileScheduling';
import { requestSyncJson, requestSyncPush, retryDelayMs, syncJsonBytes, SyncRequestError, planPushBatches } from '../infrastructure/sync/syncTransport';
import { PUSH_BATCH_BUDGET_BYTES } from '../infrastructure/sync/syncProtocol';
import { readLocalSyncSnapshot } from '../infrastructure/sync/localSnapshot';
import { settingsPushDelay, touchesImmediateSettings } from '../infrastructure/sync/settingsPush';
import { LocalSyncDataError } from '../infrastructure/storage/localJson';
import { readCachedConfig } from '../infrastructure/storage/configStorage';
import { readStoredNotebook } from '../infrastructure/storage/notebookStorage';

export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'offline' | 'error';

interface SyncContextValue {
    syncStatus: SyncStatus;
    lastSyncAt: string | null;
    syncNow: () => Promise<void>;
    /** Envoie tout de suite les réglages en attente (fermeture des Réglages). */
    flushPush: () => void;
}

const SyncContext = createContext<SyncContextValue>({ syncStatus: 'idle', lastSyncAt: null, syncNow: async () => {}, flushPush: () => {} });

const PUSH_DEBOUNCE_MS = 3_000;

const syncText = (key: string, values: Record<string, string | number> = {}): string => {
    const locale = readCachedConfig().applicationLocale;
    return translateLocaleMessage(locale === 'fr' || locale === 'en' || locale === 'ar' ? locale : 'ar', key, values);
};

/** Nettoie les références d'une classe supprimée, même si la suppression vient d'un autre appareil. */
const removeDeletedClassReferences = (
    config: Partial<AppConfig>,
    deletedIds: Set<string>,
): { config: Partial<AppConfig>; changed: boolean } => {
    if (deletedIds.size === 0) return { config, changed: false };

    const next = { ...config };
    let changed = false;
    const filterByClass = <T extends { classId: string }>(entries: T[] | undefined): T[] | undefined => {
        if (!entries) return entries;
        const filtered = entries.filter(entry => !deletedIds.has(entry.classId));
        if (filtered.length !== entries.length) changed = true;
        return filtered;
    };
    next.timetable = filterByClass(next.timetable);
    next.schedules = filterByClass(next.schedules);
    if (next.dashboardClassOrder) {
        const filteredOrder = next.dashboardClassOrder.filter(id => !deletedIds.has(id));
        if (filteredOrder.length !== next.dashboardClassOrder.length) {
            next.dashboardClassOrder = filteredOrder;
            changed = true;
        }
    }

    for (const key of ['assessmentDates', 'assessmentAbsences', 'pedagogicalEvents', 'manualAssessments', 'removedAssessments', 'assessmentOrder', 'notificationDismissals'] as const) {
        const records = next[key];
        if (!records) continue;
        const filtered = { ...records };
        for (const classId of deletedIds) delete filtered[classId];
        if (Object.keys(filtered).length !== Object.keys(records).length) {
            (next as Record<string, unknown>)[key] = filtered;
            changed = true;
        }
    }
    return { config: next, changed };
};

interface RemoteLessonsBlob {
    lessonsData?: LessonsData;
    contentDirection?: ContentDirection;
    updatedAt?: string;
}

const fetchLessonsBlob = async (classId: string, owner: string, signal: AbortSignal): Promise<RemoteLessonsBlob | null> => {
    try {
        return await requestSyncJson<RemoteLessonsBlob>(`/api/sync?classId=${encodeURIComponent(classId)}`, {
            credentials: 'same-origin',
            headers: { 'X-Workspace-Owner': owner },
            signal,
        });
    } catch (error) {
        if (error instanceof SyncRequestError && error.status === 404) return null;
        throw error;
    }
};

/**
 * Conflit multi-appareils : la version perdante (locale ou cloud) est
 * archivée avant écrasement, aucune donnée n'est jamais détruite en silence.
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
    /** Référentiel global imposé par la direction, indépendant des réglages professeur. */
    timetableClock?: TimetableClockPolicy;
    classMeta: Record<string, { updatedAt: string }>;
    /** Classes administrées : leurs métadonnées restent prioritaires sur une copie locale périmée. */
    adminClassOverrides?: Record<string, ClassInfo>;
    /** Suppressions durables : empêchent un appareil périmé de recréer une classe. */
    deletedClasses?: Record<string, { deletedAt: string }>;
    updatedAt: string;
}

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, status: authStatus } = useAuth();
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
    const debounceRef = useRef<number | null>(null);
    const scheduledPushAtRef = useRef<number | null>(null);
    /** Échéance du dernier envoi de réglages : cadence les modifications d'emploi du temps. */
    const lastSettingsPushRef = useRef(0);
    const pushingRef = useRef(false);
    const retryAttemptRef = useRef(0);
    const immediatePushRequestedRef = useRef(false);
    const pushAbortRef = useRef<AbortController | null>(null);
    const pullAbortRef = useRef<AbortController | null>(null);
    const refreshRef = useRef<(() => Promise<boolean | void>) | null>(null);
    const authStatusRef = useRef(authStatus);
    authStatusRef.current = authStatus;
    const userRef = useRef(user);
    userRef.current = user;
    // dernière cause d'erreur notifiée : un toast par cause, pas par tentative
    const lastErrorKeyRef = useRef<string | null>(null);

    const notifySyncError = useCallback((status: number, message?: string) => {
        const key = String(status);
        if (lastErrorKeyRef.current === key) return;
        // Pendant l'onboarding, ne pas interrompre l'utilisateur : l'erreur de
        // synchro reste visible via l'état « Erreur » une fois le parcours fini.
        if (readCachedConfig().hasCompletedWelcome !== true) return;
        lastErrorKeyRef.current = key;
        if (status === 401) {
            toast.error(syncText('sync.sessionExpired'), { duration: 10_000 });
        } else if (status === 409) {
            toast.error(syncText('sync.accountChanged'), { duration: 10_000 });
        } else if (status === 413) {
            toast.error(message ?? syncText('sync.tooLarge'), { duration: 10_000 });
        } else {
            toast.error(
                message ? syncText('sync.failedWithMessage', { message }) : syncText('sync.failed'),
                { duration: 8_000 }
            );
        }
    }, []);

    const reportSyncFailure = useCallback((error: unknown) => {
        logger.error('Synchronization failed', error);
        if (error instanceof LocalSyncDataError) {
            setSyncStatus('error');
            if (lastErrorKeyRef.current !== 'local-data') {
                lastErrorKeyRef.current = 'local-data';
                toast.error(syncText('sync.localDataUnreadable'), { duration: 10_000 });
            }
        } else if (error instanceof SyncRequestError && error.status !== 0) {
            setSyncStatus('error');
            notifySyncError(error.status, error.message);
        } else {
            setSyncStatus('offline');
        }
    }, [notifySyncError]);

    const push = useCallback(async (options?: { keepalive?: boolean }) => {
        const currentUser = userRef.current;
        const scope = readWorkspaceScope();
        if (!currentUser || authStatusRef.current !== 'authenticated' || scope?.owner !== accountOwner(currentUser) || !workspaceIsCurrent(scope) || pushingRef.current || !hasPendingWork()) return;
        if (!options?.keepalive && !isForegroundOnline()) {
            if (!navigator.onLine) setSyncStatus('offline');
            return;
        }

        pullAbortRef.current?.abort();
        const controller = new AbortController();
        pushAbortRef.current = controller;
        const isCurrent = () => !controller.signal.aborted && userRef.current && accountOwner(userRef.current) === accountOwner(currentUser) && workspaceIsCurrent(scope);

        pushingRef.current = true;
        setSyncStatus('syncing');
        const work = getPendingWork();
        let succeeded = false;

        try {
            const local = readLocalSyncSnapshot();
            const { classes, config } = local;
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
            const readNotebookCached = (classId: string) => local.notebooks.get(classId) ?? { lessonsData: [] };
            const readLessonsCached = (classId: string): LessonsData => {
                return readNotebookCached(classId).lessonsData;
            };

            const entries = work.dirtyClassIds
                .filter(id => classes.some(c => c.id === id))
                .map(id => {
                    const { lessonsData, contentDirection } = readNotebookCached(id);
                    return {
                        classId: id,
                        lessonsData,
                        contentDirection,
                        updatedAt: syncMeta[id]?.localUpdatedAt ?? now,
                        bytes: syncJsonBytes({ classId: id, lessonsData, contentDirection, updatedAt: syncMeta[id]?.localUpdatedAt ?? now }),
                    };
                });

            /*
             * DÉCOUPAGE EN LOTS : le serveur refuse les corps > ~950 Ko (413).
             * Un push monolithique avec plusieurs gros cahiers (programmes
             * officiels) échouait alors À CHAQUE tentative, c'est la cause
             * du badge « Erreur de synchro » permanent. Chaque lot reste sous
             * ~700 Ko ; un cahier volumineux part seul et est compressé par
             * le transport après vérification de la taille du corps complet.
             * Le planificateur NOMME aussi les cahiers trop gros pour un lot
             * (`oversized`) : leur échec ne doit pas arrêter la file.
             */
            const plan = planPushBatches(entries, PUSH_BATCH_BUDGET_BYTES);
            const batches = plan.batches;
            const oversizedIds = new Set(plan.oversized.map(entry => entry.classId));

            const snapshot = computeTeacherSnapshot(
                currentUser,
                classes,
                schedules,
                config.notificationSettings,
                readLessonsCached,
                config.absences,
                config.schoolYearStart,
                config.applicationLocale ?? 'ar',
                /*
                 * Le nom d'usage et les matières déclarées suivent le compte :
                 * une modification du profil se retrouve donc dans la fiche de
                 * la direction au prochain envoi, sans écran intermédiaire.
                 */
                {
                    displayName: teacherDisplayName(config.defaultTeacherName, currentUser),
                    subjects: teacherDeclaredSubjects(config.selectedSubjects),
                },
            );

            const pushedIds: string[] = [];
            let serverTime: string | null = null;
            let pushedSettingsAt: string | null = null;
            let requiresPull = false;
            let failure: { status: number; message?: string; code?: string; retryAfter?: string | null; firstBatch: boolean } | null = null;
            /** La file a continué malgré un cahier trop gros : ce n'est pas une panne de compte. */
            let blockedByOversized = false;

            for (let i = 0; i < batches.length; i++) {
                if (!isCurrent()) return;
                const isFirst = i === 0;
                const includeSettings = isFirst && work.classesListDirty;
                let data: { serverTime?: string; acceptedClassIds?: string[]; settingsAccepted?: boolean };
                try {
                    data = await requestSyncPush({
                        classes, schedules, timetable: config.timetable ?? [],
                        settings: includeSettings ? extractSyncableSettings(config) : undefined,
                        settingsUpdatedAt: includeSettings ? settingsUpdatedAt : undefined,
                        deletedClasses: isFirst ? work.deletedClasses : [],
                        deletedClassIds: isFirst ? work.deletedClassIds : [],
                        lessons: batches[i].map(({ classId, lessonsData, contentDirection, updatedAt }) => ({ classId, lessonsData, contentDirection, updatedAt })),
                        snapshot: isFirst ? snapshot : undefined,
                    }, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Workspace-Owner': accountOwner(currentUser) },
                        signal: controller.signal,
                        credentials: 'same-origin',
                        // keepalive : la requête survit à la fermeture de la page (flush
                        // pagehide). Limite ~64 Ko : au-delà le fetch rejette et le
                        // travail en attente sera resynchronisé au prochain démarrage.
                        keepalive: options?.keepalive === true,
                    });

                } catch (error) {
                    if (!isCurrent()) return;
                    const networkError = error instanceof SyncRequestError ? error
                        : error instanceof TypeError ? new SyncRequestError('Connexion interrompue.')
                        : error instanceof SyntaxError ? new SyncRequestError('Réponse serveur invalide.', 502) : null;
                    if (!networkError) throw error;
                    /*
                     * UN CAHIER TROP GROS NE BLOQUE PAS LE COMPTE : seul dans son lot,
                     * il ne peut être refusé que POUR LUI-MÊME (au-delà du budget de
                     * lot, ou de l'enveloppe du transport après compression). Sa copie
                     * locale reste, son travail reste en attente, et la file continue :
                     * les classes suivantes montent au cloud. Le professeur est prévenu
                     * une fois, en nommant la classe : c'est un contenu à répartir, pas
                     * une panne de synchronisation.
                     *
                     * Toute autre panne (réseau, serveur, conflit, lot de plusieurs
                     * classes) arrête la file : enchaîner des requêtes vouées à l'échec
                     * ne ferait que la retarder.
                     */
                    if (networkError.status === 413 && batches[i].length === 1) {
                        blockedByOversized = true;
                        const tooBig = batches[i][0];
                        const name = classes.find(c => c.id === tooBig.classId)?.name ?? tooBig.classId;
                        // Une classe déjà nommée par le planificateur mérite le message
                        // précis (répartir son contenu) ; sinon on garde le message
                        // générique de taille, enrichi du nom de la classe.
                        const known = oversizedIds.has(tooBig.classId);
                        notifySyncError(413, syncText(known ? 'sync.classTooLarge' : 'sync.tooLarge', { name }));
                        continue;
                    }
                    if (!failure) {
                        failure = { status: networkError.status, message: networkError.message, code: networkError.code,
                            retryAfter: networkError.retryAfter, firstBatch: isFirst };
                    }
                    break;
                }
                if (!isCurrent()) return;
                if (typeof data.serverTime === 'string') serverTime = data.serverTime;
                if (includeSettings && data.settingsAccepted !== false) pushedSettingsAt = settingsUpdatedAt;
                if (includeSettings && data.settingsAccepted === false) requiresPull = true;
                for (const entry of batches[i]) {
                    pushedIds.push(entry.classId);
                    // point de synchro commun local/cloud (détection de conflit)
                    if (!data.acceptedClassIds || data.acceptedClassIds.includes(entry.classId)) {
                        markClassSynced(entry.classId, entry.updatedAt);
                    } else {
                        // An authoritative admin import rejected this older payload.
                        // Keep a recovery copy even on a device never synced before.
                        backupConflictVersion(entry.classId, entry.lessonsData, 'local');
                        requiresPull = true;
                    }
                }
            }

            if (!isCurrent()) return;
            if (!failure && !blockedByOversized) {
                if (pushedSettingsAt) markSettingsSynced(pushedSettingsAt);
                clearPendingWork(work);
                lastErrorKeyRef.current = null;
                retryAttemptRef.current = 0;
                setLastSyncAt(serverTime ?? new Date().toISOString());
                setSyncStatus(hasPendingWork() || requiresPull ? 'pending' : 'synced');
                succeeded = true;
                return;
            }

            if (!failure) {
                /*
                 * File poursuivie malgré un cahier trop gros : tout ce qui pouvait
                 * monter est monté. Le cahier écarté doit rester EN ATTENTE — un
                 * nettoyage complet le marquerait « synchronisé » alors que rien de
                 * lui n'a rejoint le cloud.
                 */
                if (pushedSettingsAt) markSettingsSynced(pushedSettingsAt);
                retryAttemptRef.current = 0;
                setLastSyncAt(serverTime ?? new Date().toISOString());
            }

            // échec partiel — ou cahier écarté : ne nettoyer QUE ce qui est réellement parti
            const firstBatchFailed = failure?.firstBatch === true;
            if (!firstBatchFailed || pushedIds.length > 0) {
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
                    listVersion: firstBatchFailed ? 0 : work.listVersion,
                    deletedClassIds: firstBatchFailed ? [] : work.deletedClassIds,
                    deletedClasses: firstBatchFailed ? [] : work.deletedClasses,
                });
            }
            /*
             * Un cahier trop gros laisse le travail EN ATTENTE, il ne met pas le
             * compte en erreur : tout ce qui pouvait monter est monté. Le professeur
             * est prévenu une fois (message nommant la classe) et l'état reste
             * « en attente », honnête sur ce qui n'a pas encore rejoint le cloud.
             */
            setSyncStatus(!failure ? 'pending' : failure.status === 0 ? 'offline' : 'error');
            if (failure && failure.status !== 0 && failure.code !== 'WRITE_CONFLICT') notifySyncError(failure.status, failure.message);
            // Bounded jitter and Retry-After avoid synchronized retries and preserve dirty work.
            if (failure && (failure.status === 0 || failure.status === 408 || failure.status >= 500 || failure.status === 429 || failure.code === 'WRITE_CONFLICT')) {
                const delay = retryDelayMs(retryAttemptRef.current++, failure.retryAfter);
                if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
                scheduledPushAtRef.current = Date.now() + delay;
                debounceRef.current = window.setTimeout(() => {
                    debounceRef.current = null;
                    scheduledPushAtRef.current = null;
                    void push();
                }, delay);
            }
        } catch (error) {
            if (!isCurrent()) return;
            reportSyncFailure(error);
        } finally {
            if (pushAbortRef.current === controller) {
                pushingRef.current = false;
                pushAbortRef.current = null;
                const repeatImmediately = immediatePushRequestedRef.current;
                immediatePushRequestedRef.current = false;
                // A second association made during an in-flight push must not wait for
                // the ordinary 20-second debounce. Do not create an error retry loop.
                if (repeatImmediately && succeeded && isCurrent() && hasPendingWork()) {
                    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
                    scheduledPushAtRef.current = Date.now();
                    debounceRef.current = window.setTimeout(() => {
                        debounceRef.current = null;
                        scheduledPushAtRef.current = null;
                        void push();
                    }, 0);
                } else if (succeeded && isCurrent() && !hasPendingWork() && !options?.keepalive) {
                    // Reconcile rejected older imports/settings before claiming that
                    // local content is identical to the authoritative cloud version.
                    window.setTimeout(() => { if (isCurrent()) void refreshRef.current?.(); }, 0);
                }
            }
        }
    }, [reportSyncFailure]);

    useEffect(() => () => {
        pushAbortRef.current?.abort();
        pushingRef.current = false;
        immediatePushRequestedRef.current = false;
        if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    }, [authStatus, user?.id, user?.phone]);

    const schedulePush = useCallback(
        (delayMs: number = PUSH_DEBOUNCE_MS) => {
            const targetAt = Date.now() + delayMs;
            // Une suppression a une priorité plus haute : une modification de
            // réglage qui suit ne doit pas repousser son envoi de 20 secondes.
            if (debounceRef.current !== null && scheduledPushAtRef.current !== null && scheduledPushAtRef.current <= targetAt) {
                return;
            }
            if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
            scheduledPushAtRef.current = targetAt;
            debounceRef.current = window.setTimeout(() => {
                debounceRef.current = null;
                scheduledPushAtRef.current = null;
                void push();
            }, delayMs);
        },
        [push]
    );

    const syncNow = useCallback(() => {
        if (debounceRef.current !== null) {
            window.clearTimeout(debounceRef.current);
            debounceRef.current = null;
            scheduledPushAtRef.current = null;
        }
        if (pushingRef.current) {
            immediatePushRequestedRef.current = true;
            return Promise.resolve();
        }
        return hasPendingWork() ? push() : Promise.resolve(refreshRef.current?.()).then(() => {});
    }, [push]);

    /**
     * Envoi immédiat des réglages en attente : appelé quand l'enseignant quitte
     * les Réglages, pour que la grille qu'il vient de modifier parte sans attendre.
     */
    const flushPush = useCallback(() => {
        if (!hasPendingWork()) return;
        schedulePush(0);
    }, [schedulePush]);

    // Pull initial + diffusion continue. Aucun chevauchement ; une saisie ou
    // un push invalide la réponse en vol avant qu'elle touche le stockage local.
    useEffect(() => {
        if (authStatus !== 'authenticated' || !user) return;
        let cancelled = false;
        const scope = readWorkspaceScope();
        if (scope?.owner !== accountOwner(user) || !workspaceIsCurrent(scope)) return;
        let inFlight = false;
        let associationOffered = false;
        const unsubscribeDirty = subscribe('dirty', () => pullAbortRef.current?.abort());
        const refresh = async () => {
            if (cancelled || inFlight || pushingRef.current || document.visibilityState === 'hidden' || !navigator.onLine) return;
            inFlight = true;
            const controller = new AbortController();
            pullAbortRef.current = controller;
            let timedOut = false;
            const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 30_000);
            const isCurrent = () => !cancelled && !controller.signal.aborted && !pushingRef.current && workspaceIsCurrent(scope);
            setSyncStatus('syncing');
            measurements.start(MEASURES.syncStart);
            measurements.start(MEASURES.syncTimetable);
            measurements.start(MEASURES.syncClasses);
            notifySyncProgress({ state: 'pulling', total: 0, done: 0, classId: null });
            try {
                const response = await apiFetch('/api/sync', { credentials: 'same-origin', headers: { 'X-Workspace-Owner': accountOwner(user) }, signal: controller.signal });
                if (!response.ok) {
                    if (isCurrent()) {
                        setSyncStatus('error');
                        notifySyncError(response.status);
                    }
                    return false;
                }
                const server = (await response.json()) as ServerClassesBlob;
                if (!isCurrent()) return;

                const local = readLocalSyncSnapshot(localStorage, { includeNotebooks: false });
                const { classes: localClasses, config: localConfig } = local;
                const syncMeta = readSyncMeta();

                const remoteDeletedIds = new Set(Object.keys(server.deletedClasses ?? {}));
                const pendingDeletedIds = new Set(getPendingWork().deletedClassIds);
                const deletedIds = new Set([...remoteDeletedIds, ...pendingDeletedIds]);
                const localVisibleClasses = localClasses.filter(classInfo => !deletedIds.has(classInfo.id));

                const queuedClassIds = new Set(getPendingWork().dirtyClassIds);
                const needsAssociation = localVisibleClasses.some(classInfo => !queuedClassIds.has(classInfo.id) && !syncMeta[classInfo.id]?.lastSyncedAt);
                if ((server.classes?.length ?? 0) === 0 && remoteDeletedIds.size === 0 && needsAssociation) {
                    // Refusing notebook association must not disable the admin clock.
                    if (server.timetableClock !== undefined) {
                        const config = localConfig;
                        const timetableClock = normalizeTimetableClock(server.timetableClock);
                        if (JSON.stringify(config.timetableClock) !== JSON.stringify(timetableClock)) {
                            localStorage.setItem('appConfig_v1', JSON.stringify({ ...config, timetableClock }));
                            notifyPullApplied();
                        }
                    }
                    // Première association : des cahiers locaux existent mais le
                    // cloud est vide. Les créations explicitement mises en file
                    // (dont l'essai conservé à l'inscription) sont déjà autorisées.
                    // Proposition NON bloquante pour les autres cahiers locaux.
                    // L'application conseille, le professeur décide et rien n'est interrompu.
                    setSyncStatus('idle');
                    if (!associationOffered) toast.info(
                        syncText('sync.localNotLinked', { count: localClasses.length }),
                        {
                            duration: 15_000,
                            action: {
                                label: syncText('sync.linkAction'),
                                onClick: () => {
                                    if (cancelled || !workspaceIsCurrent(scope)) return;
                                    localClasses.forEach(c => markClassDirty(c.id));
                                    markClassesListDirty();
                                    schedulePush(500);
                                },
                            },
                        }
                    );
                    associationOffered = true;
                    return;
                }

                const mergedClasses = [...localVisibleClasses];
                let localChanged = mergedClasses.length !== localClasses.length;
                const conflictNames: string[] = [];
                const commits: Array<() => void> = [];

                // Un tombstone cloud est définitif pour cet identifiant. On
                // retire également la copie locale des cours et ses métadonnées
                // avant toute décision de fusion.
                for (const classId of deletedIds) {
                    commits.push(() => {
                        try { localStorage.removeItem(`classData_v1_${classId}`); } catch { /* stockage indisponible */ }
                        try { localStorage.removeItem(`editJournal_v1_${classId}`); } catch { /* stockage indisponible */ }
                        try { localStorage.removeItem(`printMeta_v1_${classId}`); } catch { /* stockage indisponible */ }
                        try { localStorage.removeItem(`editor_actions_ignored_v1_${classId}`); } catch { /* stockage indisponible */ }
                    });
                    if (syncMeta[classId]) {
                        delete syncMeta[classId];
                        localChanged = true;
                    }
                }

                // ── Phase 1 : décisions (synchrone, LWW + détection de conflit) ──
                interface PullDecision {
                    serverClass: ClassInfo;
                    serverUpdatedAt?: string;
                    localIndex: number;
                    action: 'apply' | 'requeue' | 'none';
                    conflict: boolean;
                    hasAdminOverride: boolean;
                    serverIsNewer: boolean;
                }
                const decisions: PullDecision[] = (server.classes ?? [])
                    .filter(serverClass => !deletedIds.has(serverClass.id))
                    .map(serverClass => {
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
                        ((queuedClassIds.has(serverClass.id) && serverIsNewer) ||
                        (!!serverUpdatedAt && !!localUpdatedAt && !!lastSyncedAt &&
                        serverUpdatedAt > lastSyncedAt && localUpdatedAt > lastSyncedAt &&
                        serverUpdatedAt !== localUpdatedAt));
                    const hasAdminOverride = !!server.adminClassOverrides?.[serverClass.id];

                    const action: PullDecision['action'] =
                        localIndex === -1 || serverIsNewer || hasAdminOverride
                            ? 'apply'
                            : localUpdatedAt && (!serverUpdatedAt || localUpdatedAt > serverUpdatedAt)
                                ? 'requeue' // modifications locales jamais poussées : on les remet en file
                                : 'none';

                    return { serverClass, serverUpdatedAt, localIndex, action, conflict, hasAdminOverride, serverIsNewer };
                    });

                // Only validate notebooks about to be replaced/backed up. An unchanged
                // pull never reparses every course; the strict reader shares the bounded cache.
                for (const decision of decisions) {
                    if (decision.localIndex !== -1 && (decision.serverIsNewer || decision.conflict)) {
                        local.notebooks.set(decision.serverClass.id, readStoredNotebook(decision.serverClass.id));
                    }
                }

                // ── Phase 2 : exécution en parallèle (un aller-retour par classe) ──
                // Avancement publié pour l'interface : chaque cahier rapatrié fait
                // avancer la préparation, sans écran bloquant. La règle de sûreté
                // reste intacte (aucune écriture avant la fin des lectures).
                const notebookTotal = decisions.filter(decision => decision.action === 'apply' && (decision.localIndex === -1 || decision.serverIsNewer)).length;
                let notebooksDone = 0;
                await Promise.all(decisions.map(async ({ serverClass, serverUpdatedAt, localIndex, action, conflict, serverIsNewer }) => {
                    if (!isCurrent()) return;
                    if (action === 'apply') {
                        // le cloud va remplacer le local : archiver la version locale perdante
                        if (conflict) {
                            commits.push(() => backupConflictVersion(serverClass.id, local.notebooks.get(serverClass.id)?.lessonsData ?? [], 'local'));
                            conflictNames.push(serverClass.name);
                        }
                        // Les champs d'une classe administrée doivent se mettre à jour
                        // même lorsqu'une saisie de cours locale est plus récente. Dans
                        // ce cas, on conserve le cahier local et on applique seulement
                        // ses métadonnées (nom, matière, cycle).
                        const shouldFetchLessons = localIndex === -1 || serverIsNewer;
                        const blob = shouldFetchLessons ? await fetchLessonsBlob(serverClass.id, accountOwner(user), controller.signal) : null;
                        if (!isCurrent()) return;
                        if (shouldFetchLessons && serverUpdatedAt && !blob) throw new SyncRequestError('Le cahier cloud est momentanément indisponible. Réessayez la synchronisation.', 502);
                        if (blob) {
                            const contentDirection = isContentDirection(blob.contentDirection)
                                ? blob.contentDirection
                                : undefined;
                            commits.push(() => localStorage.setItem(
                                `classData_v1_${serverClass.id}`,
                                JSON.stringify({
                                    lessonsData: blob.lessonsData ?? [],
                                    ...(contentDirection ? { contentDirection } : {}),
                                })
                            ));
                            const syncedAt = blob.updatedAt ?? serverUpdatedAt ?? new Date().toISOString();
                            syncMeta[serverClass.id] = { localUpdatedAt: syncedAt, lastSyncedAt: syncedAt };
                            localChanged = true;
                            notebooksDone += 1;
                            notifySyncProgress({ state: 'notebooks', total: notebookTotal, done: notebooksDone, classId: serverClass.id });
                        }
                        if (localIndex === -1) {
                            mergedClasses.push(serverClass);
                        } else {
                            const localClass = mergedClasses[localIndex];
                            mergedClasses[localIndex] = withCurriculumSettings(
                                { ...localClass, ...serverClass },
                                serverIsNewer ? serverClass : localClass,
                            );
                        }
                        if (localIndex === -1 || JSON.stringify(mergedClasses[localIndex]) !== JSON.stringify(localClasses.find(c => c.id === serverClass.id))) localChanged = true;
                    } else if (action === 'requeue') {
                        // le local va écraser le cloud au prochain push : archiver la version cloud perdante
                        if (conflict) {
                            const blob = await fetchLessonsBlob(serverClass.id, accountOwner(user), controller.signal);
                            if (!isCurrent()) return;
                            if (blob) commits.push(() => backupConflictVersion(serverClass.id, blob.lessonsData ?? [], 'cloud'));
                            conflictNames.push(serverClass.name);
                        }
                        commits.push(() => markClassDirty(serverClass.id));
                    }
                }));
                if (!isCurrent()) return;
                // No await below this point: user edits cannot interleave with commit.
                for (const commit of commits) commit();

                if (conflictNames.length > 0) {
                    toast.warning(
                        conflictNames.length === 1
                            ? syncText('sync.conflictOne', { name: conflictNames[0] })
                            : syncText('sync.conflictMany', {
                                count: conflictNames.length,
                                names: `${conflictNames.slice(0, 3).join(', ')}${conflictNames.length > 3 ? '…' : ''}`,
                            }),
                        { duration: 10000 }
                    );
                }

                // classes locales inconnues du serveur → à pousser
                for (const localClass of localClasses) {
                    if (!deletedIds.has(localClass.id) && !(server.classes ?? []).some(c => c.id === localClass.id)) {
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
                const cleanedConfig = removeDeletedClassReferences(localConfig, deletedIds);
                let nextConfig = cleanedConfig.config;
                let configChanged = cleanedConfig.changed;
                const settings: SyncableSettings | undefined =
                    server.settings ??
                    (server.schedules || server.timetable
                        ? ({ schedules: server.schedules, timetable: server.timetable } as SyncableSettings)
                        : undefined);
                const settingsMeta = readSettingsSyncMeta();
                const remoteSettingsAt = server.settingsUpdatedAt || server.updatedAt || '';
                const localHasSettings =
                    (nextConfig.schedules?.length ?? 0) > 0 ||
                    (nextConfig.timetable?.length ?? 0) > 0 ||
                    !!nextConfig.establishmentName ||
                    Object.keys(nextConfig.assessmentDates ?? {}).length > 0 ||
                    Object.keys(nextConfig.pedagogicalEvents ?? {}).length > 0;
                const shouldApplyRemoteSettings =
                    !!settings &&
                    (
                        (!localHasSettings && !settingsMeta.localUpdatedAt) ||
                        (!!remoteSettingsAt && !!settingsMeta.localUpdatedAt && remoteSettingsAt > settingsMeta.localUpdatedAt
                            && remoteSettingsAt !== settingsMeta.lastSyncedAt)
                    );
                if (settings && shouldApplyRemoteSettings) {
                    nextConfig = mergeSyncableSettings(nextConfig, settings);
                    if (remoteSettingsAt) markSettingsSynced(remoteSettingsAt);
                    configChanged = true;
                } else if (settings && localHasSettings && !settingsMeta.localUpdatedAt && remoteSettingsAt) {
                    touchSettingsSyncMeta();
                    markClassesListDirty();
                }

                // L'horloge de la direction n'entre jamais dans le LWW des
                // préférences professeur : elle est autoritaire et ne repart
                // pas dans un push utilisateur.
                if (server.timetableClock !== undefined) {
                    const timetableClock = normalizeTimetableClock(server.timetableClock);
                    if (JSON.stringify(nextConfig.timetableClock) !== JSON.stringify(timetableClock)) {
                        nextConfig = { ...nextConfig, timetableClock };
                        configChanged = true;
                    }
                }
                if (configChanged) {
                    try {
                        localStorage.setItem('appConfig_v1', JSON.stringify(nextConfig));
                        localChanged = true;
                    } catch { /* stockage plein */ }
                }
                // Réglages et emploi du temps appliqués : première étape du
                // premier chargement (voir domain/sync/bootstrapProgress).
                bootstrapStore.markTimetable();
                measurements.end(MEASURES.syncTimetable);

                const coloredClasses = assignClassColors(mergedClasses);
                if (coloredClasses.some((item, index) => item.color !== mergedClasses[index].color)) {
                    localChanged = true;
                    markClassesListDirty();
                }
                if (localChanged) {
                    localStorage.setItem('classManager_v1', JSON.stringify(coloredClasses));
                    writeSyncMeta(syncMeta);
                    notifyPullApplied();
                }
                // La liste des classes est écrite : le premier chargement est
                // complet même si rien n'avait changé localement.
                bootstrapStore.markClasses();
                measurements.end(MEASURES.syncClasses);
                measurements.end(MEASURES.syncStart);
                notifySyncProgress({ state: 'ready', total: coloredClasses.length, done: 0, classId: null });

                setLastSyncAt(server.updatedAt || null);
                if (hasPendingWork()) {
                    setSyncStatus('pending');
                    schedulePush(500);
                } else {
                    setSyncStatus('synced');
                }
                return true;
            } catch (error) {
                if (isCurrent()) {
                    notifySyncProgress({ state: 'failed' });
                    reportSyncFailure(error);
                }
                return controller.signal.aborted ? undefined : false;
            } finally {
                window.clearTimeout(timeout);
                if (pullAbortRef.current === controller) pullAbortRef.current = null;
                inFlight = false;
                if (!cancelled && workspaceIsCurrent(scope) && !pushingRef.current && controller.signal.aborted) {
                    setSyncStatus(hasPendingWork() ? 'pending' : timedOut ? 'offline' : 'idle');
                }
            }
        };
        refreshRef.current = refresh;
        const stopPolling = startForegroundPolling(refresh, {
            interval: 60_000,
            onInactive: () => pullAbortRef.current?.abort(),
        });

        return () => {
            if (refreshRef.current === refresh) refreshRef.current = null;
            cancelled = true;
            pullAbortRef.current?.abort();
            unsubscribeDirty();
            stopPolling();
        };
    }, [authStatus, user, schedulePush, reportSyncFailure]);

    // ── Déclencheurs : événements dirty, retour en ligne, fermeture ─────────
    useEffect(() => {
        if (authStatus !== 'authenticated') return;

        const unsubscribeDirty = subscribe('dirty', () => {
            setSyncStatus(current => (current === 'syncing' ? current : 'pending'));
            schedulePush(getPendingWork().deletedClassIds.length > 0 ? 50 : PUSH_DEBOUNCE_MS);
        });

        /*
         * Emploi du temps : une case modifiée change les séances de la journée
         * (ouverture automatique, rappels, repère « en cours »). L'envoi part donc
         * tout de suite, avec un plafond qui absorbe une rafale d'édition.
         */
        const unsubscribeConfig = subscribe('config-changed', (_source, keys) => {
            if (!touchesImmediateSettings(keys)) return;
            const now = Date.now();
            const delay = settingsPushDelay(now, lastSettingsPushRef.current);
            lastSettingsPushRef.current = now + delay;
            schedulePush(delay);
        });

        const handleOnline = () => {
            if (isForegroundOnline() && hasPendingWork()) schedulePush(1_000);
        };

        const flush = () => {
            if (!hasPendingWork() || document.visibilityState !== 'hidden') return;
            // best-effort : keepalive est limité à ~64 Ko, un gros cahier sera
            // resynchronisé au prochain démarrage grâce à syncMeta_v1 (LWW).
            void push({ keepalive: true });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('native-resume', handleOnline);
        document.addEventListener('visibilitychange', handleOnline);
        document.addEventListener('visibilitychange', flush);
        window.addEventListener('pagehide', flush);
        return () => {
            unsubscribeDirty();
            unsubscribeConfig();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('native-resume', handleOnline);
            document.removeEventListener('visibilitychange', handleOnline);
            document.removeEventListener('visibilitychange', flush);
            window.removeEventListener('pagehide', flush);
            if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
            scheduledPushAtRef.current = null;
        };
    }, [authStatus, schedulePush, push]);

    const value = useMemo(
        () => ({ syncStatus, lastSyncAt, syncNow, flushPush }),
        [flushPush, lastSyncAt, syncNow, syncStatus]
    );

    return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export const useSync = (): SyncContextValue => useContext(SyncContext);
