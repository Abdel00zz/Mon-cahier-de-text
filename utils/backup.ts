import { AppConfig, ClassInfo, LessonsData } from '../types';
import { SyncMeta } from './syncBus';

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

export const buildFullBackup = (): FullBackup => {
    const config = (readJSON('appConfig_v1') as Partial<AppConfig>) ?? {};
    const classes = ((readJSON('classManager_v1') as ClassInfo[]) ?? []).map(classInfo => ({
        classInfo,
        lessonsData: ((readJSON(`classData_v1_${classInfo.id}`) as LessonsData) ?? []),
        journal: readJSON(`editJournal_v1_${classInfo.id}`),
        printMeta: readJSON(`printMeta_v1_${classInfo.id}`),
    }));

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

/**
 * Restaure une sauvegarde. Accepte le format v2 (complet) ET l'ancien format
 * (`{ config, classes:[{classInfo, lessonsData}] }`) pour compatibilité.
 * Retourne le nombre de classes restaurées.
 */
export const restoreBackup = (data: any): number => {
    if (!data || typeof data !== 'object') throw new Error('Fichier de sauvegarde invalide.');
    const classes = Array.isArray(data.classes) ? data.classes : null;
    if (!data.config || !classes) throw new Error('Fichier de sauvegarde invalide ou corrompu.');

    // 1) Configuration
    localStorage.setItem('appConfig_v1', JSON.stringify(data.config));

    // 2) Liste des classes
    const allClassInfo = classes.map((c: any) => c.classInfo).filter(Boolean);
    localStorage.setItem('classManager_v1', JSON.stringify(allClassInfo));
    localStorage.setItem('app_first_launch_v1', 'true');

    // 3) Données par classe (+ journal + mémoire d'impression si présents)
    for (const c of classes) {
        const id = c?.classInfo?.id;
        if (!id) continue;
        localStorage.setItem(`classData_v1_${id}`, JSON.stringify(c.lessonsData ?? []));
        if (c.journal !== undefined) localStorage.setItem(`editJournal_v1_${id}`, JSON.stringify(c.journal));
        if (c.printMeta !== undefined) localStorage.setItem(`printMeta_v1_${id}`, JSON.stringify(c.printMeta));
    }

    /*
     * 4) Métadonnées de synchro — la restauration EST une modification locale
     * datée de maintenant. Sans cet horodatage, un cloud plus « récent » que la
     * sauvegarde écraserait les données fraîchement restaurées au pull suivant
     * (et l'ancien format v1, sans syncMeta, laisserait toutes les classes
     * paraître plus anciennes que le cloud). Le `lastSyncedAt` de la sauvegarde
     * est conservé : si le cloud a divergé depuis, le conflit sera détecté et
     * la version cloud archivée avant d'être remplacée.
     */
    const restoredMeta: SyncMeta =
        data.syncMeta && typeof data.syncMeta === 'object' ? { ...(data.syncMeta as SyncMeta) } : {};
    const now = new Date().toISOString();
    for (const info of allClassInfo) {
        restoredMeta[info.id] = { ...restoredMeta[info.id], localUpdatedAt: now };
    }
    localStorage.setItem('syncMeta_v1', JSON.stringify(restoredMeta));

    return allClassInfo.length;
};
