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

/**
 * Sigle affiché dans la pastille. Trois à quatre lettres, sans point final
 * (invisible à 7 px, mais encombrant), sans ambiguïté entre voisins :
 * EX = exemple, EXO = exercice. Le nom complet reste dans l'info-bulle,
 * et la couleur de famille distingue déjà notions / résultats / pratique.
 */
export const BADGE_TEXT_MAP: { [key: string]: string } = {
  'définition': 'DÉF',
  'théorème': 'THM',
  'proposition': 'PROP',
  'lemme': 'LEM',
  'corollaire': 'COR',
  'remarque': 'REM',
  'preuve': 'DÉM',
  'exemple': 'EX',
  'exercice': 'EXO',
  'activité': 'ACT',
  'application': 'APP',
  'introduction': 'INTRO',
  'observation': 'OBS',
  'comparaison': 'COMP',
  'classification': 'CLASS',
  'structure': 'STRUCT',
  'fonction': 'FONC',
  'mécanisme': 'MÉCA',
  'processus': 'PROC',
  'méthode': 'MÉTH',
  'expérience': 'EXP',
  'interprétation': 'INTERP',
  'conclusion': 'CONCL',
  'propriété': 'PROPR',
  'grandeur': 'GRAND',
  'relation': 'REL',
  'loi': 'LOI',
  'principe': 'PRINC',
  'protocole': 'PROTO',
  'modèle': 'MOD',
  'sécurité': 'SÉC'
};

// Palette éditoriale désaturée : le fond et le texte restent
// dans la même famille, avec un filet discret. Les valeurs hexadécimales sont
// explicites pour conserver le rendu souhaité dans l'éditeur, quel que soit
// le thème Tailwind actif.
const BADGE_BLUE = 'bg-[#f0f4f8] text-[#365574] dark:bg-[#243342] dark:text-[#bfd4e8]';
const BADGE_NEUTRAL = 'bg-[#f3f1ed] text-[#605a50] dark:bg-[#302e2a] dark:text-[#d8d2c6]';
const BADGE_RESULT = 'bg-[#f3eff7] text-[#665078] dark:bg-[#342b3c] dark:text-[#d6c5e4]';
const BADGE_GREEN = 'bg-[#edf4f0] text-[#375f4c] dark:bg-[#25372e] dark:text-[#bed8ca]';

/** Interne : les surfaces passent par `contentBadgeClass`, pas par la palette. */
const BADGE_COLOR_MAP: { [key: string]: string } = {
    // Bleu : notions et repères de départ (Déf.)
    'définition': BADGE_BLUE,
    'introduction': BADGE_BLUE,
    // Gris perle : démonstration et annotations neutres (Dém.)
    'preuve': BADGE_NEUTRAL,
    'remarque': BADGE_NEUTRAL,
    'méthode': BADGE_NEUTRAL,
    'protocole': BADGE_NEUTRAL,
    // Encre prune : résultats ; ambre sémantique pour les consignes de sécurité.
    'théorème': BADGE_RESULT,
    'proposition': BADGE_RESULT,
    'lemme': BADGE_RESULT,
    'corollaire': BADGE_RESULT,
    'propriété': BADGE_RESULT,
    'relation': BADGE_RESULT,
    'loi': BADGE_RESULT,
    'principe': BADGE_RESULT,
    'sécurité': 'bg-[#faf2e2] text-[#795717] dark:bg-[#3b3222] dark:text-[#e5cc98]',
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

/**
 * Forme commune des pastilles de type (Déf., Th., Ex.…).
 *
 * Le rembourrage vertical, l'arrondi et le filet intérieur sont posés
 * ici, une fois : les trois surfaces (éditeur, papier, réglages)
 * affichent ainsi exactement la même pastille, quel que soit le type.
 * Le rembourrage horizontal et la largeur minimale restent pilotés par
 * les tokens de l'éditeur (`--editor-badge-*`), pour que le tableau
 * garde une colonne de badges parfaitement alignée.
 */
export const contentBadgeClass = (type?: string): string =>
  `content-kind-badge inline-flex items-center justify-center gap-1 rounded-md border-0 px-1.5 py-[3px] font-semibold uppercase tracking-normal shadow-none ring-1 ring-inset ring-current/15 ${(type && BADGE_COLOR_MAP[normalizeContentType(type.trim())]) || 'bg-muted text-muted-foreground'}`;

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

/**
 * Code de matière affiché dans la SECONDE ligne d'une cellule d'emploi du temps.
 * Le nom complet reste dans l'info-bulle du créneau et dans le menu déroulant ;
 * ici, seule la lisibilité de la case compte (largeur mobile très contrainte).
 */
export const SUBJECT_ABBREV_MAP: Record<string, string> = {
  'Mathématiques': 'Maths',
  'Physique': 'PC',
  'Physique-Chimie': 'PC',
  'Chimie': 'Chimie',
  'SVT': 'SVT',
  'Sciences de la Vie': 'SVT',
  'Sciences de la Vie et de la Terre': 'SVT',
  'Sciences de l’Ingénieur': 'SI',
  'Économie': 'SEG',
  'Sciences Économiques et Gestion': 'SEG',
  'Informatique': 'Info',
  'Français': 'FR',
  'Arabe': 'AR',
  'Anglais': 'EN',
  'Espagnol': 'ES',
  'Allemand': 'DE',
  'Italien': 'IT',
  'Philosophie': 'Philo',
  'Histoire-Géographie': 'HG',
  'Éducation Islamique': 'Islam',
  'Éducation Physique et Sportive': 'EPS',
  'Traduction': 'Trad.',
  'Langue Amazighe': 'Amazighe',
  'Arts Appliqués': 'Arts app.',
  'Éducation Artistique': 'Arts vis.',
  'Éducation Musicale': 'Musique',
  'Sciences Agronomiques': 'Agro',
  'Sciences et Technologies Électriques': 'STE',
  'Sciences et Technologies Mécaniques': 'STM',
  'Droit': 'Droit',
  'Comptabilité et Mathématiques Financières': 'Compta',
};

/** Normalise un type importé (alias FR/EN, accents) vers la clé canonique. */
export const normalizeContentType = (type: string): string =>
  TYPE_MAP[(type || '').toLowerCase()] || type;
