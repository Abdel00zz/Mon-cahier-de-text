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
 * Place le diagnostic en tête d'un contenu prédéfini ou importé. Un diagnostic
 * déjà présent est conservé et simplement remonté : aucun doublon n'est créé.
 * Les titres génériques (avec ou sans numéro) sont renumérotés dans l'ordre ;
 * les titres personnalisés sont préservés.
 */
export const withStarterDiagnostic = (lessons: LessonsData, locale: AppLocale): LessonsData => {
    const baseTitles = Object.values(DIAGNOSTIC_BASE_TITLES);
    const isGenericDiagnosticTitle = (title: string): boolean => {
        const trimmed = title.trim();
        if (!trimmed) return true;
        // « Évaluation diagnostique », « Évaluation diagnostique 1 », etc.
        return baseTitles.some(base => trimmed === base || trimmed.startsWith(`${base} `));
    };

    const diagnostics = lessons
        .filter(item => item.type === 'evaluation_diagnostic')
        .map((item, index) => {
            const currentTitle = item.title?.trim() ?? '';
            return isGenericDiagnosticTitle(currentTitle)
                ? { ...item, title: diagnosticTitle(locale, index + 1) }
                : item;
        });
    const remaining = lessons.filter(item => item.type !== 'evaluation_diagnostic');

    return diagnostics.length > 0
        ? [...diagnostics, ...remaining]
        : [createStarterDiagnostic(locale), ...remaining];
};
