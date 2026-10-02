import type { AppLocale, LessonsData, TopLevelItem } from '@/types';

const DIAGNOSTIC_BASE_TITLES: Record<AppLocale, string> = {
    fr: 'Évaluation diagnostique',
    en: 'Diagnostic assessment',
    ar: 'التقويم التشخيصي',
};

const diagnosticTitle = (locale: AppLocale, number: number): string =>
    `${DIAGNOSTIC_BASE_TITLES[locale]} ${number}`;

const isGenericDiagnosticTitle = (title: string): boolean => {
    const trimmed = title.trim();
    if (!trimmed) return true;
    return Object.values(DIAGNOSTIC_BASE_TITLES)
        .some(base => trimmed === base || trimmed.startsWith(`${base} `));
};

export const createStarterDiagnostic = (locale: AppLocale): TopLevelItem => ({
    type: 'evaluation_diagnostic',
    title: diagnosticTitle(locale, 1),
    sections: [],
    _tempId: crypto.randomUUID(),
});

/** Le diagnostic initial seul ne compte pas encore comme un cahier renseigné. */
export const hasOnlyPristineStarterDiagnostic = (lessons: LessonsData): boolean => {
    if (lessons.length !== 1) return false;
    const [item] = lessons;
    return item.type === 'evaluation_diagnostic'
        && isGenericDiagnosticTitle(item.title ?? '')
        && !item.date
        && !item.remark
        && (!item.sections || item.sections.length === 0)
        && (!item.items || item.items.length === 0);
};

/**
 * Garantit qu'un diagnostic initial existe, sans jamais toucher à celui du
 * professeur. Un diagnostic déjà présent est LAISSÉ EXACTEMENT À SA PLACE :
 * c'est une ligne du cahier comme une autre, déplaçable dans tous les sens et
 * renommable librement. Seule la création (aucun diagnostic dans le cahier)
 * ajoute un point de départ en tête.
 */
export const withStarterDiagnostic = (lessons: LessonsData, locale: AppLocale): LessonsData =>
    lessons.some(item => item.type === 'evaluation_diagnostic')
        ? lessons
        : [createStarterDiagnostic(locale), ...lessons];
