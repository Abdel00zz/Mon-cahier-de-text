/**
 * Journal des actions d'édition, par classe, persistant, plafonné.
 * Alimente la ligne « Dernière modification » et le centre global d’activité.
 */

import type { AppLocale } from '../types.js';

export interface JournalEntry {
    op: string;
    at: string; // ISO
}

const key = (classId: string) => `editJournal_v1_${classId}`;
const MAX_ENTRIES = 60;

/** Libellés français des types d'opérations de l'éditeur. */
const OP_LABELS: Record<string, string> = {
    'initial-load': 'Ouverture du cahier',
    'cell-edit': 'Modification d\'une cellule',
    'inline-edit-item': 'Modification d\'un élément',
    'add-item': 'Ajout d\'un élément',
    'add-section': 'Ajout d\'une section',
    'add-top-level': 'Ajout d\'un chapitre / bloc',
    'add-embedded-item': 'Insertion d\'un bloc',
    'add-separator': 'Ajout d\'un séparateur',
    'delete-separator': 'Suppression d\'un séparateur',
    'assign-date': 'Affectation de date(s)',
    'clear-date': 'Dissociation de date(s)',
    'bulk-delete': 'Suppression d\'élément(s)',
    'reorder': 'Réordonnancement (boutons)',
    'reorder-drag': 'Réordonnancement (glisser-déposer)',
    'import-data': 'Import de données',
    'manage-lessons': 'Réorganisation des leçons',
    'description-edit': 'Modification d\'une description',
    'undo': 'Annulation de la dernière action',
    'redo': 'Rétablissement de la dernière action',
    'export-data': 'Export d\'une sauvegarde',
};

const OP_LABELS_AR: Record<string, string> = {
    'initial-load': 'فتح الدفتر',
    'cell-edit': 'تعديل خانة',
    'inline-edit-item': 'تعديل عنصر',
    'add-item': 'إضافة عنصر',
    'add-section': 'إضافة محور',
    'add-top-level': 'إضافة درس أو وحدة',
    'add-embedded-item': 'إدراج كتلة',
    'add-separator': 'إضافة فاصل',
    'delete-separator': 'حذف فاصل',
    'assign-date': 'إسناد تاريخ',
    'clear-date': 'إلغاء ربط تاريخ',
    'bulk-delete': 'حذف عناصر',
    'reorder': 'إعادة الترتيب',
    'reorder-drag': 'إعادة الترتيب بالسحب',
    'import-data': 'استيراد البيانات',
    'manage-lessons': 'تنظيم الدروس',
    'description-edit': 'تعديل وصف',
    'undo': 'التراجع عن آخر إجراء',
    'redo': 'إعادة آخر إجراء',
    'export-data': 'تصدير نسخة احتياطية',
};

const OP_LABELS_EN: Record<string, string> = {
    'initial-load': 'Notebook opened',
    'cell-edit': 'Cell edited',
    'inline-edit-item': 'Item edited',
    'add-item': 'Item added',
    'add-section': 'Section added',
    'add-top-level': 'Lesson or block added',
    'add-embedded-item': 'Block inserted',
    'add-separator': 'Separator added',
    'delete-separator': 'Separator deleted',
    'assign-date': 'Date assigned',
    'clear-date': 'Date unlinked',
    'bulk-delete': 'Items deleted',
    'reorder': 'Items reordered',
    'reorder-drag': 'Items reordered by drag',
    'import-data': 'Data imported',
    'manage-lessons': 'Lessons reorganized',
    'description-edit': 'Description edited',
    'undo': 'Last action undone',
    'redo': 'Last action restored',
    'export-data': 'Backup exported',
};

export const opLabel = (op: string, locale: AppLocale = 'fr'): string => {
    const labels = locale === 'ar' ? OP_LABELS_AR : locale === 'en' ? OP_LABELS_EN : OP_LABELS;
    return labels[op] || OP_LABELS[op] || op;
};

export const readJournal = (classId: string): JournalEntry[] => {
    try {
        const raw = localStorage.getItem(key(classId));
        return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
    } catch {
        return [];
    }
};

export const appendJournal = (classId: string, op: string): void => {
    if (op === 'initial-load' || op === 'initial') return; // pas une action utilisateur
    try {
        const entries = readJournal(classId);
        entries.unshift({ op, at: new Date().toISOString() });
        localStorage.setItem(key(classId), JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    } catch {
        // stockage plein : le journal est un confort, jamais bloquant
    }
};

export const timeAgo = (iso: string, locale: AppLocale = 'fr'): string => {
    const then = new Date(iso).getTime();
    const copy = locale === 'ar'
        ? { unknown: 'تاريخ غير معروف', now: 'الآن', minutes: (n: number) => `منذ ${n} د`, hours: (n: number) => `منذ ${n} س`, days: (n: number) => `منذ ${n} ي` }
        : locale === 'en'
            ? { unknown: 'unknown date', now: 'just now', minutes: (n: number) => `${n} min ago`, hours: (n: number) => `${n} h ago`, days: (n: number) => `${n} d ago` }
            : { unknown: 'date inconnue', now: "à l'instant", minutes: (n: number) => `il y a ${n} min`, hours: (n: number) => `il y a ${n} h`, days: (n: number) => `il y a ${n} j` };
    if (Number.isNaN(then)) return copy.unknown;
    const minutes = Math.floor((Date.now() - then) / 60_000);
    if (minutes < 1) return copy.now;
    if (minutes < 60) return copy.minutes(minutes);
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return copy.hours(hours);
    const days = Math.floor(hours / 24);
    if (days < 30) return copy.days(days);
    const localeCode = locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-FR';
    return new Date(iso).toLocaleDateString(localeCode);
};
