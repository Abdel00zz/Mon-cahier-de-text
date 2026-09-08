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
        && !item.separatorAfter
        && (!item.sections || item.sections.length === 0)
        && (!item.items || item.items.length === 0);
};

/**
 * Place le diagnostic en tête d'un contenu prédéfini ou importé. Un diagnostic
 * déjà présent est conservé et simplement remonté : aucun doublon n'est créé.
 * Le premier porte toujours le titre canonique « Évaluation diagnostique 1 »
 * dans la langue du contenu. Les diagnostics suivants conservent leur place ;
 * seuls leurs titres génériques sont renumérotés.
 */
export const withStarterDiagnostic = (lessons: LessonsData, locale: AppLocale): LessonsData => {
    const firstDiagnosticIndex = lessons.findIndex(item => item.type === 'evaluation_diagnostic');
    if (firstDiagnosticIndex < 0) return [createStarterDiagnostic(locale), ...lessons];

    let changed = firstDiagnosticIndex !== 0;
    let diagnosticNumber = 1;
    const canonicalStarterTitle = diagnosticTitle(locale, 1);
    const sourceStarter = lessons[firstDiagnosticIndex];
    const starter = sourceStarter.title?.trim() === canonicalStarterTitle
        ? sourceStarter
        : { ...sourceStarter, title: canonicalStarterTitle };
    if (starter !== sourceStarter) changed = true;

    // Seul le premier diagnostic est remonté. Les éventuels diagnostics
    // suivants restent à leur place pédagogique et gardent leur contenu.
    const remaining = lessons.flatMap((item, index) => {
        if (index === firstDiagnosticIndex) return [];
        if (item.type !== 'evaluation_diagnostic') return [item];

        diagnosticNumber += 1;
        const currentTitle = item.title?.trim() ?? '';
        if (!isGenericDiagnosticTitle(currentTitle)) return [item];
        const title = diagnosticTitle(locale, diagnosticNumber);
        if (currentTitle === title) return [item];
        changed = true;
        return [{ ...item, title }];
    });

    return changed ? [starter, ...remaining] : lessons;
};
