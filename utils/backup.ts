import { AppConfig, ClassInfo, ContentDirection, LessonsData } from '../types.js';
import { assignClassColors } from './classColors.js';
import { prepareImportedLessons } from './importPipeline.js';
import { writeStorageBatch } from './storageBatch.js';
import {
    markClassDeleted,
    markClassDirty,
    markClassesListDirty,
    touchSettingsSyncMeta,
    SyncMeta,
} from './syncBus.js';

/**
 * Sauvegarde COMPLÈTE de toutes les données de l'utilisateur sur cet appareil :
 * configuration, classes + cahiers, journaux d'édition, mémoire d'impression,
 * métadonnées de synchro. Format versionné et ré-importable à l'identique.
 */

export interface FullBackup {
    format: 'cdt-backup';
    version: 2;
    exportedAt: string;
    user?: { phone?: string; nom?: string; prenom?: string } | null;
    config: Partial<AppConfig>;
    classes: Array<{
        classInfo: ClassInfo;
        lessonsData: LessonsData;
        contentDirection?: ContentDirection;
        journal?: unknown;
        printMeta?: unknown;
    }>;
    syncMeta?: unknown;
}

const readJSON = (key: string): unknown => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : undefined;
    } catch {
        return undefined;
    }
};

const isContentDirection = (value: unknown): value is ContentDirection =>
    value === 'rtl' || value === 'ltr';

/** Accepte les anciens tableaux et les nouveaux instantanés `{ lessonsData, contentDirection }`. */
const readNotebook = (value: unknown): { lessonsData: LessonsData; contentDirection?: ContentDirection } => {
    if (Array.isArray(value)) return { lessonsData: value as LessonsData };
    if (!value || typeof value !== 'object') return { lessonsData: [] };
    const record = value as { lessonsData?: unknown; contentDirection?: unknown };
    return {
        lessonsData: Array.isArray(record.lessonsData) ? record.lessonsData as LessonsData : [],
        ...(isContentDirection(record.contentDirection) ? { contentDirection: record.contentDirection } : {}),
    };
};

export const buildFullBackup = (): FullBackup => {
    const config = (readJSON('appConfig_v1') as Partial<AppConfig>) ?? {};
    const classes = ((readJSON('classManager_v1') as ClassInfo[]) ?? []).map(classInfo => {
        const notebook = readNotebook(readJSON(`classData_v1_${classInfo.id}`));
        return {
            classInfo,
            ...notebook,
            journal: readJSON(`editJournal_v1_${classInfo.id}`),
            printMeta: readJSON(`printMeta_v1_${classInfo.id}`),
        };
    });

    return {
        format: 'cdt-backup',
        version: 2,
        exportedAt: new Date().toISOString(),
        user: (readJSON('authUser_v1') as FullBackup['user']) ?? null,
        config,
        classes,
        syncMeta: readJSON('syncMeta_v1'),
    };
};

export const downloadBackup = (): void => {
    const backup = buildFullBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cahier-sauvegarde-complete-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

/** Validate the entire file before touching configuration or any existing notebook. */
export function validateBackup(value: unknown): FullBackup {
    if (!isRecord(value) || !isRecord(value.config) || !Array.isArray(value.classes)
        || (value.format !== undefined && value.format !== 'cdt-backup')
        || (value.version !== undefined && value.version !== 2 && value.version !== 1)) {
        throw new Error('Fichier de sauvegarde invalide ou version non prise en charge.');
    }
    if (value.classes.length > 500) throw new Error('La sauvegarde contient trop de classes (maximum 500).');
    const ids = new Set<string>();
    for (const [index, entry] of value.classes.entries()) {
        const info = isRecord(entry) && isRecord(entry.classInfo) ? entry.classInfo : null;
        if (!info || typeof info.id !== 'string' || !info.id.trim() || info.id.length > 200
            || ['__proto__', 'constructor', 'prototype'].includes(info.id)
            || typeof info.name !== 'string' || !info.name.trim() || ids.has(info.id)) {
            throw new Error(`Classe ${index + 1} invalide ou identifiant dupliqué.`);
        }
        ids.add(info.id);
        for (const key of ['teacherName', 'subject', 'createdAt', 'lastOpenedAt', 'color', 'level', 'branch', 'group']) {
            if (info[key] !== undefined && typeof info[key] !== 'string') throw new Error(`Champ « ${key} » invalide dans la classe ${index + 1}.`);
        }
        if (!Array.isArray(entry.lessonsData)) throw new Error(`Cahier manquant ou invalide pour la classe ${index + 1}.`);
        if (entry.contentDirection !== undefined && !isContentDirection(entry.contentDirection)) throw new Error('Sens du contenu invalide.');
        if (entry.journal != null && !Array.isArray(entry.journal)) throw new Error('Journal de sauvegarde invalide.');
        if (entry.printMeta != null && !isRecord(entry.printMeta)) throw new Error('Métadonnées d’impression invalides.');
        // Validate bounded structure and fields, but preserve the exact exported
        // values, including intentional spacing and legacy date representations.
        const prepared = prepareImportedLessons(entry.lessonsData);
        if (prepared.report.repairedContainers || prepared.report.repairedTexts
            || prepared.lessonsData.length !== entry.lessonsData.length) throw new Error(`Contenu endommagé dans la classe ${index + 1}.`);
        const pending: unknown[] = [...entry.lessonsData];
        while (pending.length) {
            const node = pending.pop();
            if (!isRecord(node)) throw new Error(`Élément de cours invalide dans la classe ${index + 1}.`);
            for (const field of ['sections', 'subsections', 'subsubsections', 'items']) {
                if (Array.isArray(node[field])) pending.push(...node[field]);
            }
        }
    }
    return value as unknown as FullBackup;
}

/**
 * Restaure une sauvegarde. Accepte le format v2 (complet) ET l'ancien format
 * (`{ config, classes:[{classInfo, lessonsData}] }`) pour compatibilité.
 * Retourne le nombre de classes restaurées.
 */
export const restoreBackup = (input: unknown): number => {
    const data = validateBackup(input);
    const classes = data.classes;

    const storedClasses = readJSON('classManager_v1');
    const previousClasses = Array.isArray(storedClasses) ? storedClasses.filter(c => c && typeof c.id === 'string') as ClassInfo[] : [];
    const entries = new Map<string, string | null>();

    // 1) Configuration
    entries.set('appConfig_v1', JSON.stringify(data.config));

    // 2) Liste des classes
    const allClassInfo: ClassInfo[] = assignClassColors(classes.map(c => c.classInfo));
    entries.set('classManager_v1', JSON.stringify(allClassInfo));
    entries.set('app_first_launch_v1', 'true');

    // 3) Données par classe (+ journal + mémoire d'impression si présents)
    for (const c of classes) {
        const id = c?.classInfo?.id;
        if (!id) continue;
        const notebook = readNotebook({
            lessonsData: c?.lessonsData,
            contentDirection: c?.contentDirection,
        });
        entries.set(
            `classData_v1_${id}`,
            JSON.stringify({
                lessonsData: notebook.lessonsData,
                ...(notebook.contentDirection ? { contentDirection: notebook.contentDirection } : {}),
            })
        );
        entries.set(`editJournal_v1_${id}`, c.journal === undefined ? null : JSON.stringify(c.journal));
        entries.set(`printMeta_v1_${id}`, c.printMeta === undefined ? null : JSON.stringify(c.printMeta));
    }

    /*
     * 4) Métadonnées de synchro, la restauration EST une modification locale
     * datée de maintenant. Sans cet horodatage, un cloud plus « récent » que la
     * sauvegarde écraserait les données fraîchement restaurées au pull suivant
     * (et l'ancien format v1, sans syncMeta, laisserait toutes les classes
     * paraître plus anciennes que le cloud). Le `lastSyncedAt` de la sauvegarde
     * est conservé : si le cloud a divergé depuis, le conflit sera détecté et
     * la version cloud archivée avant d'être remplacée.
     */
    const restoredMeta: SyncMeta = {};
    const now = new Date().toISOString();
    for (const info of allClassInfo) {
        const candidate = isRecord(data.syncMeta) ? data.syncMeta[info.id] : null;
        const old = isRecord(candidate) ? candidate : null;
        restoredMeta[info.id] = { localUpdatedAt: now,
            ...(old && typeof old.lastSyncedAt === 'string' ? { lastSyncedAt: old.lastSyncedAt } : {}) };
    }
    entries.set('syncMeta_v1', JSON.stringify(restoredMeta));
    writeStorageBatch(entries);

    /*
     * 5) Réinjecter explicitement la restauration dans le circuit cloud.
     * Les horodatages seuls permettent de choisir une version au pull, mais ne
     * créent pas de travail « dirty ». La liste, les réglages et chaque cahier
     * doivent partir ensemble au prochain push.
     */
    const restoredIds = new Set(allClassInfo.map(info => info.id));
    previousClasses
        .filter(info => !restoredIds.has(info.id))
        .forEach(info => markClassDeleted(info.id));
    allClassInfo.forEach(info => markClassDirty(info.id));
    touchSettingsSyncMeta();
    markClassesListDirty();

    return allClassInfo.length;
};
