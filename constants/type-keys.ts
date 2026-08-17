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

// Palette harmonique et contrastée (WCAG AA) :
// Chaque grande famille d'items possède une identité visuelle distincte
// avec fond pastel doux (-50 / -100), bordure fine (-200 / -300) et texte contrasté (-700 / -800).
export const BADGE_COLOR_MAP: { [key: string]: string } = {
    // Fondements & Résultats majeurs (Rose / Corail)
    'théorème': 'bg-rose-50 text-rose-700 border-rose-200 shadow-2xs',
    // Notions & Concepts (Bleu royal)
    'définition': 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs',
    // Résultats dérivés & Théorie (Violet / Indigo / Pourpre)
    'proposition': 'bg-violet-50 text-violet-700 border-violet-200 shadow-2xs',
    'lemme': 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs',
    'corollaire': 'bg-purple-50 text-purple-700 border-purple-200 shadow-2xs',
    // Rigueur & Démonstrations (Ardoise neutre structuré)
    'preuve': 'bg-slate-100 text-slate-700 border-slate-300 shadow-2xs',
    // Lois, Principes & Propriétés (Azur / Ciel)
    'propriété': 'bg-sky-50 text-sky-700 border-sky-200 shadow-2xs',
    'relation': 'bg-sky-50 text-sky-700 border-sky-200 shadow-2xs',
    'loi': 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs',
    'principe': 'bg-sky-50 text-sky-700 border-sky-200 shadow-2xs',
    'modèle': 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs',
    'grandeur': 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs',
    // Pratique, Découverte & Application (Émeraude / Vert)
    'activité': 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs',
    'application': 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs',
    'expérience': 'bg-cyan-50 text-cyan-700 border-cyan-200 shadow-2xs',
    // Entraînement & Exemples (Ambre / Orange chaud)
    'exemple': 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs',
    'exercice': 'bg-amber-50 text-amber-800 border-amber-200 shadow-2xs',
    // Méthodologie & Protocoles (Sarcelle / Teal)
    'méthode': 'bg-teal-50 text-teal-700 border-teal-200 shadow-2xs',
    'protocole': 'bg-teal-50 text-teal-700 border-teal-200 shadow-2xs',
    // Démarche scientifique, Observation & Analyse (Ambre doux)
    'observation': 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs',
    'comparaison': 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs',
    'classification': 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs',
    'interprétation': 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs',
    'conclusion': 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs',
    'introduction': 'bg-sky-50 text-sky-700 border-sky-200 shadow-2xs',
    'structure': 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs',
    'fonction': 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs',
    'mécanisme': 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs',
    'processus': 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs',
    // Notes & Vigilance (Gris zinc / Rose alerte)
    'remarque': 'bg-zinc-100 text-zinc-700 border-zinc-200 shadow-2xs',
    'sécurité': 'bg-rose-100 text-rose-800 border-rose-300 font-bold shadow-2xs',
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
