import { FullBackup, buildFullBackup } from './backup.js';
import { getBundledCalendar, getSchoolYearFor, todayInMorocco } from './calendar.js';

/**
 * Archives des années scolaires PASSÉES.
 *
 * Une archive est un instantané COMPLET (même format que la sauvegarde
 * totale : config + classes + cahiers + journaux + mémoire d'impression)
 * figé au moment de l'archivage et étiqueté par année scolaire. Elle est
 * conservée sur l'appareil, consultable, téléchargeable et restaurable via
 * Paramètres ▸ Données — le prof garde ainsi la trace de ses années écoulées
 * après avoir reparti sur un cahier neuf.
 */

const INDEX_KEY = 'archives_v1_index';
const entryKey = (id: string) => `archive_v1_${id}`;

export interface ArchiveMeta {
    id: string;
    /** libellé de l'année scolaire archivée, ex. « 2025-2026 » */
    yearLabel: string;
    createdAt: string;
    classCount: number;
    /** taille approximative en octets (information de gestion du stockage) */
    bytes: number;
}

export const listArchives = (): ArchiveMeta[] => {
    try {
        const raw = localStorage.getItem(INDEX_KEY);
        const list = raw ? (JSON.parse(raw) as ArchiveMeta[]) : [];
        return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
        return [];
    }
};

const writeIndex = (list: ArchiveMeta[]): void => {
    localStorage.setItem(INDEX_KEY, JSON.stringify(list));
};

/** Libellé de l'année scolaire courante d'après le calendrier officiel. */
export const currentYearLabel = (): string => {
    try {
        const calendar = getBundledCalendar();
        return getSchoolYearFor(calendar, todayInMorocco()).libelle;
    } catch {
        const year = new Date().getFullYear();
        return `${year}-${year + 1}`;
    }
};

/**
 * Archive l'état COMPLET actuel sous le libellé d'année donné.
 * Peut échouer si le stockage local est plein (retourne null).
 */
export const createArchive = (yearLabel: string): ArchiveMeta | null => {
    const backup = buildFullBackup();
    const payload = JSON.stringify(backup);
    const meta: ArchiveMeta = {
        id: `${yearLabel.replace(/[^0-9-]/g, '')}-${Date.now().toString(36)}`,
        yearLabel,
        createdAt: new Date().toISOString(),
        classCount: backup.classes.length,
        bytes: payload.length,
    };
    try {
        localStorage.setItem(entryKey(meta.id), payload);
        writeIndex([...listArchives(), meta]);
        return meta;
    } catch {
        // quota dépassé : proposer plutôt le téléchargement du fichier
        try {
            localStorage.removeItem(entryKey(meta.id));
        } catch { /* rien à nettoyer */ }
        return null;
    }
};

export const readArchive = (id: string): FullBackup | null => {
    try {
        const raw = localStorage.getItem(entryKey(id));
        return raw ? (JSON.parse(raw) as FullBackup) : null;
    } catch {
        return null;
    }
};

export const deleteArchive = (id: string): void => {
    try {
        localStorage.removeItem(entryKey(id));
        writeIndex(listArchives().filter(a => a.id !== id));
    } catch {
        // index incohérent : au pire l'entrée orpheline sera écrasée plus tard
    }
};

/** Télécharge une archive en fichier JSON (même format que la sauvegarde totale, ré-importable). */
export const downloadArchive = (meta: ArchiveMeta): boolean => {
    const backup = readArchive(meta.id);
    if (!backup) return false;
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cahier-archive-${meta.yearLabel}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
};
