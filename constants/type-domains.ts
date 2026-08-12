/* ── Domaines disciplinaires des types de contenu ───────────────────────────
 * Distingue les types de contenus (badges) selon la matière de la classe :
 * mathématiques (existant), SVT et physique-chimie. Une même classe ne voit
 * que les types pertinents pour sa matière dans les sélecteurs de type.
 */

export type ContentDomain = 'math' | 'svt' | 'physique';

export const CONTENT_TYPES_BY_DOMAIN: Record<ContentDomain, string[]> = {
  math: [
    'définition',
    'théorème',
    'proposition',
    'lemme',
    'corollaire',
    'remarque',
    'preuve',
    'exemple',
    'exercice',
    'activité',
    'application',
  ],
  svt: [
    'activité',
    'introduction',
    'définition',
    'observation',
    'comparaison',
    'classification',
    'structure',
    'fonction',
    'mécanisme',
    'processus',
    'méthode',
    'expérience',
    'interprétation',
    'conclusion',
    'application',
    'remarque',
    'exercice',
  ],
  physique: [
    'définition',
    'propriété',
    'grandeur',
    'relation',
    'loi',
    'principe',
    'observation',
    'comparaison',
    'expérience',
    'protocole',
    'interprétation',
    'conclusion',
    'méthode',
    'modèle',
    'application',
    'sécurité',
    'remarque',
    'exercice',
  ],
};

/** Résout le domaine disciplinaire depuis le libellé de matière d'une classe. */
export const resolveContentDomain = (subject: string): ContentDomain => {
  const s = (subject || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (s.includes('physique') || s.includes('chimie')) return 'physique';
  if (s.includes('svt') || s.includes('vie') || s.includes('terre') || s.includes('biologie')) return 'svt';
  return 'math';
};

/** Types de contenu proposés pour une matière donnée (repli sur les maths). */
export const getContentTypesForSubject = (subject: string): string[] =>
  CONTENT_TYPES_BY_DOMAIN[resolveContentDomain(subject)];
