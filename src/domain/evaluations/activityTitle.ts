import type { AppLocale } from '@/types';
import { translateLocaleMessage } from '../../i18n/messages';

/*
 * LE TITRE D'UNE ACTIVITÉ, DANS LA LANGUE DE L'ÉCRAN.
 *
 * Un titre généré (« Évaluation diagnostique 1 », « Diagnostic assessment », « التقويم التشخيصي ») est
 * enregistré tel quel dans le cahier, dans la langue du moment. Dans la liste des activités il se dit
 * dans la langue COURANTE : « تقويم تشخيصي 1 » en arabe, « Évaluation diagnostique 1 » en français —
 * jamais deux langues sur une même ligne. Un titre écrit par le professeur n'est jamais touché.
 */

const LOCALES: readonly AppLocale[] = ['fr', 'en', 'ar'];

/** Intitulés générés par d'autres chemins que les libellés de l'écran (diagnostic de départ, synchronisation). */
const GENERATED_BASES: Readonly<Record<string, readonly string[]>> = {
  evaluation_diagnostic: ['التقويم التشخيصي', 'Evaluation diagnostique'],
  correction_controle_continu: ['تصحيح الفرض المحروس'],
  controle_cahiers: ['Contrôle des cahiers', 'Controle des cahiers', 'مراقبة الدفاتر', 'Notebook check', 'Cahiers vérifiés'],
  remediation: ['Remédiation', 'Remediation', 'معالجة التعثرات', 'معالجة'],
  soutien: ['Soutien', 'Support', 'دعم تربوي', 'دعم'],
  rattrapage: ['Rattrapage', 'Make-up', 'حصة استدراك', 'حصّة استدراك', 'استدراك'],
};

const ARABIC_INDIC = /[\u0660-\u0669]/g;
const EXTENDED_ARABIC_INDIC = /[\u06F0-\u06F9]/g;
const latinDigits = (value: string): string => value
  .replace(ARABIC_INDIC, digit => String(digit.charCodeAt(0) - 0x0660))
  .replace(EXTENDED_ARABIC_INDIC, digit => String(digit.charCodeAt(0) - 0x06F0));

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** « Évaluation diagnostique1 », « diagnostic assessment 2 », « التقويم التشخيصي ١ » : base générée + numéro facultatif. */
export function localizedActivityTitle(title: string | undefined, type: string, locale: AppLocale | ((key: string) => string)): string {
  const label = typeof locale === 'function' ? locale(`evaluations.event.${type}`) : translateLocaleMessage(locale, `evaluations.event.${type}`);
  const text = (title ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!text) return label;
  const bases = [...LOCALES.map(code => translateLocaleMessage(code, `evaluations.event.${type}`)), ...(GENERATED_BASES[type] ?? [])];
  for (const base of bases) {
    const match = new RegExp(`^${escapeRegExp(base)}\\s*([0-9\u0660-\u0669\u06F0-\u06F9]+)?$`, 'iu').exec(text);
    if (match) return match[1] ? `${label} ${latinDigits(match[1])}` : label;
  }
  return text;
}
