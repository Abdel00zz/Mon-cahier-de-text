import { formatLocalizedClassDisplayName, lookupClassLevelIdentity } from '../../constants/class-levels';
import { detectTextDirection } from '../../lib/text/textDirection';

/*
 * EN-TÊTE D'UNE FEUILLE DE DEVOIR — ce qui s'écrit en haut de la page.
 *
 * À gauche (à droite en arabe) : le titre de l'élément, « Devoir surveillé 2 ».
 * À l'autre bord : la classe. Le même en-tête sert l'aperçu, l'impression A5 et la
 * relecture de la direction, pour que ce que l'on voit soit ce qui sort de
 * l'imprimante.
 *
 * La langue de l'en-tête s'harmonise avec la langue du texte rédigé (source du document)
 * et non avec la langue de l'interface : un document écrit en français reçoit
 * « Devoir maison » ou « Devoir surveillé » même si l'interface est en arabe,
 * et un document écrit en arabe reçoit « الفرض المنزلي » ou « فرض محروس ».
 *
 * Un document qui s'ouvre déjà par son propre titre (`# Devoir surveillé 2`)
 * le répète en grand, centré : l'en-tête ne le redit pas, il garde la classe. La
 * comparaison ignore casse, accents, ponctuation et « n° ».
 *
 * Module pur : aucune dépendance à React.
 */

const comparable = (value: string): string => value
  .normalize('NFKD')
  .replace(/\p{M}/gu, '')
  .toLowerCase()
  .replace(/\bn\s*[°º.]\s*(?=\d)/gu, '')
  .replace(/[^\p{L}\p{N}]+/gu, '');

/** Texte du premier titre (`#`, `##`, `###`) quand il ouvre le document, sinon `null`. */
const openingHeading = (source: string): string | null => {
  for (const line of source.split(/\r?\n/)) {
    const text = line.trim();
    if (!text) continue;
    return text.match(/^#{1,3}[ \t]+(\S.*)$/)?.[1] ?? null;
  }
  return null;
};

/*
 * Le rôle d'un devoir maison (« assigné aux élèves ») distingue son entrée de celle de sa correction dans
 * la liste ; sur la feuille, il n'ajoute rien : « Devoir à la maison 1 » suffit. Le numéro reste en place.
 */
const ASSIGNED_TO_STUDENTS = [
  /\s*assign[ée]e?s?\s+aux\s+[ée]l[èe]ves/giu,
  /\s*assigned\s+to\s+(?:the\s+)?students/giu,
  /\s*ال[مـ][\u064B-\u065F]*و[\u064B-\u065F]*ك[\u064B-\u065F]*ل[\u064B-\u065F]*\s+(?:إلى|الى)\s+التلاميذ/gu,
];

/** Titre de l'élément tel qu'il s'écrit en en-tête : sans la mention « assigné aux élèves ». */
const sheetTitleOf = (title: string): string =>
  ASSIGNED_TO_STUDENTS.reduce((text, pattern) => text.replace(pattern, ''), title).replace(/\s{2,}/g, ' ').trim();

interface TitlePattern {
  ar: string;
  fr: string;
  match: RegExp;
}

const TITLE_PATTERNS: readonly TitlePattern[] = [
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

const extractOrdinal = (raw: string): string | null => {
  const match = raw.match(/(?:رقم|n[°o.]?|#)?\s*([0-9\u0660-\u0669\u06F0-\u06F9]+)\s*$/iu);
  if (!match) return null;
  return match[1]
    .replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, digit => String(digit.charCodeAt(0) - 0x06F0));
};

const NON_CLASS_BODY_LINE = /^(?:#{1,3}[ \t]|(?:[0-9\u0660-\u0669\u06F0-\u06F9]+[.)]|[-+])[ \t]|\\(?:begin|end|item)\b|\$\$|<\/?(?:ol|ul|li)\b)/i;

const isHeaderClassLine = (candidate: string, followingLine: string | undefined): boolean => {
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  if (NON_CLASS_BODY_LINE.test(trimmed) || /\[\[[^\]]+\]\]|\\bareme\{/.test(trimmed)) return false;
  if (lookupClassLevelIdentity(trimmed) !== null) return true;
  if (followingLine === undefined) return true;
  const nextTrimmed = followingLine.trim();
  return nextTrimmed === '' || /^#{1,3}[ \t]/.test(nextTrimmed);
};

interface RawOpeningHeaderSplit {
  hasOpeningHeading: boolean;
  heading?: string;
  classLine?: string;
  body: string;
}

/**
 * Découpe l'éventuel bloc d'en-tête en tête de `source` :
 * - Ligne 1 : `# Titre du document`
 * - Ligne 2 (optionnelle, juste sous le titre) : `Nom de la classe`
 * - Suite : corps du document (`## Exercice 1`, etc.)
 */
const splitOpeningSheetBlock = (source: string | null | undefined): RawOpeningHeaderSplit => {
  const text = source ?? '';
  if (!text.trim()) return { hasOpeningHeading: false, body: '' };
  const lines = text.split(/\r?\n/);
  let firstIdx = 0;
  while (firstIdx < lines.length && !lines[firstIdx].trim()) firstIdx += 1;
  if (firstIdx >= lines.length) return { hasOpeningHeading: false, body: '' };

  const headingMatch = lines[firstIdx].trim().match(/^#[ \t]+(\S.*)$/);
  if (!headingMatch) {
    return { hasOpeningHeading: false, body: text };
  }

  const heading = headingMatch[1].trim();
  let bodyStartIdx = firstIdx + 1;
  let classLine: string | undefined;

  if (bodyStartIdx < lines.length && isHeaderClassLine(lines[bodyStartIdx], lines[bodyStartIdx + 1])) {
    classLine = lines[bodyStartIdx].trim();
    bodyStartIdx += 1;
  }

  while (bodyStartIdx < lines.length && !lines[bodyStartIdx].trim()) {
    bodyStartIdx += 1;
  }

  return {
    hasOpeningHeading: true,
    heading,
    classLine,
    body: lines.slice(bodyStartIdx).join('\n'),
  };
};

/**
 * Détecte la direction (et donc la langue : `'ltr'` -> français, `'rtl'` -> arabe)
 * du contenu rédigé en donnant la priorité au corps du sujet (hors en-tête `# ...`
 * et hors ligne de classe), puis en se repliant sur l'ensemble du document.
 */
export const detectDocumentContentDirection = (source: string | null | undefined): 'ltr' | 'rtl' | undefined => {
  if (!source?.trim()) return undefined;
  const { body } = splitOpeningSheetBlock(source);
  if (body.trim()) {
    const bodyDir = detectTextDirection(body);
    if (bodyDir) return bodyDir;
  }
  return detectTextDirection(source) ?? undefined;
};

/**
 * Harmonise la langue de l'en-tête avec la langue du contenu rédigé :
 * si le texte du document est en français/latin (LTR), l'en-tête s'affiche en français
 * (ex: « Devoir maison 1 », « Devoir surveillé 1 ») et non en arabe (« فرض منزلي »).
 * Si le texte est en arabe (RTL), l'en-tête s'affiche en arabe.
 */
const harmonizeDocumentHeaderTitle = (title: string, source: string | null | undefined): string => {
  if (!source?.trim()) return title;
  const docDir = detectDocumentContentDirection(source);
  if (!docDir) return title;
  const titleDir = detectTextDirection(title);
  if (titleDir === docDir) return title;

  const normalized = title.normalize('NFKC').trim();
  for (const pattern of TITLE_PATTERNS) {
    if (pattern.match.test(normalized)) {
      const num = extractOrdinal(normalized);
      const base = docDir === 'ltr' ? pattern.fr : pattern.ar;
      return num ? `${base} ${num}` : base;
    }
  }
  return title;
};

/**
 * Harmonise le nom de la classe avec la langue détectée dans le contenu du document :
 * - Contenu en français (`ltr`) -> intitulé de classe en français (ex: « 2ème Bac Sciences Physiques 1 »)
 * - Contenu en arabe (`rtl`) -> intitulé de classe en arabe (ex: « قسم الثانية بكالوريا علوم فيزيائية 1 »)
 * Si l'enseignant a personnalisé le libellé dans la même écriture que le document, son texte est conservé tel quel.
 */
export const classLabelFor = (classLabel: string | null | undefined, source: string | null | undefined): string | undefined => {
  const raw = classLabel?.trim() ?? '';
  if (!raw) return undefined;
  const docDir = detectDocumentContentDirection(source);
  if (!docDir) return raw;
  const classDir = detectTextDirection(raw);
  if (classDir === docDir) return raw;
  if (lookupClassLevelIdentity(raw) !== null) {
    return formatLocalizedClassDisplayName(raw, docDir === 'rtl' ? 'ar' : 'fr');
  }
  return raw;
};

/** Titre à porter en en-tête, ou `undefined` quand le document le dit déjà lui-même. */
export const headerTitleFor = (title: string | null | undefined, source: string | null | undefined): string | undefined => {
  const raw = title ? sheetTitleOf(title.trim()) : '';
  if (!raw) return undefined;
  const wanted = harmonizeDocumentHeaderTitle(raw, source);
  if (!wanted) return undefined;
  const heading = openingHeading(source ?? '');
  if (heading !== null) {
    const key = comparable(heading);
    if (key && (key === comparable(wanted) || key === comparable(raw))) return undefined;
  }
  return wanted;
};

export interface DocumentSheetParts {
  title?: string;
  classLabel?: string;
  body: string;
  hasHeaderBlock: boolean;
}

/**
 * Extrait l'en-tête (`title`), la classe (`classLabel`) et le corps (`body`) à partir de `source`.
 * Quand `source` commence par `# Titre` (et éventuellement la ligne de classe juste en dessous),
 * ces lignes servent d'en-tête de feuille (`DocumentSheetHeader`) et sont retirées du corps
 * afin d'éviter toute répétition dans l'aperçu comme à l'impression.
 */
export const parseDocumentSheet = (
  source: string | null | undefined,
  fallbackTitle?: string | null,
  fallbackClassLabel?: string | null,
  options?: { seeded?: boolean },
): DocumentSheetParts => {
  const rawSource = source ?? '';
  const split = splitOpeningSheetBlock(rawSource);
  const effectiveProse = split.body.trim() ? split.body : rawSource;

  if (split.hasOpeningHeading) {
    const cleanHeading = split.heading ? sheetTitleOf(split.heading) : '';
    const resolvedTitle = cleanHeading
      ? harmonizeDocumentHeaderTitle(cleanHeading, effectiveProse)
      : undefined;
    const resolvedClass = split.classLine
      ? classLabelFor(split.classLine, effectiveProse)
      : options?.seeded
        ? undefined
        : classLabelFor(fallbackClassLabel, effectiveProse);
    return {
      title: resolvedTitle,
      classLabel: resolvedClass,
      body: split.body,
      hasHeaderBlock: true,
    };
  }

  if (options?.seeded) {
    return {
      title: undefined,
      classLabel: undefined,
      body: rawSource,
      hasHeaderBlock: false,
    };
  }

  return {
    title: headerTitleFor(fallbackTitle, rawSource),
    classLabel: classLabelFor(fallbackClassLabel, rawSource),
    body: rawSource,
    hasHeaderBlock: false,
  };
};

/**
 * Prépare la source affichée dans l'éditeur (« Source ») :
 * détecte d'abord la langue du contenu pour formater l'en-tête (`# Titre`) et le nom
 * de la classe dans cette langue, puis les inscrit en tête de l'éditeur afin que
 * l'enseignant puisse les voir et les modifier directement.
 */
export const seedDocumentSheetSource = (
  source: string | null | undefined,
  title: string | null | undefined,
  classLabel: string | null | undefined,
): string => {
  const rawSource = source ?? '';
  const split = splitOpeningSheetBlock(rawSource);
  const body = split.hasOpeningHeading ? split.body : rawSource.trimStart();

  const rawTitle = split.hasOpeningHeading && split.heading
    ? sheetTitleOf(split.heading)
    : title
      ? sheetTitleOf(title.trim())
      : '';
  const resolvedTitle = rawTitle
    ? (body.trim() ? harmonizeDocumentHeaderTitle(rawTitle, body) : rawTitle)
    : '';

  const rawClass = split.hasOpeningHeading
    ? (split.classLine ?? classLabel?.trim() ?? '')
    : (classLabel?.trim() ?? '');
  const resolvedClass = rawClass
    ? (body.trim() ? (classLabelFor(rawClass, body) ?? rawClass) : rawClass)
    : '';

  const headerLines: string[] = [];
  if (resolvedTitle) headerLines.push(`# ${resolvedTitle}`);
  if (resolvedClass) headerLines.push(resolvedClass);

  if (headerLines.length === 0) return rawSource;
  if (!body.trim()) return `${headerLines.join('\n')}\n\n`;
  return `${headerLines.join('\n')}\n\n${body}`;
};

/**
 * Ré-harmonise automatiquement l'en-tête (`# Titre`) et la classe en tête de l'éditeur
 * lorsque l'enseignant saisit ou colle un corps de sujet dans une autre langue
 * (ex: sujet en français sous un en-tête initial en arabe, ou inversement).
 */
export const harmonizeDocumentSheetSource = (source: string): string => {
  const split = splitOpeningSheetBlock(source);
  if (!split.hasOpeningHeading || !split.body.trim()) return source;
  const bodyDir = detectTextDirection(split.body);
  if (!bodyDir) return source;

  const currentTitle = split.heading ? sheetTitleOf(split.heading) : '';
  const nextTitle = currentTitle ? harmonizeDocumentHeaderTitle(currentTitle, split.body) : '';
  const currentClass = split.classLine ?? '';
  const nextClass = currentClass ? (classLabelFor(currentClass, split.body) ?? currentClass) : '';

  if (nextTitle === currentTitle && nextClass === currentClass) return source;

  const headerLines: string[] = [];
  if (nextTitle) headerLines.push(`# ${nextTitle}`);
  if (nextClass) headerLines.push(nextClass);
  return `${headerLines.join('\n')}\n\n${split.body}`;
};
