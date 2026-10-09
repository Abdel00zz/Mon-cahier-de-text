import type { AppLocale, DevoirType, LessonsData, PedagogicalEvent, TopLevelItem } from '@/types';
import { findNotebookAssessments } from './assessmentSync';
import { buildLessonRows, type LessonRow } from '../notebook/lessonRows';
import { findItem } from '../notebook/dataUtils';
import { produce } from 'immer';
export { syncNotebookToEvaluations, syncNotebookSessionToEvaluations } from './notebookReconciliation';

/**
 * Extrait la date d'un bloc de premier niveau : sa propre date si renseignée,
 * sinon la date la plus ancienne trouvée parmi ses sous-sections ou items.
 */
export function getTopLevelBlockDate(block: TopLevelItem): string | undefined {
  if (block.date?.trim()) {
    const extracted = extractEarliestDate(block.date.trim());
    if (extracted) return extracted;
  }
  let earliest: string | undefined;

  const inspect = (item: { date?: string }) => {
    if (item.date?.trim()) {
      const d = extractEarliestDate(item.date.trim()) || item.date.trim();
      if (!earliest || d < earliest) earliest = d;
    }
  };

  block.items?.forEach(inspect);
  block.sections?.forEach(section => {
    inspect(section);
    section.items?.forEach(inspect);
    section.subsections?.forEach(sub => {
      inspect(sub);
      sub.items?.forEach(inspect);
      sub.subsubsections?.forEach(sss => {
        inspect(sss);
        sss.items?.forEach(inspect);
      });
    });
  });

  return earliest;
}

/**
 * Place ou repositionne un bloc de premier niveau à sa position chronologique
 * exacte dans le cahier de textes en fonction de sa date.
 *
 * Règle d'ordonnancement :
 * - Tous les blocs antérieurs (date <= targetDate) restent avant.
 * - Les blocs ultérieurs (date > targetDate) se placent après.
 * - Pour une évaluation diagnostique en début d'année (septembre/octobre),
 *   si aucun cours n'est antérieur, elle se pose naturellement en tête (index 0).
 */
export function placeBlockChronologically(
  lessons: LessonsData,
  block: TopLevelItem
): { lessons: LessonsData; index: number } {
  const targetDate = getTopLevelBlockDate(block);
  const copy = [...lessons];

  // Retirer le bloc de sa position actuelle s'il existe déjà
  const existingIdx = copy.findIndex(item => item === block || (block._tempId && item._tempId === block._tempId));

  let preserved = block;
  if (existingIdx >= 0) {
    const [removed] = copy.splice(existingIdx, 1);
    // Conserver les sections/items existants si le nouveau bloc est plus succinct
    preserved = {
      ...removed,
      ...block,
      sections: block.sections?.length ? block.sections : (removed.sections ?? []),
      items: block.items?.length ? block.items : (removed.items ?? []),
    };
  }

  if (!targetDate) {
    // Sans date : les diagnostics vont en tête, les autres à la fin
    const insertIdx = preserved.type === 'evaluation_diagnostic' ? 0 : copy.length;
    copy.splice(insertIdx, 0, preserved);
    return { lessons: copy, index: insertIdx };
  }

  // Trouver l'index chronologique
  // Si c'est une évaluation diagnostique et qu'aucun bloc n'a une date antérieure,
  // elle se place en tête (index 0) avant les éventuels cours non encore datés.
  if (preserved.type === 'evaluation_diagnostic') {
    const hasEarlierDate = copy.some(item => {
      const d = getTopLevelBlockDate(item);
      return Boolean(d && d <= targetDate);
    });
    if (!hasEarlierDate) {
      copy.splice(0, 0, preserved);
      return { lessons: copy, index: 0 };
    }
  }

  let targetIndex = copy.length;
  for (let i = 0; i < copy.length; i++) {
    const itemDate = getTopLevelBlockDate(copy[i]);
    if (itemDate && itemDate > targetDate) {
      targetIndex = i;
      break;
    }
  }

  copy.splice(targetIndex, 0, preserved);
  return { lessons: copy, index: targetIndex };
}

/**
 * Formate une plage de dates pour la cellule Date du cahier selon la règle pédagogique :
 * Ne produit JAMAIS de texte brut « Du XX au YY » ou « من XX إلى YY ».
 * - 1 jour : la date simple
 * - Plusieurs séances fournies (ou 2 jours) : connecteur 'et' / 'و'
 * - Plus de 2 séances : liste séparée avec connecteur final
 */
export function formatPedagogicalDateCell(
  startDate: string,
  endDate?: string,
  locale: AppLocale = 'fr',
  sessionDates?: readonly string[],
): string {
  if (sessionDates && sessionDates.length > 0) {
    if (sessionDates.length === 1) return sessionDates[0];
    const connector = locale === 'ar' ? 'و' : locale === 'en' ? 'and' : 'et';
    if (sessionDates.length === 2) {
      return `${sessionDates[0]} ${connector} ${sessionDates[1]}`;
    }
    if (locale === 'ar') {
      return sessionDates.join(' و ');
    }
    return `${sessionDates.slice(0, -1).join(', ')} ${connector} ${sessionDates[sessionDates.length - 1]}`;
  }

  if (!endDate || endDate === startDate) {
    return startDate;
  }

  // Ne produit JAMAIS « Du XX au YY » ou « من XX إلى YY » :
  // on relie les bornes de la plage par le connecteur pédagogique ('et' / 'و')
  const connector = locale === 'ar' ? 'و' : locale === 'en' ? 'and' : 'et';
  return `${startDate} ${connector} ${endDate}`;
}

/**
 * Extrait la date ISO de départ (pour le tri et le placement chronologique).
 */
export function extractEarliestDate(rawDate: string | undefined): string | undefined {
  if (!rawDate) return undefined;
  const isoMatch = rawDate.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (isoMatch) return isoMatch[0];
  const ddmmyyyyMatch = rawDate.match(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b/);
  if (ddmmyyyyMatch) {
    const parts = ddmmyyyyMatch[0].split(/[/.-]/);
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return rawDate.trim() || undefined;
}

/**
 * Extrait les dates ISO de début et de fin d'une cellule date (simple ou plage avec 'et' ou 'Du...au').
 */
export function extractDateRange(rawDate: string | undefined): { startDate?: string; endDate?: string } {
  if (!rawDate) return {};
  const isoMatches = rawDate.match(/\b\d{4}-\d{2}-\d{2}\b/g);
  if (isoMatches && isoMatches.length > 0) {
    return {
      startDate: isoMatches[0],
      endDate: isoMatches.length > 1 && isoMatches[1] !== isoMatches[0] ? isoMatches[1] : undefined,
    };
  }
  const ddmmyyyyMatches = rawDate.match(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b/g);
  if (ddmmyyyyMatches && ddmmyyyyMatches.length > 0) {
    const toIso = (s: string) => {
      const parts = s.split(/[/.-]/);
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    };
    return {
      startDate: toIso(ddmmyyyyMatches[0]),
      endDate: ddmmyyyyMatches.length > 1 && ddmmyyyyMatches[1] !== ddmmyyyyMatches[0] ? toIso(ddmmyyyyMatches[1]) : undefined,
    };
  }
  const single = extractEarliestDate(rawDate);
  return { startDate: single };
}

/**
 * Synchronise l'ajout ou la mise à jour d'un événement pédagogique
 * (ex: évaluation diagnostique, correction) dans le cahier de textes.
 * Les dates sont affectées à la CELLULE DATE avec connecteur adapté ('et' ou 'Du...au'),
 * et la cellule remarque reste réservée aux notes pédagogiques.
 */
export function syncEventToNotebook(
  lessons: LessonsData,
  event: PedagogicalEvent,
  locale: AppLocale = 'fr'
): { lessons: LessonsData; updated: boolean } {
  // Types qui doivent générer ou mettre à jour un bloc visible dans le cahier
  const isNotebookSyncable =
    event.type === 'evaluation_diagnostic' ||
    event.type === 'correction_controle_continu';

  if (!isNotebookSyncable) {
    return { lessons, updated: false };
  }

  const defaultTitles: Record<string, Record<AppLocale, string>> = {
    evaluation_diagnostic: {
      fr: 'Évaluation diagnostique',
      en: 'Diagnostic assessment',
      ar: 'التقويم التشخيصي',
    },
    correction_controle_continu: {
      fr: 'Correction du contrôle continu',
      en: 'Continuous assessment review',
      ar: 'تصحيح المراقبة المستمرة',
    },
  };

  const title =
    event.title.trim() ||
    defaultTitles[event.type]?.[locale] ||
    'Évaluation';

  // Les dates vont dans la cellule DATE, avec le connecteur adéquat
  const cellDate = formatPedagogicalDateCell(event.date, event.endDate, locale);

  // La remarque ne contient PLUS les dates : elle conserve les notes de l'enseignant
  const remark = event.note?.trim() || undefined;

  const blockToInsert: TopLevelItem = {
    type: event.type as TopLevelItem['type'],
    title,
    date: cellDate,
    remark,
    sections: [],
    items: [],
    _tempId: `event-${event.id}`,
  };

  const rows = buildLessonRows(lessons);
  const exact = rows.find(row => row.data._tempId === blockToInsert._tempId);
  const candidates = rows.filter(row => row.elementType === event.type && !row.data._tempId?.startsWith('event-')
    && ('title' in row.data && (row.data.title === title || (event.type === 'evaluation_diagnostic' && !row.data.date))));
  const target = exact ?? (candidates.length === 1 ? candidates[0] : undefined);
  if (target) {
    const next = produce(lessons, draft => {
      const { item } = findItem(draft, target.indices);
      if (item) Object.assign(item, { title, date: cellDate, remark, _tempId: blockToInsert._tempId });
    });
    return { lessons: next, updated: next !== lessons };
  }

  const { lessons: nextLessons } = placeBlockChronologically(lessons, blockToInsert);
  return { lessons: nextLessons, updated: true };
}

/**
 * Supprime le bloc correspondant à un événement pédagogique du cahier de textes.
 */
function deleteRow(lessons: LessonsData, row: LessonRow | undefined) {
  if (!row) return { lessons, updated: false };
  return { lessons: produce(lessons, draft => {
    const { parent, targetIndex } = findItem(draft, row.indices);
    if (Array.isArray(parent) && typeof targetIndex === 'number') parent.splice(targetIndex, 1);
  }), updated: true };
}

export function removeEventFromNotebook(lessons: LessonsData, eventId: string, eventType?: string, eventTitle?: string) {
  const rows = buildLessonRows(lessons);
  const exact = rows.find(row => row.data._tempId === 'event-' + eventId);
  const legacy = rows.filter(row => !row.data._tempId?.startsWith('event-') && row.elementType === eventType && 'title' in row.data && row.data.title === eventTitle);
  return deleteRow(lessons, exact ?? (legacy.length === 1 ? legacy[0] : undefined));
}

function assessmentRow(lessons: LessonsData, id: string, type: DevoirType, num?: number, entryKey?: string) {
  const rows = buildLessonRows(lessons);
  const exact = rows.find(row => row.data._tempId === 'dev-block-' + id);
  if (exact) return exact;
  if (type !== 'controle' && type !== 'maison') return undefined;
  if (entryKey) return rows.find(row => row.key === entryKey && !row.data._tempId?.startsWith('dev-block-'));
  const candidates = findNotebookAssessments(lessons).filter(entry => !entry.assessmentId && entry.type === type && entry.num === num);
  return candidates.length === 1 ? rows.find(row => row.key === candidates[0].key) : undefined;
}

export function removeAssessmentFromNotebook(lessons: LessonsData, id: string, type: DevoirType, num?: number, entryKey?: string) {
  if (type !== 'controle' && type !== 'maison') return { lessons, updated: false };
  return deleteRow(lessons, assessmentRow(lessons, id, type, num, entryKey));
}

export function syncAssessmentDateToNotebook(lessons: LessonsData, assessment: {
  id: string; type: DevoirType; num: number; dateISO: string; label?: string; clearIfEmpty?: boolean; entryKey?: string; updatedTitle?: string;
}, locale: AppLocale = 'fr'): { lessons: LessonsData; updated: boolean } {
  // Oral activities belong to the dated remark, never to a written-test block.
  if (assessment.type !== 'controle' && assessment.type !== 'maison') return { lessons, updated: false };
  const row = assessmentRow(lessons, assessment.id, assessment.type, assessment.num, assessment.entryKey);
  const date = assessment.dateISO || undefined;
  if (row) {
    const id = 'dev-block-' + assessment.id;
    if (row.data.date === date && row.data._tempId === id && !assessment.updatedTitle) return { lessons, updated: false };
    const next = produce(lessons, draft => {
      const { item } = findItem(draft, row.indices);
      if (item) { item.date = date; item._tempId = id; if (assessment.updatedTitle && 'title' in item) item.title = assessment.updatedTitle; }
    });
    // Nested assessments retain their chapter and its contents.
    return { lessons: next, updated: true };
  }
  if (!date) return { lessons, updated: false };
  const type = assessment.type === 'maison' ? 'devoir_maison' : 'controle_continu';
  const title = assessment.label || (locale === 'ar' ? (type === 'devoir_maison' ? 'فرض منزلي ' : 'مراقبة مستمرة ') : (type === 'devoir_maison' ? 'Devoir maison ' : 'Contrôle continu ')) + assessment.num;
  const block: TopLevelItem = { type, title, date, _tempId: 'dev-block-' + assessment.id };
  return { lessons: placeBlockChronologically(lessons, block).lessons, updated: true };
}
