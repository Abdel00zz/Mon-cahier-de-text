import { subjectKey } from './subjectScope.js';

/** Identité brute du compte : utilisée uniquement comme repli. */
export interface AccountIdentity {
    prenom?: string | null;
    nom?: string | null;
}

/**
 * Nom d'usage de l'enseignant — **source unique** de tout affichage.
 *
 * Le nom saisi dans « Profil » fait foi : c'est celui que le professeur utilise
 * en classe et sur ses documents. Il doit donc être le même partout (barre
 * d'onglets, zone de déconnexion, message d'accueil, en-tête du cahier,
 * impression, fiche de la direction). L'identité du compte (nom et prénom de
 * l'inscription) ne sert que de repli, tant que le profil n'a pas été renseigné.
 *
 * Corollaire : changer le nom dans les paramètres se propage seul à tous ces
 * écrans, sans qu'aucun d'eux n'ait à connaître l'autre.
 */
export const teacherDisplayName = (
    profileName: string | null | undefined,
    account?: AccountIdentity | null,
): string => {
    const profile = profileName?.trim();
    if (profile) return profile;
    return `${account?.prenom ?? ''} ${account?.nom ?? ''}`.trim();
};

/**
 * Matières déclarées dans le profil : espaces, casse et accents neutralisés,
 * doublons supprimés, ordre alphabétique stable.
 *
 * Elles suivent l'enseignant jusque dans la fiche de la direction, y compris
 * quand aucune classe ne les porte encore : la direction voit ce que le
 * professeur a déclaré enseigner, pas seulement ce qu'il a déjà saisi.
 */
export const teacherDeclaredSubjects = (subjects?: ReadonlyArray<string> | null): string[] => {
    const unique = new Map<string, string>();
    for (const subject of subjects ?? []) {
        const value = subject?.trim();
        if (value && !unique.has(subjectKey(value))) unique.set(subjectKey(value), value);
    }
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, 'fr'));
};
