import { toDisplayText } from './textValue';

/** Vue minimale d'une classe : de quoi lire sa matière et son enseignant. */
interface SubjectScopeClass {
    subject?: unknown;
    teacherName?: unknown;
}

/** Clé de comparaison d'une matière : accents, casse et espaces neutralisés. */
export const subjectKey = (input: unknown): string => toDisplayText(input)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');

/** Clé d'un nom d'enseignant : espaces multiples et casse neutralisés. */
const teacherKey = (input: unknown): string => toDisplayText(input).trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');

/**
 * Matières réellement portées par les classes, dans l'ordre alphabétique.
 *
 * - la matière d'une classe est la vérité de ce qui est enseigné : une matière
 *   déclarée mais portée par aucune classe n'apprend rien à distinguer ;
 * - les classes sans nom d'enseignant restent visibles (repli historique) ;
 * - quand un nom d'enseignant est fourni, seules ses classes comptent, comme
 *   pour le filtre du tableau de bord.
 *
 * Sert aussi bien au filtre du tableau de bord qu'à la règle d'affichage
 * ci-dessous : une seule implémentation, donc une seule vérité.
 */
export const collectTeacherSubjects = (
    classes: ReadonlyArray<SubjectScopeClass>,
    teacherName?: string | null,
): string[] => {
    const currentTeacher = toDisplayText(teacherName).trim() ? teacherKey(teacherName) : '';
    const matching = currentTeacher
        ? classes.filter(classInfo => teacherKey(classInfo.teacherName ?? '') === currentTeacher)
        : [];
    const scoped = matching.length > 0 ? matching : classes;

    const active = new Map<string, string>();
    for (const classInfo of scoped) {
        // Première écriture retenue : la casse d'un libellé ne doit pas changer
        // selon l'ordre des classes ni la saisie d'un cahier plus récent.
        const subject = toDisplayText(classInfo.subject).trim();
        if (subject && !active.has(subjectKey(subject))) active.set(subjectKey(subject), subject);
    }

    return Array.from(active.values()).sort((a, b) => a.localeCompare(b, 'fr'));
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
): boolean => collectTeacherSubjects(classes, teacherName).length > 1;
