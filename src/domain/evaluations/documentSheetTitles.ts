/** Retire la mention « assigné aux élèves » du titre affiché. */
const ASSIGNED_TO_STUDENTS = [
  /\s*assign[ée]e?s?\s+aux\s+[ée]l[èe]ves/giu,
  /\s*assigned\s+to\s+(?:the\s+)?students/giu,
  /\s*ال[مـ][\u064B-\u065F]*و[\u064B-\u065F]*ك[\u064B-\u065F]*ل[\u064B-\u065F]*\s+(?:إلى|الى)\s+التلاميذ/gu,
];

/** Titre de l'élément tel qu'il s'écrit en en-tête : sans la mention « assigné aux élèves ». */
export const sheetTitleOf = (title: string): string =>
  ASSIGNED_TO_STUDENTS.reduce((text, pattern) => text.replace(pattern, ''), title).replace(/\s{2,}/g, ' ').trim();

interface TitlePattern {
  ar: string;
  fr: string;
  match: RegExp;
}

export const TITLE_PATTERNS: readonly TitlePattern[] = [
  // Correction devoir maison
  {
    ar: 'تصحيح الفرض المنزلي',
    fr: 'Correction du devoir maison',
    match: /^(?:تصحيح\s+الفرض\s+المنزلي|تصحيح\s+فرض\s+منزلي|correction\s+(?:du\s+)?devoir\s+(?:à\s+la\s+|a\s+la\s+)?maison|homework\s+(?:correction|\d+\s+correction))/iu,
  },
  // Correction devoir surveillé
  {
    ar: 'تصحيح الفرض المحروس',
    fr: 'Correction du devoir surveillé',
    match: /^(?:تصحيح\s+الفرض\s+المحروس|تصحيح\s+فرض\s+محروس|correction\s+(?:du\s+)?devoir\s+surveill[ée]|supervised\s+test\s+correction)/iu,
  },
  // Devoir maison
  {
    ar: 'الفرض المنزلي',
    fr: 'Devoir maison',
    match: /^(?:الفرض\s+المنزلي|فرض\s+منزلي|واجب\s+منزلي|devoir\s+(?:à\s+la\s+|a\s+la\s+)?maison|devoir\s+maison|\bdm\b|homework)/iu,
  },
  // Devoir surveillé
  {
    ar: 'فرض محروس',
    fr: 'Devoir surveillé',
    match: /^(?:فرض\s+محروس|الفرض\s+المحروس|devoir\s+surveill[ée]|\bds\b|supervised\s+test)/iu,
  },
  // Devoir écrit court
  {
    ar: 'فرض كتابي قصير محروس',
    fr: 'Devoir écrit court',
    match: /^(?:فرض\s+كتابي\s+قصير(?:\s+محروس)?|devoir\s+[ée]crit\s+court|short\s+written\s+test)/iu,
  },
  // Devoir écrit global
  {
    ar: 'فرض كتابي إجمالي محروس',
    fr: 'Devoir écrit global',
    match: /^(?:فرض\s+كتابي\s+إجمالي(?:\s+محروس)?|فرض\s+كتابي\s+اجمالي(?:\s+محروس)?|devoir\s+[ée]crit\s+global|global\s+written\s+test)/iu,
  },
  // Évaluation diagnostique
  {
    ar: 'التقويم التشخيصي',
    fr: 'Évaluation diagnostique',
    match: /^(?:التقويم\s+التشخيصي|تقويم\s+تشخيصي|[ée]valuation\s+diagnostique|diagnostic\s+assessment)/iu,
  },
  // Examen blanc
  {
    ar: 'امتحان تجريبي',
    fr: 'Examen blanc',
    match: /^(?:امتحان\s+تجريبي|examen\s+blanc|mock\s+exam)/iu,
  },
  // Olympiade
  {
    ar: 'أولمبياد',
    fr: 'Olympiade',
    match: /^(?:أولمبياد|اولمبياد|olympiade|olympiad)/iu,
  },
  // Concours
  {
    ar: 'مباراة',
    fr: 'Concours',
    match: /^(?:مباراة|concours|competition)/iu,
  },
  // Contrôle des cahiers
  {
    ar: 'مراقبة الدفاتر',
    fr: 'Contrôle des cahiers',
    match: /^(?:مراقبة\s+الدفاتر|فحص\s+الدفاتر|contr[ôo]le\s+des\s+cahiers|cahiers\s+v[ée]rifi[ée]s|notebook\s+check)/iu,
  },
  // Remédiation
  {
    ar: 'معالجة التعثرات',
    fr: 'Remédiation',
    match: /^(?:معالجة\s+التعثرات|معالجة|rem[ée]diation|remediation)/iu,
  },
  // Soutien
  {
    ar: 'دعم تربوي',
    fr: 'Soutien',
    match: /^(?:دعم\s+تربوي|دعم|soutien|support)/iu,
  },
  // Rattrapage
  {
    ar: 'حصة استدراك',
    fr: 'Rattrapage',
    match: /^(?:حصة\s+استدراك|حصّة\s+استدراك|استدراك|rattrapage|make-up)/iu,
  },
  // Évaluation orale
  {
    ar: 'تقويم شفهي',
    fr: 'Évaluation orale',
    match: /^(?:تقويم\s+شفهي|استجواب\s+شفهي|[ée]valuation\s+orale|interrogation\s+orale|oral\s+assessment)/iu,
  },
  // Colle
  {
    ar: 'كول',
    fr: 'Colle',
    match: /^(?:كول(?:\s*\(استجواب\s+شفهي\))?|\bكول\b|colle|kh[ôo]lle)/iu,
  },
];

export const extractOrdinal = (raw: string): string | null => {
  const match = raw.match(/(?:رقم|n[°o.]?|#)?\s*([0-9\u0660-\u0669\u06F0-\u06F9]+)\s*$/iu);
  if (!match) return null;
  return match[1]
    .replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, digit => String(digit.charCodeAt(0) - 0x06F0));
};

