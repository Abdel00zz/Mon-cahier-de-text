/**
 * Journal des actions d'édition — par classe, persistant, plafonné.
 * Alimente la ligne « Dernière modification » et la modale Historique.
 */

export interface JournalEntry {
    op: string;
    at: string; // ISO
}

const key = (classId: string) => `editJournal_v1_${classId}`;
const MAX_ENTRIES = 60;

/** Libellés français des types d'opérations de l'éditeur. */
export const OP_LABELS: Record<string, string> = {
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
};

export const opLabel = (op: string): string => OP_LABELS[op] || op;

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

export const timeAgoFr = (iso: string): string => {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '—';
    const minutes = Math.floor((Date.now() - then) / 60_000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `il y a ${days} j`;
    return new Date(iso).toLocaleDateString('fr-FR');
};
