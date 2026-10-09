import type { AppConfig, AppLocale, DevoirType, LessonsData, PedagogicalEvent, TopLevelItem } from '@/types';
import { findNotebookAssessments, linkAssessments } from './assessmentSync';
import { schoolYearLabelFromDate } from '../calendar/calendar';

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
  const existingIdx = copy.findIndex(
    item =>
      (block._tempId && item._tempId === block._tempId) ||
      (item.type === block.type && item.title === block.title) ||
      (block.type === 'evaluation_diagnostic' && item.type === 'evaluation_diagnostic')
  );

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
 * - 1 jour : la date simple
 * - Exactement 2 jours : connecteur 'et' (ex: "08/09 et 09/09" ou "2026-09-08 et 2026-09-09")
 * - Plus de 2 jours : connecteur 'de XX a YY' / 'Du XX au YY' (ex: "Du 2026-09-08 au 2026-09-15")
 */
export function formatPedagogicalDateCell(
  startDate: string,
  endDate?: string,
  locale: AppLocale = 'fr'
): string {
  if (!endDate || endDate === startDate) {
    return startDate;
  }

  // Calcul du nombre de jours civils entre startDate et endDate
  const d1 = new Date(startDate);
  const d2 = new Date(endDate);
  let totalDays = 0;
  if (!Number.isNaN(d1.getTime()) && !Number.isNaN(d2.getTime())) {
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    totalDays = diffDays + 1;
  }

  // Exactement deux jours : connecteur 'et'
  if (totalDays === 2) {
    const connector = locale === 'ar' ? 'و' : locale === 'en' ? 'and' : 'et';
    return `${startDate} ${connector} ${endDate}`;
  }

  // Plus de deux jours : connecteur 'Du XX au YY' / 'من XX إلى YY'
  if (locale === 'ar') {
    return `من ${startDate} إلى ${endDate}`;
  }
  if (locale === 'en') {
    return `From ${startDate} to ${endDate}`;
  }
  return `Du ${startDate} au ${endDate}`;
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

  const { lessons: nextLessons } = placeBlockChronologically(lessons, blockToInsert);
  return { lessons: nextLessons, updated: true };
}

/**
 * Synchronise l'affectation de date d'un devoir (contrôle continu / maison)
 * dans le cahier de textes en mettant à jour ou insérant le bloc correspondant.
 */
export function syncAssessmentDateToNotebook(
  lessons: LessonsData,
  assessment: {
    id: string;
    type: DevoirType;
    num: number;
    dateISO: string;
    label?: string;
  },
  locale: AppLocale = 'fr'
): { lessons: LessonsData; updated: boolean } {
  const notebookType = assessment.type === 'maison' ? 'devoir_maison' : 'controle_continu';
  const defaultTitle =
    assessment.label ||
    (assessment.type === 'maison'
      ? (locale === 'ar' ? `فرض منزلي ${assessment.num}` : `Devoir maison ${assessment.num}`)
      : (locale === 'ar' ? `مراقبة مستمرة ${assessment.num}` : `Contrôle continu ${assessment.num}`));

  // Chercher si un bloc de même type et même numéro existe déjà
  const entries = findNotebookAssessments(lessons);
  const match = entries.find(
    e =>
      (e.type === 'controle' && notebookType === 'controle_continu' && e.num === assessment.num) ||
      (e.type === 'maison' && notebookType === 'devoir_maison' && e.num === assessment.num)
  );

  if (match) {
    // Le bloc existe déjà dans le cahier : mettre à jour sa date
    let updated = false;
    const modified = lessons.map(item => {
      if (item.type === notebookType) {
        const itemNum = match.num;
        if (itemNum === assessment.num) {
          updated = true;
          return { ...item, date: assessment.dateISO };
        }
      }
      return item;
    });

    if (updated) {
      // Repositionner le bloc mis à jour à sa place chronologique
      const targetBlock = modified.find(
        item => item.type === notebookType && item.date === assessment.dateISO
      );
      if (targetBlock) {
        const { lessons: reordered } = placeBlockChronologically(modified, targetBlock);
        return { lessons: reordered, updated: true };
      }
      return { lessons: modified, updated: true };
    }
  }

  // Aucun bloc n'existait : créer le bloc de devoir et l'insérer chronologiquement
  const newBlock: TopLevelItem = {
    type: notebookType,
    title: defaultTitle,
    date: assessment.dateISO,
    sections: [],
    items: [],
    _tempId: `dev-block-${assessment.id}`,
  };

  const { lessons: nextLessons } = placeBlockChronologically(lessons, newBlock);
  return { lessons: nextLessons, updated: true };
}

/**
 * Sens inverse : Répercute une modification effectuée dans le tableau de l'éditeur
 * vers les réglages des évaluations et activités (config.assessmentDates et config.pedagogicalEvents).
 */
export function syncNotebookSessionToEvaluations(
  classId: string,
  config: AppConfig,
  item: { type?: string; title?: string; date?: string; _tempId?: string },
  lessons: LessonsData
): { patch: Partial<AppConfig>; updated: boolean } {
  if (!item.type || !item.date) return { patch: {}, updated: false };

  const patch: Partial<AppConfig> = {};

  // 1. Évaluation diagnostique
  if (item.type === 'evaluation_diagnostic') {
    const currentEvents = [...(config.pedagogicalEvents?.[classId] ?? [])];
    const eventIndex = currentEvents.findIndex(e => e.type === 'evaluation_diagnostic');
    if (eventIndex >= 0) {
      const existing = currentEvents[eventIndex];
      if (existing.date !== item.date) {
        currentEvents[eventIndex] = {
          ...existing,
          date: item.date,
          title: item.title?.trim() || existing.title,
        };
        patch.pedagogicalEvents = {
          ...config.pedagogicalEvents,
          [classId]: currentEvents,
        };
        return { patch, updated: true };
      }
    } else {
      // Créer l'événement pédagogique correspondant
      const newEvent: PedagogicalEvent = {
        id: item._tempId?.replace(/^event-/, '') || `event-${Date.now()}`,
        type: 'evaluation_diagnostic',
        title: item.title?.trim() || 'Évaluation diagnostique',
        date: item.date,
        status: 'planned',
        createdAt: new Date().toISOString(),
      };
      patch.pedagogicalEvents = {
        ...config.pedagogicalEvents,
        [classId]: [...currentEvents, newEvent],
      };
      return { patch, updated: true };
    }
  }

  // 2. Correction du contrôle continu
  if (item.type === 'correction_controle_continu') {
    const currentEvents = [...(config.pedagogicalEvents?.[classId] ?? [])];
    const eventIndex = currentEvents.findIndex(e => e.type === 'correction_controle_continu');
    if (eventIndex >= 0) {
      const existing = currentEvents[eventIndex];
      if (existing.date !== item.date) {
        currentEvents[eventIndex] = { ...existing, date: item.date };
        patch.pedagogicalEvents = {
          ...config.pedagogicalEvents,
          [classId]: currentEvents,
        };
        return { patch, updated: true };
      }
    }
  }

  // 3. Devoirs (contrôle continu / devoir maison)
  if (item.type === 'controle_continu' || item.type === 'devoir_maison') {
    const mappedType: DevoirType = item.type === 'devoir_maison' ? 'maison' : 'controle';
    const entries = findNotebookAssessments(lessons);
    const entry = entries.find(e => e.type === (mappedType === 'maison' ? 'maison' : 'controle') && e.date === item.date);
    if (entry) {
      const dates = { ...(config.assessmentDates?.[classId] ?? {}) };
      // Déterminer la clé du devoir (par exemple s1-controle1 ou id annuel)
      const year = schoolYearLabelFromDate(item.date);
      const targetId = `${year}:s1-${mappedType}${entry.num}`;
      const legacyId = `s1-${mappedType}${entry.num}`;
      dates[targetId] = item.date;
      dates[legacyId] = item.date;
      patch.assessmentDates = {
        ...config.assessmentDates,
        [classId]: dates,
      };
      return { patch, updated: true };
    }
  }

  return { patch, updated: false };
}
