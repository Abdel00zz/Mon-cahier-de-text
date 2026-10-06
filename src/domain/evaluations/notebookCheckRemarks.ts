import type { PedagogicalEvent } from '@/types';

/*
 * Contrôle des cahiers → remarque de la séance.
 *
 * Un contrôle de cahiers n'est pas un devoir : il ne se range ni dans une note,
 * ni dans une date d'évaluation, et il n'ajoute AUCUN contenu au cahier. Sa
 * seule trace attendue est une annotation dans la cellule « remarque » de la
 * séance du même jour — c'est là que l'enseignant relit sa journée.
 *
 * Deux conséquences assumées :
 *  - SEUL le type `controle_cahiers` produit une annotation. Une olympiade, un
 *    soutien, un examen blanc ont leur propre carte et leur propre date : les
 *    inscrire dans la remarque d'une séance serait du bruit ;
 *  - l'indexation se fait par DATE, jamais par identifiant de devoir : une
 *    activité étalée sur deux jours annote les deux séances concernées.
 *
 * Module pur : aucun React, aucune traduction en dur. Le texte est composé par
 * l'appelant, qui seul connaît la langue et le séparateur de liste.
 */

/** Le seul type d'activité qui s'écrit dans la remarque d'une séance. */
export const REMARK_EVENT_TYPE = 'controle_cahiers';

/** Nombre d'élèves cités avant le résumé « +N ». */
export const REMARK_NAME_LIMIT = 3;

/** Borné pour qu'une date de fin fautive ne fasse pas boucler l'indexation. */
const MAX_SPAN_DAYS = 31;

export interface NotebookCheckRemark {
    eventId: string;
    /** titre saisi par le professeur (affiché quand aucun élève n'est consigné) */
    title: string;
    /** élèves consignés, dans l'ordre de saisie */
    names: string[];
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const nextDay = (iso: string): string => {
    const [year, month, day] = iso.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    return next.toISOString().slice(0, 10);
};

/** Le format ne suffit pas : 2026-13-40 ressemble à une date, n'en est pas une. */
const isIsoDate = (iso: string | undefined): iso is string => {
    if (typeof iso !== 'string' || !ISO.test(iso)) return false;
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === iso;
};

/** Dates couvertes par une activité : de `date` à `endDate` (incluses). */
export const coveredDates = (event: PedagogicalEvent): string[] => {
    const start = event.date;
    if (!isIsoDate(start)) return [];
    const end = isIsoDate(event.endDate) && event.endDate > start ? event.endDate : null;
    if (!end) return [start];
    const dates = [start];
    let cursor = start;
    while (cursor < end && dates.length < MAX_SPAN_DAYS) {
        cursor = nextDay(cursor);
        dates.push(cursor);
    }
    return dates;
};

/**
 * Contrôles des cahiers indexés par date. Un contrôle sans élève consigné
 * compte quand même : la séance a bien été consacrée à la vérification des
 * cahiers, c'est une information pédagogique.
 */
export const buildNotebookCheckRemarks = (
    events: readonly PedagogicalEvent[] | undefined,
): Map<string, NotebookCheckRemark> => {
    const byDate = new Map<string, NotebookCheckRemark>();
    for (const event of events ?? []) {
        if (event?.type !== REMARK_EVENT_TYPE) continue;
        const names = (event.students?.names ?? []).filter(name => name.trim().length > 0);
        const remark: NotebookCheckRemark = {
            eventId: event.id,
            title: event.title?.trim() || '',
            names,
        };
        for (const date of coveredDates(event)) {
            // Le premier contrôle posé sur une date gagne : deux activités le
            // même jour ne doivent pas se remplacer l'une l'autre.
            if (!byDate.has(date)) byDate.set(date, remark);
        }
    }
    return byDate;
};

/**
 * Texte de l'annotation. Les noms sont cités jusqu'à `REMARK_NAME_LIMIT`, puis
 * résumés — une cellule de remarque mesure quelques centimètres de large.
 */
export const notebookCheckRemarkText = (
    remark: NotebookCheckRemark,
    translate: (key: string, values?: Record<string, string | number>) => string,
    separator: string,
): string => {
    if (remark.names.length === 0) return remark.title;
    const shown = remark.names.slice(0, REMARK_NAME_LIMIT).join(separator);
    const remaining = remark.names.length - REMARK_NAME_LIMIT;
    return remaining > 0
        ? translate('remark.checkNamesMore', { names: shown, more: remaining })
        : translate('remark.checkNames', { names: shown });
};
