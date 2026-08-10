import type { AppLocale, LessonsData, TopLevelItem } from '@/types';

const DIAGNOSTIC_BASE_TITLES: Record<AppLocale, string> = {
    fr: 'Évaluation diagnostique',
    en: 'Diagnostic assessment',
    ar: 'التقويم التشخيصي',
};

const diagnosticTitle = (locale: AppLocale, number: number): string =>
    `${DIAGNOSTIC_BASE_TITLES[locale]} ${number}`;

export const createStarterDiagnostic = (locale: AppLocale): TopLevelItem => ({
    type: 'evaluation_diagnostic',
    title: diagnosticTitle(locale, 1),
    sections: [],
    _tempId: crypto.randomUUID(),
});

/**
 * Place le diagnostic en tête d'un contenu prédéfini. Un diagnostic déjà
 * fourni est conservé et simplement remonté : aucun doublon n'est créé.
 */
export const withStarterDiagnostic = (lessons: LessonsData, locale: AppLocale): LessonsData => {
    const genericTitles = new Set(Object.values(DIAGNOSTIC_BASE_TITLES));
    const diagnostics = lessons
        .filter(item => item.type === 'evaluation_diagnostic')
        .map((item, index) => {
            const currentTitle = item.title?.trim();
            return !currentTitle || genericTitles.has(currentTitle)
                ? { ...item, title: diagnosticTitle(locale, index + 1) }
                : item;
        });
    const remaining = lessons.filter(item => item.type !== 'evaluation_diagnostic');
    return diagnostics.length > 0
        ? [...diagnostics, ...remaining]
        : [createStarterDiagnostic(locale), ...remaining];
};
