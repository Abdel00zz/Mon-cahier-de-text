import type { AppLocale, ContentDirection, LessonsData } from '../../types';
import { migrateLessonsData } from '../../domain/notebook/dataUtils';
import { contentLocaleFromDirection, defaultContentDirection, detectContentDirection, readStoredContentDirection } from '../../domain/notebook/contentDirection';
import { withStarterDiagnostic } from '../../domain/notebook/starterDiagnostic';

export interface InitialNotebook {
    lessons: LessonsData;
    direction: ContentDirection;
    /**
     * Une correction doit être persistée : diagnostic de départ ajouté, ou
     * direction déduite du contenu alors que le cahier n'en portait aucune.
     */
    repaired: boolean;
}

/** Clé du cahier d'une classe. Un changement de compte purge ces clés, donc la
 * lecture synchrone ne peut jamais servir le cahier d'un autre enseignant. */
export const notebookStorageKey = (classId: string): string => `classData_v1_${classId}`;

/**
 * Lit le cahier stocké **de façon synchrone**, pour que le premier rendu
 * contienne déjà les lignes : plus aucun squelette entre l'ouverture d'une
 * classe et son tableau.
 *
 * Rend `null` quand le contenu est illisible : l'appelant retombe alors sur le
 * chargement différé et son écran d'attente, au lieu d'afficher un cahier vide
 * qui écraserait des données récupérables.
 */
export const readInitialNotebook = (options: {
    classId: string;
    locale: AppLocale;
    storage?: Pick<Storage, 'getItem'>;
}): InitialNotebook | null => {
    const storage = options.storage ?? localStorage;
    try {
        const raw = storage.getItem(notebookStorageKey(options.classId));
        const savedData = raw ? JSON.parse(raw) : [];
        const lessons = Array.isArray(savedData) ? savedData : (savedData.lessonsData ?? []);
        const migratedLessons = migrateLessonsData(lessons);
        // Les anciens cahiers (simple tableau) sont analysés une fois ; les
        // nouveaux gardent une décision explicite dans le même instantané.
        const fallback = defaultContentDirection(options.locale);
        const storedDirection = readStoredContentDirection(savedData);
        const direction = storedDirection ?? detectContentDirection(lessons, fallback).direction;
        // Un cahier VIERGE reçoit son diagnostic de départ ; un cahier qui a du
        // contenu est pris tel quel : supprimer le diagnostic doit tenir.
        const normalizedLessons = migratedLessons.length === 0
            ? withStarterDiagnostic(migratedLessons, contentLocaleFromDirection(direction))
            : migratedLessons;
        // Un cahier sans direction enregistrée est DÉDUIT de son contenu (et non de
        // la langue de l'interface) : un cahier latin s'ouvre ainsi de gauche à
        // droite même dans une interface arabe. La déduction est persistée, comme
        // le diagnostic de départ, pour ne plus dépendre d'une détection refaite
        // sur chaque appareil. `readStoredContentDirection` peut rendre `null` ou
        // `undefined` : on teste l'absence, pas une valeur précise.
        const repaired = normalizedLessons !== migratedLessons || !storedDirection;
        return { lessons: normalizedLessons, direction, repaired };
    } catch {
        return null;
    }
};
