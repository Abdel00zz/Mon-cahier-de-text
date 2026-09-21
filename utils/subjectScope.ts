import type { ClassInfo } from '../types.js';

/**
 * L'enseignant couvre-t-il plusieurs matières ?
 *
 * Sert à décider si les libellés de matière sont utiles dans les cases d'emploi
 * du temps : avec **une seule** matière, ils répéteraient la même ligne dans
 * toute la grille et voleraient la hauteur du nom de classe.
 *
 * On considère ensemble les matières des classes déjà créées et celles
 * déclarées à la configuration : une matière déclarée mais pas encore
 * planifiée compte quand même (l'enseignant l'enseigne).
 */
export const teachesSeveralSubjects = (
    classes: ReadonlyArray<Pick<ClassInfo, 'subject'>>,
    declaredSubjects?: ReadonlyArray<string> | null,
): boolean => {
    const subjects = new Set<string>();
    for (const item of classes) if (item.subject) subjects.add(item.subject);
    for (const subject of declaredSubjects ?? []) if (subject) subjects.add(subject);
    return subjects.size > 1;
};
