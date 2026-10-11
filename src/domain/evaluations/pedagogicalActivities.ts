import type { AppLocale } from '../../types.js';

/*
 * CATALOGUE DES ACTIVITÉS PÉDAGOGIQUES — SOURCE UNIQUE.
 *
 * Les quatre activités « de séance » (contrôle des cahiers, remédiation,
 * soutien, rattrapage) s'écrivent dans la REMARQUE de la séance. Jusqu'ici,
 * leurs libellés et leurs synonymes vivaient uniquement dans la modale de
 * séance, dupliqués en trois langues — donc invisibles pour tout autre moteur.
 *
 * Ils vivent ici : la modale les affiche, la détection les reconnaît, et le
 * jour où la réconciliation voudra relier une remarque à une activité, elle
 * n'aura pas à réinventer une seconde liste.
 *
 * Aucune icône ici : le domaine ne connaît pas React. La modale associe
 * elle-même chaque clé à son pictogramme.
 */

/** Les quatre activités qui s'écrivent dans la remarque d'une séance. */
export type SessionActivityType = 'controle_cahiers' | 'remediation' | 'soutien' | 'rattrapage';

export interface PedagogicalActivity {
  /** Type d'événement côté évaluations (sous-ensemble de `PedagogicalEventType`). */
  type: SessionActivityType;
  /** Clé i18n du libellé long (« Contrôle des cahiers des élèves »). */
  labelKey: string;
  /** Libellé court de la pastille, par langue. */
  short: Record<AppLocale, string>;
  /** Graphies reconnues dans une remarque (l'auteur écrit ce qu'il veut). */
  synonyms: readonly string[];
}

export const PEDAGOGICAL_ACTIVITIES: readonly PedagogicalActivity[] = [
  {
    type: 'controle_cahiers',
    labelKey: 'evaluations.event.controle_cahiers',
    short: { fr: 'Contrôle des cahiers', en: 'Notebook check', ar: 'مراقبة الدفاتر' },
    synonyms: ['مراقبة دفاتر التلاميذ', 'مراقبة الدفاتر', 'Contrôle des cahiers des élèves', 'Contrôle des cahiers', 'Cahiers vérifiés'],
  },
  {
    type: 'remediation',
    labelKey: 'evaluations.event.remediation',
    short: { fr: 'Remédiation', en: 'Remediation', ar: 'معالجة التعثرات' },
    synonyms: ['معالجة التعثرات', 'معالجة', 'Remédiation', 'Remediation'],
  },
  {
    type: 'soutien',
    labelKey: 'evaluations.event.soutien',
    short: { fr: 'Soutien', en: 'Support', ar: 'دعم تربوي' },
    synonyms: ['دعم تربوي', 'دعم', 'Soutien'],
  },
  {
    type: 'rattrapage',
    labelKey: 'evaluations.event.rattrapage',
    short: { fr: 'Rattrapage', en: 'Make-up', ar: 'حصة استدراك' },
    synonyms: ['استدراك', 'حصّة استدراك', 'حصة استدراك', 'Rattrapage'],
  },
];

/**
 * Normalisation de comparaison : insensible à la casse, aux accents latins ET
 * aux diacritiques arabes (tashkeel), avec les variantes de alif et de tāʾ
 * marbūṭa ramenées à une forme unique. C'est ce qui fait que
 * « حصّة استدراك » (avec chadda) et « حصة استدراك » se reconnaissent.
 */
export const normalizeActivityText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Libellé court localisé d'une activité (repli français hors langue connue). */
export const activityShortLabel = (activity: PedagogicalActivity, locale: AppLocale): string =>
  activity.short[locale] ?? activity.short.fr;

const candidateLabels = (activity: PedagogicalActivity): string[] =>
  [activity.short.fr, activity.short.en, activity.short.ar, ...activity.synonyms]
    .filter(Boolean)
    .map(normalizeActivityText);

/**
 * Détection STRICTE : une activité est reconnue quand une LIGNE de la remarque
 * commence par son libellé (la projection écrit toujours l'activité en tête de
 * ligne). On ne cherche pas dans le corps d'une phrase : « nous révisons pour
 * le contrôle » ne doit pas devenir un « contrôle des cahiers ».
 */
export function detectRemarkActivities(remark: string | undefined): PedagogicalActivity[] {
  if (!remark) return [];
  const lines = remark.split('\n').map(normalizeActivityText).filter(Boolean);
  if (lines.length === 0) return [];
  return PEDAGOGICAL_ACTIVITIES.filter(activity => {
    const labels = candidateLabels(activity);
    return lines.some(line => labels.some(label => label.length >= 3 && line.startsWith(label)));
  });
}

/**
 * Détection SOUPLE (état d'une pastille) : le libellé apparaît n'importe où
 * dans la remarque. Sert uniquement à allumer ou éteindre le bouton ; la
 * création de données, elle, passe par la détection stricte.
 */
export function remarkHasActivity(remark: string | undefined, activity: PedagogicalActivity): boolean {
  if (!remark) return false;
  const haystack = normalizeActivityText(remark);
  return candidateLabels(activity).some(label => label.length >= 3 && haystack.includes(label));
}

/** Ajoute l'activité en tête de ligne (jamais au milieu d'une phrase existante). */
export const addActivityLine = (remark: string, line: string): string => {
  const trimmed = remark.trim();
  return trimmed ? `${trimmed}\n${line}` : line;
};

/** Retire toutes les lignes d'une activité reconnue (strictement, comme la détection). */
export function removeActivityLines(remark: string, activity: PedagogicalActivity): string {
  const labels = candidateLabels(activity);
  return remark
    .split('\n')
    .filter(line => {
      const normalized = normalizeActivityText(line);
      if (!normalized) return false;
      return !labels.some(label => normalized.startsWith(label));
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
