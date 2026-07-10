/**
 * Horaires officiels indicatifs (MEN Maroc) — collège & lycée.
 * Source : grilles ministérielles (réforme 2016 collège ; note 43/2006 lycée).
 *
 * IMPORTANT : ces valeurs ne servent qu'à AIDER et ORIENTER le prof (repère
 * doux quand l'emploi du temps saisi s'écarte de l'officiel). Elles ne
 * contraignent jamais un choix : « en principe c'est l'officiel », mais les
 * établissements varient — la donnée reste indicative et surchargeable.
 */

type Cycle = 'college' | 'lycee' | 'prepa' | undefined;

/** matière normalisée en clé interne */
type SubjectKey =
  | 'maths' | 'pc' | 'svt' | 'francais' | 'arabe' | 'anglais'
  | 'philo' | 'hg' | 'eco' | 'islamique' | 'eps' | 'info';

/** filière lycée détectée depuis le nom de la classe */
type Filiere = 'tc' | 'sm' | 'pc' | 'svt' | 'eco' | 'lettres' | 'tech';

const SUBJECT_LABEL: Record<SubjectKey, string> = {
  maths: 'Maths', pc: 'Physique-Chimie', svt: 'SVT', francais: 'Français',
  arabe: 'Arabe', anglais: 'Anglais', philo: 'Philosophie', hg: 'Histoire-Géo',
  eco: 'Économie', islamique: 'Éduc. islamique', eps: 'EPS', info: 'Informatique',
};

const FILIERE_LABEL: Record<Filiere, string> = {
  tc: 'Tronc commun', sm: 'Sciences Maths', pc: 'Sciences Physiques',
  svt: 'SVT', eco: 'Sciences Éco', lettres: 'Lettres / SH', tech: 'Filière technique',
};

/** Reconnait la matière du prof (tolérant aux variantes d'écriture). */
const normalizeSubject = (subject: string): SubjectKey | null => {
  const s = (subject || '').toLowerCase();
  if (!s) return null;
  // EPS avant « physique » (pour ne pas confondre « éducation physique » et physique-chimie)
  if (/sportive|\beps\b/.test(s)) return 'eps';
  if (/math/.test(s)) return 'maths';
  if (/physique|chimie|phys/.test(s)) return 'pc';
  if (/svt|sciences? de la vie|sciences? naturelles|vie et de la terre/.test(s)) return 'svt';
  if (/fran[cç]ais/.test(s)) return 'francais';
  if (/arabe|عرب/.test(s)) return 'arabe';
  if (/anglais|english/.test(s)) return 'anglais';
  if (/philo/.test(s)) return 'philo';
  if (/histoire|g[ée]ograph|sociales/.test(s)) return 'hg';
  if (/[ée]conom|gestion|\bses\b|comptab/.test(s)) return 'eco';
  if (/islam/.test(s)) return 'islamique';
  if (/informatique|\binfo\b/.test(s)) return 'info';
  return null;
};

/** Devine la filière lycée depuis le nom de classe (null si incertain → pas de repère). */
const detectFiliere = (className: string): Filiere | null => {
  const n = (className || '').toLowerCase();
  if (/tronc commun|\btc\b|seconde|\b2\s?(nde|de)\b/.test(n)) return 'tc';
  if (/\bsm\b|sciences?\s?math|sc\.?\s?math/.test(n)) return 'sm';
  if (/\bpc\b|sciences?\s?physiques?|sc\.?\s?phys/.test(n)) return 'pc';
  if (/\bsvt\b|\bsve\b|sciences?\s?de la vie|sc\.?\s?vie|\bsx\b/.test(n)) return 'svt';
  if (/\bse\b|\bseg\b|\bsgc\b|[ée]conom|gestion/.test(n)) return 'eco';
  if (/lettre|adab|\blsh\b|sciences?\s?humaines|\bsh\b/.test(n)) return 'lettres';
  if (/\bstm\b|\bste\b|technolog|industriel|\bsti\b/.test(n)) return 'tech';
  return null;
};

// Collège : mêmes horaires sur les 3 années (Maths/Français/Arabe 6 h ; SVT/PC 2 h…).
const COLLEGE: Partial<Record<SubjectKey, number>> = {
  maths: 6, francais: 6, arabe: 6, islamique: 2, hg: 3, svt: 2, pc: 2, eps: 3, info: 1,
};

// Lycée : par filière (valeurs 1ʳᵉ, représentatives du cycle bac).
const LYCEE: Record<Filiere, Partial<Record<SubjectKey, number>>> = {
  tc:      { maths: 5, pc: 2, svt: 2, arabe: 5, francais: 4, anglais: 4, hg: 4, islamique: 2, eps: 2, info: 1 },
  sm:      { maths: 7, pc: 6, svt: 2, arabe: 2, francais: 4, anglais: 3, philo: 2, islamique: 2, eps: 2 },
  pc:      { maths: 5, pc: 6, svt: 4, arabe: 2, francais: 4, anglais: 3, philo: 2, islamique: 2, eps: 2 },
  svt:     { maths: 5, pc: 4, svt: 4, arabe: 2, francais: 4, anglais: 3, philo: 2, islamique: 2, eps: 2 },
  eco:     { maths: 4, eco: 4, arabe: 2, anglais: 2, philo: 2, hg: 2, islamique: 2, eps: 2 },
  lettres: { maths: 2, arabe: 5, francais: 5, anglais: 4, philo: 2, hg: 4, islamique: 2, eps: 2 },
  tech:    { maths: 5, pc: 4, arabe: 2, francais: 4, anglais: 3, philo: 2, islamique: 2, eps: 2 },
};

export interface OfficialHours {
  /** heures hebdomadaires officielles indicatives */
  hours: number;
  /** contexte lisible (ex. « Sciences Maths · Maths ») */
  context: string;
}

/**
 * Horaire hebdomadaire officiel indicatif pour (cycle, classe, matière).
 * Renvoie `null` si inconnu (matière non reconnue, filière lycée indétectable,
 * prépa…) → dans ce cas, aucun repère n'est affiché.
 */
export const getOfficialWeeklyHours = (
  cycle: Cycle,
  className: string,
  subject: string,
): OfficialHours | null => {
  const subj = normalizeSubject(subject);
  if (!subj) return null;

  if (cycle === 'college') {
    const h = COLLEGE[subj];
    return h != null ? { hours: h, context: `Collège · ${SUBJECT_LABEL[subj]}` } : null;
  }

  if (cycle === 'lycee') {
    const fil = detectFiliere(className);
    if (!fil) return null;
    const h = LYCEE[fil][subj];
    return h != null ? { hours: h, context: `${FILIERE_LABEL[fil]} · ${SUBJECT_LABEL[subj]}` } : null;
  }

  return null; // prépa / cycle inconnu : pas de repère officiel
};
