/* ── Mappings de types de contenu (sans dépendance React) ───────────────────
 * Ces maps sont volontairement « pures » : elles n'importent ni React ni
 * icônes, afin d'être consommables aussi bien par le front (badges, listes)
 * que par le pipeline d'import JSON (côté navigateur ET fonctions cloud).
 */

export const TYPE_MAP: { [key: string]: string } = {
  'definition': 'définition', 'définition': 'définition',
  'theorem': 'théorème', 'théorème': 'théorème', 'theoreme': 'théorème',
  'proposition': 'proposition', 'prop': 'proposition',
  'lemma': 'lemme', 'lemme': 'lemme',
  'corollary': 'corollaire', 'corollaire': 'corollaire', 'corol': 'corollaire',
  'remark': 'remarque', 'remarque': 'remarque', 'rem': 'remarque',
  'proof': 'preuve', 'preuve': 'preuve',
  'example': 'exemple', 'exemple': 'exemple', 'ex': 'exemple',
  'exercise': 'exercice', 'exercice': 'exercice', 'exo': 'exercice',
  'activity': 'activité', 'activité': 'activité', 'activite': 'activité', 'act': 'activité',
  'application': 'application', 'app': 'application',
  // SVT & Physique (communs)
  'observation': 'observation', 'obs': 'observation',
  'comparaison': 'comparaison', 'comparison': 'comparaison', 'comp': 'comparaison',
  'experience': 'expérience', 'expérience': 'expérience', 'exp': 'expérience',
  'interpretation': 'interprétation', 'interprétation': 'interprétation', 'interp': 'interprétation',
  'conclusion': 'conclusion', 'concl': 'conclusion',
  'methode': 'méthode', 'méthode': 'méthode', 'method': 'méthode',
  // SVT
  'introduction': 'introduction', 'intro': 'introduction',
  'classification': 'classification', 'classif': 'classification',
  'structure': 'structure', 'struct': 'structure',
  'fonction': 'fonction', 'function': 'fonction', 'fonc': 'fonction',
  'mecanisme': 'mécanisme', 'mécanisme': 'mécanisme', 'mechanism': 'mécanisme',
  'processus': 'processus', 'process': 'processus', 'proc': 'processus',
  // Physique
  'propriete': 'propriété', 'propriété': 'propriété', 'property': 'propriété', 'propr': 'propriété',
  'grandeur': 'grandeur', 'quantity': 'grandeur', 'grand': 'grandeur',
  'relation': 'relation', 'rel': 'relation',
  'loi': 'loi', 'law': 'loi',
  'principe': 'principe', 'principle': 'principe', 'princ': 'principe',
  'protocole': 'protocole', 'protocol': 'protocole', 'proto': 'protocole',
  'modele': 'modèle', 'modèle': 'modèle', 'model': 'modèle', 'mod': 'modèle',
  'securite': 'sécurité', 'sécurité': 'sécurité', 'safety': 'sécurité', 'sec': 'sécurité'
};

export const BADGE_TEXT_MAP: { [key: string]: string } = {
  'définition': 'Déf.',
  'théorème': 'Th.',
  'proposition': 'Prop.',
  'lemme': 'Lem.',
  'corollaire': 'Cor.',
  'remarque': 'Rem.',
  'preuve': 'Prv.',
  'exemple': 'Ex.',
  'exercice': 'Exo.',
  'activité': 'Act.',
  'application': 'Appli.',
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

// Palette pro et simple : 5 teintes sémantiques à tonalité uniforme
// (-50 / -700 / -200), au lieu d'un arc-en-ciel de pastels. Le libellé du
// badge porte la distinction fine ; la couleur indique la catégorie.
export const BADGE_COLOR_MAP: { [key: string]: string } = {
    // Concepts & logique — bleu
    'définition': 'bg-blue-50 text-blue-700 border-blue-200',
    'théorème': 'bg-blue-50 text-blue-700 border-blue-200',
    'proposition': 'bg-blue-50 text-blue-700 border-blue-200',
    'lemme': 'bg-blue-50 text-blue-700 border-blue-200',
    'corollaire': 'bg-blue-50 text-blue-700 border-blue-200',
    'preuve': 'bg-blue-50 text-blue-700 border-blue-200',
    'propriété': 'bg-blue-50 text-blue-700 border-blue-200',
    'relation': 'bg-blue-50 text-blue-700 border-blue-200',
    'loi': 'bg-blue-50 text-blue-700 border-blue-200',
    'principe': 'bg-blue-50 text-blue-700 border-blue-200',
    'modèle': 'bg-blue-50 text-blue-700 border-blue-200',
    'grandeur': 'bg-blue-50 text-blue-700 border-blue-200',
    // Pratique & application — vert
    'exemple': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'exercice': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'activité': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'application': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'expérience': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'méthode': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'protocole': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    // Observation & analyse — ambre
    'observation': 'bg-amber-50 text-amber-700 border-amber-200',
    'comparaison': 'bg-amber-50 text-amber-700 border-amber-200',
    'classification': 'bg-amber-50 text-amber-700 border-amber-200',
    'interprétation': 'bg-amber-50 text-amber-700 border-amber-200',
    'conclusion': 'bg-amber-50 text-amber-700 border-amber-200',
    'introduction': 'bg-amber-50 text-amber-700 border-amber-200',
    'structure': 'bg-amber-50 text-amber-700 border-amber-200',
    'fonction': 'bg-amber-50 text-amber-700 border-amber-200',
    'mécanisme': 'bg-amber-50 text-amber-700 border-amber-200',
    'processus': 'bg-amber-50 text-amber-700 border-amber-200',
    // Note & sécurité — neutre / alerte
    'remarque': 'bg-slate-50 text-slate-700 border-slate-200',
    'sécurité': 'bg-rose-50 text-rose-700 border-rose-200',
};

export const BADGE_TOOLTIP_MAP: { [key: string]: string } = {
  'activité': 'Activité',
  'définition': 'Définition',
  'théorème': 'Théorème',
  'proposition': 'Proposition',
  'lemme': 'Lemme',
  'corollaire': 'Corollaire',
  'remarque': 'Remarque',
  'preuve': 'Preuve',
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
  'sécurité': 'Sécurité',
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
