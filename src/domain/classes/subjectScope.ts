import { SUBJECT_ABBREV_MAP } from '../../constants/type-keys';
import { formatLocalizedSubjectDisplayName, SUBJECTS } from '../../constants/subjects';
import { toDisplayText } from '../../lib/text/textValue';

/** Vue minimale d'une classe : de quoi lire sa matière et son enseignant. */
interface SubjectScopeClass {
    subject?: unknown;
    teacherName?: unknown;
}

const stripNormalize = (input: unknown): string => toDisplayText(input)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');

const CANONICAL_SUBJECT_BY_ALIAS: ReadonlyMap<string, string> = (() => {
    const map = new Map<string, string>();
    for (const canonical of SUBJECTS) {
        const key = stripNormalize(canonical);
        map.set(key, key);
        for (const locale of ['fr', 'ar', 'en'] as const) {
            map.set(stripNormalize(formatLocalizedSubjectDisplayName(canonical, locale)), key);
        }
        const abbrev = SUBJECT_ABBREV_MAP[canonical];
        if (abbrev) map.set(stripNormalize(abbrev), key);
    }
    for (const [alias, abbrev] of Object.entries(SUBJECT_ABBREV_MAP)) {
        const target = map.get(stripNormalize(abbrev)) ?? stripNormalize(alias);
        map.set(stripNormalize(alias), target);
    }
    return map;
})();

/** Clé de comparaison d'une matière : synonymes FR/AR/EN, abréviations, accents, casse et espaces neutralisés. */
export const subjectKey = (input: unknown): string => {
    const norm = stripNormalize(input);
    return CANONICAL_SUBJECT_BY_ALIAS.get(norm) ?? norm;
};

/** Clé d'un nom d'enseignant : espaces multiples et casse neutralisés. */
const teacherKey = (input: unknown): string => toDisplayText(input).trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');

/**
 * Matières réellement portées par les classes, dans l'ordre alphabétique.
 *
 * - la matière d'une classe est la vérité de ce qui est enseigné : une matière
 *   déclarée mais portée par aucune classe n'apprend rien à distinguer ;
 * - les classes sans nom d'enseignant restent visibles (repli historique) ;
 * - quand un nom d'enseignant est fourni, seules ses classes comptent, comme
 *   pour le filtre du tableau de bord ;
 * - si `selectedSubjects` est fourni et contient une seule matière déclarée par
 *   l'enseignant dans son profil, toute classe non renseignée ou variante de
 *   cette matière s'aligne sur ce périmètre.
 *
 * Sert aussi bien au filtre du tableau de bord qu'à la règle d'affichage
 * ci-dessous : une seule implémentation, donc une seule vérité.
 */
export const collectTeacherSubjects = (
    classes: ReadonlyArray<SubjectScopeClass>,
    teacherName?: string | null,
    selectedSubjects?: ReadonlyArray<string> | null,
): string[] => {
    const currentTeacher = toDisplayText(teacherName).trim() ? teacherKey(teacherName) : '';
    const matching = currentTeacher
        ? classes.filter(classInfo => teacherKey(classInfo.teacherName ?? '') === currentTeacher)
        : [];
    const scoped = matching.length > 0 ? matching : classes;

    const active = new Map<string, string>();
    for (const classInfo of scoped) {
        const subject = toDisplayText(classInfo.subject).trim();
        const key = subjectKey(subject);
        if (subject && key && !active.has(key)) active.set(key, subject);
    }

    const taught = Array.from(active.values()).sort((a, b) => a.localeCompare(b, 'fr'));
    if (!selectedSubjects) return taught;

    const configuredKeys = new Set(
        selectedSubjects
            .filter((s): s is string => Boolean(s?.trim()))
            .map(subjectKey),
    );
    if (configuredKeys.size === 0) return taught;
    const declared = taught.filter(subject => configuredKeys.has(subjectKey(subject)));
    return declared.length > 0 ? declared : taught;
};

/**
 * Règle unique de l'application : **une seule matière ne se distingue de rien**.
 * Ses libellés et badges sont donc masqués partout — emploi du temps, liste des
 * classes, feuille d'évaluations, devoirs, filtre du tableau de bord — car ils
 * répéteraient la même information dans chaque élément. Dès **deux** matières,
 * on affiche comme avant, pour que l'enseignant les distingue d'un coup d'œil.
 *
 * Les champs de saisie (création de classe, réglages) ne sont jamais concernés :
 * ils servent à déclarer les matières, pas à les distinguer.
 */
export const teachesSeveralSubjects = (
    classes: ReadonlyArray<SubjectScopeClass>,
    teacherName?: string | null,
    selectedSubjects?: ReadonlyArray<string> | null,
): boolean => collectTeacherSubjects(classes, teacherName, selectedSubjects).length >= 2;
