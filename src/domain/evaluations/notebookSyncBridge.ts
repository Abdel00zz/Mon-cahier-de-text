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

  const { lessons: nextLessons } = placeBlockChronologically(lessons, blockToInsert);
  return { lessons: nextLessons, updated: true };
}

/**
 * Supprime le bloc correspondant à un événement pédagogique du cahier de textes.
 */
export function removeEventFromNotebook(
  lessons: LessonsData,
  eventId: string,
  eventType?: string,
  eventTitle?: string
): { lessons: LessonsData; updated: boolean } {
  const targetTempId = `event-${eventId}`;
  const idx = lessons.findIndex(item => {
    if (item._tempId === targetTempId) return true;
    if (eventType && item.type === eventType) {
      if (eventTitle && item.title) {
        return item.title.trim().toLowerCase() === eventTitle.trim().toLowerCase();
      }
      return true;
    }
    return false;
  });

  if (idx >= 0) {
    const copy = [...lessons];
    copy.splice(idx, 1);
    return { lessons: copy, updated: true };
  }
  return { lessons, updated: false };
}

/**
 * Supprime le bloc correspondant à un devoir (contrôle continu / devoir maison) du cahier de textes.
 */
export function removeAssessmentFromNotebook(
  lessons: LessonsData,
  assessmentId: string,
  type: DevoirType,
  num?: number
): { lessons: LessonsData; updated: boolean } {
  const targetTempId = `dev-block-${assessmentId}`;
  const notebookType = type === 'maison' ? 'devoir_maison' : 'controle_continu';

  const idx = lessons.findIndex(item => {
    if (item._tempId === targetTempId) return true;
    if (item.type === notebookType) {
      if (num !== undefined) {
        const trailingNum = (item.title ?? '').trim().match(/(\d+)\s*$/);
        if (trailingNum && parseInt(trailingNum[1], 10) === num) return true;
      }
      return true;
    }
    return false;
  });

  if (idx >= 0) {
    const copy = [...lessons];
    copy.splice(idx, 1);
    return { lessons: copy, updated: true };
  }
  return { lessons, updated: false };
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
    clearIfEmpty?: boolean;
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
    // Si la date doit être vidée
    if (!assessment.dateISO && assessment.clearIfEmpty) {
      const modified = lessons.map(item => {
        if (item.type === notebookType) {
          const trailingNum = (item.title ?? '').trim().match(/(\d+)\s*$/);
          const itemNum = trailingNum ? parseInt(trailingNum[1], 10) : match.num;
          if (itemNum === assessment.num) {
            return { ...item, date: undefined };
          }
        }
        return item;
      });
      return { lessons: modified, updated: true };
    }

    if (!assessment.dateISO) {
      return { lessons, updated: false };
    }

    // Le bloc existe déjà dans le cahier : mettre à jour sa date
    let updated = false;
    const modified = lessons.map(item => {
      if (item.type === notebookType) {
        const trailingNum = (item.title ?? '').trim().match(/(\d+)\s*$/);
        const itemNum = trailingNum ? parseInt(trailingNum[1], 10) : match.num;
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

  if (!assessment.dateISO) {
    return { lessons, updated: false };
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
 * Sens inverse complet et ultra-dynamique : Répercute l'état intégral du tableau de l'éditeur
 * vers les réglages des évaluations et activités (config.assessmentDates et config.pedagogicalEvents).
 * Traite les ajouts, modifications de dates et suppressions.
 */
export function syncNotebookToEvaluations(
  classId: string,
  config: AppConfig,
  lessons: LessonsData
): { patch: Partial<AppConfig>; updated: boolean } {
  let updated = false;
  const patch: Partial<AppConfig> = {};

  // 1. Devoirs (contrôle continu / devoir maison)
  const notebookAssessments = findNotebookAssessments(lessons);
  const currentDates = { ...(config.assessmentDates?.[classId] ?? {}) };
  const nextDates = { ...currentDates };
  const manualList = config.manualAssessments?.[classId] ?? [];

  for (const entry of notebookAssessments) {
    if (entry.date?.trim()) {
      const isoDate = extractEarliestDate(entry.date);
      if (isoDate) {
        const year = schoolYearLabelFromDate(isoDate);
        const month = parseInt(isoDate.split('-')[1], 10);
        const semesterNum = (month >= 2 && month <= 7) ? 2 : 1;
        const targetId = `${year}:s${semesterNum}-${entry.type}${entry.num}`;
        const legacyId = `s${semesterNum}-${entry.type}${entry.num}`;

        if (nextDates[targetId] !== isoDate || nextDates[legacyId] !== isoDate) {
          nextDates[targetId] = isoDate;
          nextDates[legacyId] = isoDate;
          updated = true;
        }

        const manualMatch = manualList.find(m => m.type === entry.type && m.num === entry.num);
        if (manualMatch && nextDates[manualMatch.id] !== isoDate) {
          nextDates[manualMatch.id] = isoDate;
          updated = true;
        }
      }
    }
  }

  if (updated || JSON.stringify(currentDates) !== JSON.stringify(nextDates)) {
    patch.assessmentDates = {
      ...config.assessmentDates,
      [classId]: nextDates,
    };
    updated = true;
  }

  // 2. Événements pédagogiques
  const currentEvents = [...(config.pedagogicalEvents?.[classId] ?? [])];
  let eventsChanged = false;
  const nextEvents = [...currentEvents];

  const syncableTypes = new Set([
    'evaluation_diagnostic',
    'correction_controle_continu',
    'soutien',
    'olympiade',
  ]);

  for (const item of lessons) {
    const isSyncableType = syncableTypes.has(item.type) || item._tempId?.startsWith('event-');
    if (isSyncableType && item.date?.trim()) {
      const { startDate: isoDate, endDate: isoEndDate } = extractDateRange(item.date);
      if (isoDate) {
        const eventId = item._tempId?.replace(/^event-/, '');
        const existingIdx = nextEvents.findIndex(
          e => (eventId && e.id === eventId) || (e.type === item.type && (e.title === item.title || item.type === 'evaluation_diagnostic'))
        );

        if (existingIdx >= 0) {
          const existing = nextEvents[existingIdx];
          const titleChanged = item.title && existing.title !== item.title.trim();
          const dateChanged = existing.date !== isoDate || existing.endDate !== isoEndDate;
          const noteChanged = item.remark?.trim() && existing.note !== item.remark.trim();
          if (dateChanged || titleChanged || noteChanged) {
            nextEvents[existingIdx] = {
              ...existing,
              date: isoDate,
              endDate: isoEndDate,
              title: item.title?.trim() || existing.title,
              note: item.remark?.trim() || existing.note,
            };
            eventsChanged = true;
          }
        } else {
          const newEvent: PedagogicalEvent = {
            id: eventId || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: (item.type as PedagogicalEvent['type']) || 'autre',
            title: item.title?.trim() || 'Activité pédagogique',
            date: isoDate,
            endDate: isoEndDate,
            note: item.remark?.trim() || undefined,
            status: 'planned',
            createdAt: new Date().toISOString(),
          };
          nextEvents.push(newEvent);
          eventsChanged = true;
        }
      }
    }
  }

  if (eventsChanged) {
    patch.pedagogicalEvents = {
      ...config.pedagogicalEvents,
      [classId]: nextEvents,
    };
    updated = true;
  }

  return { patch, updated };
}

/**
 * Sens inverse : Répercute une modification effectuée dans le tableau de l'éditeur
 * vers les réglages des évaluations et activités (config.assessmentDates et config.pedagogicalEvents).
 * Fournit une compatibilité totale avec l'API existante tout en bénéficiant de la synchronisation globale.
 */
export function syncNotebookSessionToEvaluations(
  classId: string,
  config: AppConfig,
  item: { type?: string; title?: string; date?: string; _tempId?: string },
  lessons: LessonsData
): { patch: Partial<AppConfig>; updated: boolean } {
  return syncNotebookToEvaluations(classId, config, lessons);
}
