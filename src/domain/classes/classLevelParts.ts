import type { Cycle } from '../../types';
import { normalizeOfficialClassName } from '../../constants/class-levels.js';

/**
 * Décomposition d'un nom de classe officiel en identité structurée.
 *
 * `ClassInfo` porte trois champs d'identité — `level` (palier), `branch`
 * (filière) et `group` (numéro) — en plus du nom affiché. Plusieurs circuits
 * s'appuient dessus : les plans officiels de devoirs comparent `plan.classe` à
 * `level` et `plan.branche` à `branch` (`domain/evaluations/assessments.ts`), la
 * liaison de progression compare `level`/`branch` avant d'écrire
 * (`components/curriculum/CurriculumLinkView.tsx`). Ce module est la seule
 * fabrique de ces trois champs, pour que la direction et le professeur créent
 * exactement la même forme de données.
 */

/**
 * Palier porté par chaque famille de niveaux officiels.
 *
 * Les intitulés sont ceux de `public/planning-devoirs.json` (`plan.classe`) :
 * « Tronc Commun », « 1er Bac », « 2ème Bac ». C'est le rapprochement exact que
 * recherche `findPlanFor`, et il ne dépend d'aucune traduction d'interface.
 */
const LEVEL_PALIERS: ReadonlyArray<{ cycle: Cycle; palier: string }> = [
    { cycle: 'prepa', palier: '1re année' },
    { cycle: 'prepa', palier: '2e année' },
    { cycle: 'lycee', palier: 'Tronc Commun' },
    { cycle: 'lycee', palier: '1er Bac' },
    { cycle: 'lycee', palier: '2ème Bac' },
];

export interface ClassLevelParts {
    /** Palier pédagogique : « 2ème Bac », « 1re année », « 3AC ». */
    level: string;
    /** Filière du palier : « Sciences Mathématiques A », « MPSI » ; vide au collège. */
    branch: string;
}

/**
 * « 2ème Bac Sciences Mathématiques A » → { level: "2ème Bac", branch: "Sciences Mathématiques A" }.
 * Au collège, le niveau EST le palier (« 1AC ») et la filière reste vide ;
 * un niveau non reconnu n'est jamais découpé au hasard : il devient le palier.
 */
export const classLevelPartsFor = (cycle: Cycle, level: string): ClassLevelParts => {
    const official = normalizeOfficialClassName(level).trim().replace(/\s+/g, ' ');
    if (!official) return { level: '', branch: '' };
    const palier = LEVEL_PALIERS
        .find(item => item.cycle === cycle && official.startsWith(`${item.palier} `))
        ?.palier;
    if (!palier) return { level: official, branch: '' };
    return { level: palier, branch: official.slice(palier.length).trim() };
};
