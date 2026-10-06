// Imports RELATIFS avec extension : ce module est aussi chargé par l'API, où
// l'alias `@/` n'existe pas (voir `check:api`), comme `importPipeline.ts`.
import { MAX_CONTENT_DOCUMENT_CHARS } from '../../constants/contentDocument.js';
import type { AppConfig, ContentDocument, PedagogicalEvent, PedagogicalEventType } from '../../types.js';

/*
 * Ce que la direction relit du travail écrit d'un professeur.
 *
 * Projection PURE des réglages : aucune lecture réseau, aucun accès au
 * stockage. Deux règles la gouvernent, et elles se testent :
 *
 *  - la direction LIT, elle ne modifie pas : on ne transporte que la source du
 *    document et sa date, jamais une forme éditable ;
 *  - on ne transporte pas plus que nécessaire : les documents vides ou blancs
 *    disparaissent, la taille est bornée à celle du professeur
 *    (`MAX_CONTENT_DOCUMENT_CHARS`), et la liste nominative des élèves reste
 *    dans le cahier — seule son étendue (le nombre) est publiée.
 */

/** Une activité telle que la direction la lit : sans les noms des élèves. */
export interface AdminActivityDocument {
    id: string;
    type: PedagogicalEventType;
    title: string;
    date: string;
    endDate?: string;
    note?: string;
    status: PedagogicalEvent['status'];
    /** Nombre d'élèves consignés (les noms restent dans le cahier). */
    students: number;
    /** Document rédigé, ou `null` quand il n'y en a pas. */
    document: ContentDocument | null;
}

/** Un document lu par la direction : la source et sa date, jamais autre chose. */
const pickDocument = (document: ContentDocument | undefined): ContentDocument | null => {
    const source = typeof document?.source === 'string' ? document.source.trim() : '';
    if (!source) return null;
    return {
        source: source.slice(0, MAX_CONTENT_DOCUMENT_CHARS),
        updatedAt: typeof document?.updatedAt === 'string' ? document.updatedAt : '',
    };
};

/**
 * Documents de devoirs, rangés par classe puis par devoir (officiel ou saisi à
 * la main : les réglages ne font pas la différence, la direction non plus).
 * L'identifiant historique est conservé tel quel : c'est sous cette clé que les
 * devoirs antérieurs au millésime ont été enregistrés.
 */
export const adminAssessmentDocuments = (
    settings: Partial<AppConfig> | undefined,
    classIds: readonly string[],
): Record<string, Record<string, ContentDocument>> => {
    const all = settings?.assessmentDocuments ?? {};
    const documents: Record<string, Record<string, ContentDocument>> = {};
    for (const classId of classIds) {
        const forClass = all[classId];
        if (!forClass) continue;
        const kept: Record<string, ContentDocument> = {};
        for (const [assessmentId, document] of Object.entries(forClass)) {
            const picked = pickDocument(document);
            if (picked) kept[assessmentId] = picked;
        }
        if (Object.keys(kept).length > 0) documents[classId] = kept;
    }
    return documents;
};

/** Activités pédagogiques d'une classe, dans l'ordre saisi par le professeur. */
export const adminActivities = (
    settings: Partial<AppConfig> | undefined,
    classIds: readonly string[],
): Record<string, AdminActivityDocument[]> => {
    const all = settings?.pedagogicalEvents ?? {};
    const activities: Record<string, AdminActivityDocument[]> = {};
    for (const classId of classIds) {
        const forClass = all[classId];
        if (!forClass?.length) continue;
        activities[classId] = forClass.map((event) => ({
            id: event.id,
            type: event.type,
            title: typeof event.title === 'string' ? event.title : '',
            date: event.date,
            endDate: event.endDate,
            note: event.note,
            status: event.status,
            students: event.students?.names.length ?? 0,
            document: pickDocument(event.document),
        }));
    }
    return activities;
};
