/* ── Mappings de types de contenu (sans dépendance React) ───────────────────
 * Ces maps sont volontairement « pures » : elles n'importent ni React ni
 * icônes, afin d'être consommables aussi bien par le front (badges, listes)
 * que par le pipeline d'import JSON (côté navigateur ET fonctions cloud).
 */

export const TYPE_MAP: { [key: string]: string } = {
  'definition': 'définition', 'définition': 'définition', 'def': 'définition', 'déf': 'définition',
  'theorem': 'théorème', 'théorème': 'théorème', 'theoreme': 'théorème', 'th': 'théorème',
  'proposition': 'proposition', 'prop': 'proposition',
  'lemma': 'lemme', 'lemme': 'lemme', 'lem': 'lemme',
  'corollary': 'corollaire', 'corollaire': 'corollaire', 'corol': 'corollaire', 'cor': 'corollaire',
  'remark': 'remarque', 'remarque': 'remarque', 'rem': 'remarque',
  'proof': 'preuve', 'preuve': 'preuve', 'prv': 'preuve', 'dem': 'preuve', 'dém': 'preuve', 'demonstration': 'preuve', 'démonstration': 'preuve',
  'example': 'exemple', 'exemple': 'exemple', 'ex': 'exemple',
  'exercise': 'exercice', 'exercice': 'exercice', 'exo': 'exercice',
  'activity': 'activité', 'activité': 'activité', 'activite': 'activité', 'act': 'activité',
  'application': 'application', 'app': 'application', 'appli': 'application',
  // SVT & Physique (communs)
  'observation': 'observation', 'obs': 'observation',
  'comparaison': 'comparaison', 'comparison': 'comparaison', 'comp': 'comparaison',
  'experience': 'expérience', 'expérience': 'expérience', 'exp': 'expérience',
  'interpretation': 'interprétation', 'interprétation': 'interprétation', 'interp': 'interprétation',
  'conclusion': 'conclusion', 'concl': 'conclusion',
  'methode': 'méthode', 'méthode': 'méthode', 'method': 'méthode', 'meth': 'méthode', 'méth': 'méthode',
  // SVT
  'introduction': 'introduction', 'intro': 'introduction',
  'classification': 'classification', 'classif': 'classification',
  'structure': 'structure', 'struct': 'structure',
  'fonction': 'fonction', 'function': 'fonction', 'fonc': 'fonction',
  'mecanisme': 'mécanisme', 'mécanisme': 'mécanisme', 'mechanism': 'mécanisme', 'mec': 'mécanisme', 'méc': 'mécanisme',
  'processus': 'processus', 'process': 'processus', 'proc': 'processus',
  // Physique
  'propriete': 'propriété', 'propriété': 'propriété', 'property': 'propriété', 'propr': 'propriété', 'proprio': 'propriété',
  'grandeur': 'grandeur', 'quantity': 'grandeur', 'grand': 'grandeur',
  'relation': 'relation', 'rel': 'relation',
  'loi': 'loi', 'law': 'loi',
  'principe': 'principe', 'principle': 'principe', 'princ': 'principe',
  'protocole': 'protocole', 'protocol': 'protocole', 'proto': 'protocole',
  'modele': 'modèle', 'modèle': 'modèle', 'model': 'modèle', 'mod': 'modèle',
  'securite': 'sécurité', 'sécurité': 'sécurité', 'safety': 'sécurité', 'sec': 'sécurité', 'séc': 'sécurité'
};

export const BADGE_TEXT_MAP: { [key: string]: string } = {
  'définition': 'Déf.',
  'théorème': 'Th.',
  'proposition': 'Prop.',
  'lemme': 'Lem.',
  'corollaire': 'Cor.',
  'remarque': 'Rem.',
  'preuve': 'Dém.',
  'exemple': 'Ex.',
  'exercice': 'Exo.',
  'activité': 'Act.',
  'application': 'App.',
  'introduction': 'Intro.',
  'observation': 'Obs.',
  'comparaison': 'Comp.',
  'classification': 'Classif.',
  'structure': 'Struct.',
  'fonction': 'Fonc.',
  'mécanisme': 'Méc.',
  'processus': 'Proc.',
  'méthode': 'Méth.',
  'expérience': 'Exp.',
  'interprétation': 'Interp.',
  'conclusion': 'Concl.',
  'propriété': 'Propr.',
  'grandeur': 'Grand.',
  'relation': 'Rel.',
  'loi': 'Loi',
  'principe': 'Princ.',
  'protocole': 'Proto.',
  'modèle': 'Mod.',
  'sécurité': 'Séc.'
};

// Palette Material You volontairement courte : le fond et le texte restent
// dans la même famille, sans bordure dure. Les valeurs hexadécimales sont
// explicites pour conserver le rendu souhaité dans l'éditeur, quel que soit
// le thème Tailwind actif.
const BADGE_BLUE = 'bg-[#e8f0fe] text-[#1967d2] dark:bg-[#1967d2]/25 dark:text-[#a8c7fa]';
const BADGE_NEUTRAL = 'bg-[#f1f3f4] text-[#3c4043] dark:bg-[#3c4043] dark:text-[#e8eaed]';
const BADGE_RED = 'bg-[#fce8e6] text-[#c5221f] dark:bg-[#c5221f]/25 dark:text-[#f28b82]';
const BADGE_GREEN = 'bg-[#e6f4ea] text-[#137333] dark:bg-[#137333]/25 dark:text-[#81c995]';

export const BADGE_COLOR_MAP: { [key: string]: string } = {
    // Bleu : notions et repères de départ (Déf.)
    'définition': BADGE_BLUE,
    'introduction': BADGE_BLUE,
    // Gris perle : démonstration et annotations neutres (Dém.)
    'preuve': BADGE_NEUTRAL,
    'remarque': BADGE_NEUTRAL,
    'méthode': BADGE_NEUTRAL,
    'protocole': BADGE_NEUTRAL,
    // Rouge rosé : résultats, propriétés et relations
    'théorème': BADGE_RED,
    'proposition': BADGE_RED,
    'lemme': BADGE_RED,
    'corollaire': BADGE_RED,
    'propriété': BADGE_RED,
    'relation': BADGE_RED,
    'loi': BADGE_RED,
    'principe': BADGE_RED,
    'sécurité': BADGE_RED,
    // Vert menthe : exemples, activité et mise en pratique (Act./App.)
    'activité': BADGE_GREEN,
    'application': BADGE_GREEN,
    'exemple': BADGE_GREEN,
    'exercice': BADGE_GREEN,
    'expérience': BADGE_GREEN,
    'observation': BADGE_GREEN,
    'comparaison': BADGE_GREEN,
    'classification': BADGE_GREEN,
    'interprétation': BADGE_GREEN,
    'conclusion': BADGE_GREEN,
    'structure': BADGE_GREEN,
    'fonction': BADGE_GREEN,
    'mécanisme': BADGE_GREEN,
    'processus': BADGE_GREEN,
    'modèle': BADGE_GREEN,
    'grandeur': BADGE_GREEN,
};

export const BADGE_TOOLTIP_MAP: { [key: string]: string } = {
  'activité': 'Activité (recherche / découverte)',
  'définition': 'Définition',
  'théorème': 'Théorème',
  'proposition': 'Proposition',
  'lemme': 'Lemme',
  'corollaire': 'Corollaire',
  'remarque': 'Remarque',
  'preuve': 'Démonstration / Preuve',
  'exemple': 'Exemple',
  'exercice': 'Exercice',
  'application': "Exercice d'application",
  'introduction': 'Introduction',
  'observation': 'Observation',
  'comparaison': 'Comparaison',
  'classification': 'Classification',
  'structure': 'Structure',
  'fonction': 'Fonction',
  'mécanisme': 'Mécanisme',
  'processus': 'Processus',
  'méthode': 'Méthode',
  'expérience': 'Expérience',
  'interprétation': 'Interprétation',
  'conclusion': 'Conclusion',
  'propriété': 'Propriété',
  'grandeur': 'Grandeur',
  'relation': 'Relation',
  'loi': 'Loi',
  'principe': 'Principe',
  'protocole': 'Protocole',
  'modèle': 'Modèle',
  'sécurité': 'Consigne de sécurité',
};

export const SUBJECT_ABBREV_MAP: Record<string, string> = {
  'Mathématiques': 'Mathématiques',
  'Physique': 'Physique',
  'Économie': 'Économie',
  'Français': 'Français',
  'SVT': 'SVT',
  'Sciences de la Vie': 'SVT',
  'Sciences de la Vie et de la Terre': 'SVT',
};

/** Normalise un type importé (alias FR/EN, accents) vers la clé canonique. */
export const normalizeContentType = (type: string): string =>
  TYPE_MAP[(type || '').toLowerCase()] || type;
