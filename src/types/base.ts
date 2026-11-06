// Types primitifs partagés par tous les domaines.
export type Cycle = 'college' | 'lycee' | 'prepa';
export type AppLocale = 'fr' | 'en' | 'ar';
/** Sens de lecture propre au contenu d'un cahier, indépendant de la langue de l'interface. */
export type ContentDirection = 'ltr' | 'rtl';
/** Explicit setup choice; absent on legacy notebooks whose origin is unknown. */
export type NotebookContentOrigin = 'personal' | 'predefined' | 'imported';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Densité de texte de l'interface.
 *
 * C'est le SEUL réglage typographique exposé au professeur : la police est
 * déterminée par la langue (DM Sans / Rubik en latin, Arabswell 3 / Maghribi
 * Font 3 en arabe) et n'est plus un choix utilisateur.
 */
export type AppTextSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Portée du compteur de contenus (voir `utils/contentNumbering.ts`).
 * `chapter` : « définition 1 » repart de 1 dans chaque chapitre.
 */
export interface ContentNumbering {
    /** Affiche « Définition 1 », « Exemple 2 »… (compteur par chapitre). */
    enabled: boolean;
    structureStyle?: 'legacy' | 'decimal' | 'roman';
    badgeStyle?: 'decimal' | 'roman' | 'hierarchical';
    scope?: 'chapter' | 'section' | 'document';
}
