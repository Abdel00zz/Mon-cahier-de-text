export const MONTHS_LIST: { m: number; fr: string; ar: string; en: string }[] = [
  { m: 9, fr: 'Sept', ar: 'شتنبر', en: 'Sep' },
  { m: 10, fr: 'Oct', ar: 'أكتوبر', en: 'Oct' },
  { m: 11, fr: 'Nov', ar: 'نونبر', en: 'Nov' },
  { m: 12, fr: 'Déc', ar: 'دجنبر', en: 'Dec' },
  { m: 1, fr: 'Janv', ar: 'يناير', en: 'Jan' },
  { m: 2, fr: 'Févr', ar: 'فبراير', en: 'Feb' },
  { m: 3, fr: 'Mars', ar: 'مارس', en: 'Mar' },
  { m: 4, fr: 'Avr', ar: 'أبريل', en: 'Apr' },
  { m: 5, fr: 'Mai', ar: 'ماي', en: 'May' },
  { m: 6, fr: 'Juin', ar: 'يونيو', en: 'Jun' },
  { m: 7, fr: 'Juil', ar: 'يوليوز', en: 'Jul' },
];

/** Semaine du lundi au dimanche ; en arabe, la grille se lit de droite à gauche. */
export const WEEKDAYS = {
  fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  ar: ['إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت', 'أحد'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Conversion locale à midi : évite tout décalage de date lié au fuseau horaire ou à l'heure d'été. */
export const isoToLocalDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y || 2026, (m || 9) - 1, d || 1, 12, 0, 0, 0);
};

export const localDateToIso = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;


export const endOfMonthIso = (value: string): string => {
  const parts = value.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
};

