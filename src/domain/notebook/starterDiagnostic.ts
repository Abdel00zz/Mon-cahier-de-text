import type { AppLocale, LessonsData, TopLevelItem } from '@/types';

/*
 * LE DIAGNOSTIC DE DÉPART — une règle de DÉCISION, pas un automatisme.
 *
 *  - Programme existant (prédéfini, import JSON, import de la direction) : le
 *    cahier contient des chapitres ; il commence par son évaluation
 *    diagnostique, comme le veut la progression officielle.
 *  - Contenu personnel (le professeur refuse le programme proposé et écrit son
 *    premier chapitre, ou part d'un cahier vierge) : sa décision est respectée,
 *    AUCUN diagnostic n'est imposé. Il peut toujours en créer un lui-même.
 *
 * Un diagnostic déjà présent n'est jamais déplacé ni renommé : supprimer le
 * diagnostic doit tenir.
 */

const DIAGNOSTIC_BASE_TITLES: Record<AppLocale, string> = {
    fr: 'Évaluation diagnostique',
    en: 'Diagnostic assessment',
    ar: 'التقويم التشخيصي',
};

const diagnosticTitle = (locale: AppLocale, number: number): string =>
    `${DIAGNOSTIC_BASE_TITLES[locale]} ${number}`;

/** Titre automatique (« Évaluation diagnostique » ou « … 1 ») : un titre renommé n'est plus générique. */
const isGenericDiagnosticTitle = (title: string): boolean => {
    const trimmed = title.trim();
    if (!trimmed) return true;
    return Object.values(DIAGNOSTIC_BASE_TITLES)
        .some(base => trimmed === base || new RegExp(`^${base}\\s+[0-9٠-٩]+$`).test(trimmed));
};

export const createStarterDiagnostic = (locale: AppLocale): TopLevelItem => ({
    type: 'evaluation_diagnostic',
    title: diagnosticTitle(locale, 1),
    sections: [],
    _tempId: crypto.randomUUID(),
});

const isPristineDiagnostic = (item: LessonsData[number] | undefined): boolean =>
    !!item
    && item.type === 'evaluation_diagnostic'
    && isGenericDiagnosticTitle(item.title ?? '')
    && !item.date
    && !item.remark
    && (!item.sections || item.sections.length === 0)
    && (!item.items || item.items.length === 0);

/** Le diagnostic initial seul ne compte pas encore comme un cahier renseigné. */
export const hasOnlyPristineStarterDiagnostic = (lessons: LessonsData): boolean =>
    lessons.length === 1 && isPristineDiagnostic(lessons[0]);

/**
 * Premier contenu PERSONNEL d'un ancien cahier qui n'avait que le diagnostic
 * vierge posé automatiquement : on retire ce gabarit, le professeur n'a rien
 * demandé. Un diagnostic daté, renommé ou rempli reste en place.
 */
export const withoutPristineStarterDiagnostic = (lessons: LessonsData): LessonsData => {
    const index = lessons.findIndex(item => isPristineDiagnostic(item));
    if (index === -1 || lessons.filter(item => item.type === 'evaluation_diagnostic').length !== 1) return lessons;
    return lessons.filter((_, position) => position !== index);
};

/**
 * Programme existant : garantit le diagnostic de départ en tête, une seule
 * fois. Un cahier sans chapitre (vierge, ou seulement des lignes libres) n'en
 * reçoit pas — c'est le professeur qui décide.
 */
export const withStarterDiagnostic = (lessons: LessonsData, locale: AppLocale): LessonsData =>
    lessons.some(item => item.type === 'evaluation_diagnostic') || !lessons.some(item => item.type === 'chapter')
        ? lessons
        : [createStarterDiagnostic(locale), ...lessons];
