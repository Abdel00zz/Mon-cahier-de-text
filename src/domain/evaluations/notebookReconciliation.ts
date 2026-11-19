import type { AppConfig, EvaluationPolicy, LessonsData, PedagogicalEvent } from '../../types';
import { isEvaluationKind, kindTransmits, resolveKindPolicy } from './evaluationPolicy';
import { buildLessonRows, type LessonRow } from '../notebook/lessonRows';
import { schoolYearLabelFromDate } from '../calendar/calendar';
import { findNotebookAssessments, linkAssessments, parseTrailingNumber, type NotebookAssessmentEntry } from './assessmentSync';
import { withHomeworkCorrection } from './homeworkCycle';
import type { PlannedAssessment } from './assessments';
import { extractDateRange } from './dateRange';
import { detectRemarkActivities, normalizeActivityText } from './pedagogicalActivities';
import { correctionOwner } from './homeworkCorrectionIdentity';
import { annualAssessmentId, eventIdForRow, isEventBlockRow, semesterFromIsoDate } from './evaluationIdentity';
import { dequal } from 'dequal';

interface ReconcileOptions {
  previousLessons?: LessonsData;
  planned?: PlannedAssessment[];
  eventArchive?: ReadonlyMap<string, PedagogicalEvent>;
  /** Politique de la direction : une nature non transmise reste dans le cahier, la feuille ne la reçoit pas. */
  policy?: EvaluationPolicy;
}
const changed = (a: unknown, b: unknown) => !dequal(a, b);
const validDate = (value?: string): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));

/**
 * Détecte les activités pédagogiques (contrôle des cahiers, remédiation, soutien, rattrapage)
 * inscrites en tête de ligne dans la remarque d'une séance de cours (via le catalogue unique
 * `detectRemarkActivities`) et génère les événements correspondants.
 */
export function detectEventsFromRemarks(row: LessonRow, _classId?: string, policy?: EvaluationPolicy): PedagogicalEvent[] {
  const remark = row.data.remark?.trim();
  if (!remark) return [];
  const { startDate, endDate } = extractDateRange(row.data.date);
  if (!validDate(startDate)) return [];

  const activities = detectRemarkActivities(remark);
  if (!activities.length) return [];

  const detected: PedagogicalEvent[] = [];
  const rowId = row.data._tempId ?? row.key;
  const createdAt = new Date().toISOString();

  for (const activity of activities) {
    if (!kindTransmits(policy, activity.type)) continue;
    detected.push({
      id: `remark-${activity.type}-${rowId}`,
      type: activity.type,
      title: activity.short.fr,
      date: startDate,
      endDate: validDate(endDate) ? endDate : undefined,
      note: remark,
      status: 'planned',
      createdAt,
    });
  }

  return detected;
}

/** Reconcile an explicit notebook edit, not the absence of rows during loading.
 * Deletion needs the previous snapshot; identities never depend on the new date.
 * Documents and student records remain attached to their stable identifiers. */
export function syncNotebookToEvaluations(classId: string, config: AppConfig, lessons: LessonsData, options: ReconcileOptions = {}) {
  const patch: Partial<AppConfig> = {};
  const hasPrevious = options.previousLessons !== undefined && options.previousLessons !== lessons;
  const rows = buildLessonRows(lessons);
  const previousRows = hasPrevious ? buildLessonRows(options.previousLessons!) : rows;
  const rowsByKey = new Map<string, LessonRow>(rows.map(row => [row.key, row]));
  const previousRowsByKey = hasPrevious ? new Map<string, LessonRow>(previousRows.map(row => [row.key, row])) : rowsByKey;
  // Une nature non transmise n'entre ni dans « avant » ni dans « après » : elle ne crée rien
  // et ne fait rien disparaître de la feuille (les éléments déjà transmis restent gérables).
  const transmits = (kind: string) => !isEvaluationKind(kind) || kindTransmits(options.policy, kind);
  const entries = findNotebookAssessments(lessons).filter(entry => transmits(entry.type));
  const oldEntries = hasPrevious ? findNotebookAssessments(options.previousLessons!).filter(entry => transmits(entry.type)) : entries;
  const dates = { ...config.assessmentDates?.[classId] };
  const removed = new Set(config.removedAssessments?.[classId]);
  const manual = [...(config.manualAssessments?.[classId] ?? [])];
  const links = linkAssessments(options.planned ?? [], oldEntries, '');
  const plannedByEntry = new Map(links.filter(link => link.entry).map(link => [link.entry!, link.planned]));
  const plannedById = new Map((options.planned ?? []).map(item => [item.id, item]));
  const consumed = new Set<NotebookAssessmentEntry>();
  const identity = (entry: NotebookAssessmentEntry) => {
    const known = plannedByEntry.get(entry);
    if (entry.assessmentId) return { id: entry.assessmentId, legacyId: known?.legacyId };
    if (known) return known;
    const date = extractDateRange(entry.date).startDate;
    const entrySemester = validDate(date) ? semesterFromIsoDate(date) : undefined;
    const entryYear = validDate(date) ? schoolYearLabelFromDate(date) : undefined;
    const matches = manual.filter(item => item.type === entry.type && item.num === entry.num
      && (!entrySemester || item.semestre === undefined || item.semestre === entrySemester)
      && (!entryYear || !item.schoolYear || item.schoolYear === entryYear));
    if (matches.length === 1) return { id: matches[0].id };
    if (!validDate(date)) return undefined;
    return { id: annualAssessmentId(date, entry.type, entry.num) };
  };
  const entriesByTempId = new Map<string, NotebookAssessmentEntry[]>();
  for (const entry of entries) {
    const tid = rowsByKey.get(entry.key)?.data._tempId;
    if (!tid) continue;
    const list = entriesByTempId.get(tid);
    if (list) list.push(entry);
    else entriesByTempId.set(tid, [entry]);
  }
  const manualIndexById = new Map<string, number>(manual.map((item, idx) => [item.id, idx]));
  // A copied stable ID must never let the last row silently overwrite its twin.
  const identityCounts = new Map<string, number>();
  for (const entry of entries) {
    const id = identity(entry)?.id;
    if (id) identityCounts.set(id, (identityCounts.get(id) ?? 0) + 1);
  }
  const update = (entry: NotebookAssessmentEntry, target: { id: string; legacyId?: string }, previous?: NotebookAssessmentEntry) => {
    if ((identityCounts.get(target.id) ?? 0) > 1) return;
    // Homework is now edited through the session remark/activity, while old
    // hidden rows remain for compatibility. An unchanged historical row must
    // never overwrite the chosen activity date during automatic saving.
    if (entry.type === 'maison' && (previous ? previous.date === entry.date : !options.previousLessons)
      && (dates[target.id] || manualIndexById.has(target.id))) return;
    const date = extractDateRange(entry.date).startDate;
    if (validDate(date)) dates[target.id] = date;
    else delete dates[target.id];
    if (target.legacyId) delete dates[target.legacyId];
    removed.delete(target.id);
    if (target.legacyId) removed.delete(target.legacyId);
    const index = manualIndexById.get(target.id) ?? -1;
    const planned = plannedById.get(target.id);
    const num = entry.declaredNum ?? manual[index]?.num ?? planned?.num ?? entry.num;
    if (index >= 0) manual[index] = { ...manual[index], schoolYear: manual[index].schoolYear ?? schoolYearLabelFromDate(manual[index].dateISO),
      type: entry.type, num, dateISO: validDate(date) ? date : '' };
    else if ((validDate(date) && !planned) || (planned && (!validDate(date) || planned.type !== entry.type || planned.num !== num))) {
      manualIndexById.set(target.id, manual.length);
      manual.push({ id: target.id, schoolYear: planned?.schoolYear ?? schoolYearLabelFromDate(date!), type: entry.type, num,
        dateISO: validDate(date) ? date : '', semestre: planned?.semestre ?? (/:s2-/.test(target.id) ? 2 : 1) });
    }
  };
  for (const old of oldEntries) {
    const oldRow = previousRowsByKey.get(old.key);
    const stableId = oldRow?.data._tempId;
    const candidates = stableId
      ? (entriesByTempId.get(stableId) ?? []).filter(entry => !consumed.has(entry))
      : entries.filter(entry => !consumed.has(entry) && entry.type === old.type && entry.title === old.title);
    const current = candidates.length === 1 ? candidates[0] : undefined;
    const target = identity(old);
    if (current) {
      consumed.add(current);
      if (target) update(current, target, old);
    } else if (options.previousLessons && candidates.length === 0 && target) {
      removed.add(target.id);
      delete dates[target.id];
      if (target.legacyId) { removed.add(target.legacyId); delete dates[target.legacyId]; }
    }
  }
  for (const entry of entries) {
    if (consumed.has(entry)) continue;
    const target = identity(entry);
    if (target) update(entry, target);
  }
  if (changed(dates, config.assessmentDates?.[classId] ?? {})) patch.assessmentDates = { ...config.assessmentDates, [classId]: dates };
  /*
   * Bloc « Correction du devoir maison » posé au tableau : il date le SECOND
   * temps du devoir, jamais un doublon. Le numéro du titre l’emporte ; sans
   * numéro, c’est le devoir qui attend encore sa correction qui est servi. Un
   * devoir du planning officiel daté par le professeur, ou un devoir jamais
   * saisi, est transmis à la feuille « Contrôle continu et activités ».
   */
  const transmitsCorrection = transmits('maison') && resolveKindPolicy(options.policy, 'maison').correction;
  const correctionRows = rows.filter(row => row.elementType === 'correction_devoir_maison');
  // An individual correction follows its content, never a neighbouring course session.
  const handledCorrections = new Set<string>();
  if (options.previousLessons && transmitsCorrection) {
    for (const old of previousRows.filter(row => row.elementType === 'correction_devoir_maison')) {
      const owner = correctionOwner(old, manual);
      if (!owner) continue;
      const matches = old.data._tempId
        ? correctionRows.filter(row => row.data._tempId === old.data._tempId)
        : correctionRows.filter(row => !handledCorrections.has(row.key) && (
            row.data === old.data
            || ('title' in row.data && 'title' in old.data && row.data.title === old.data.title && row.data.date === old.data.date)
          ));
      if (matches.length > 1) continue;
      const next = matches[0];
      const date = extractDateRange(next?.data.date).startDate;
      const index = manual.findIndex(item => item.id === owner.id);
      if (index >= 0) {
        const updated = { ...manual[index] };
        if (validDate(date)) updated.correctionDateISO = date;
        else delete updated.correctionDateISO;
        manual[index] = updated;
      }
      if (next) handledCorrections.add(next.key);
    }
  }
  for (const row of correctionRows.filter(candidate => transmitsCorrection && !handledCorrections.has(candidate.key))) {
    const { startDate } = extractDateRange(row.data.date);
    if (!validDate(startDate)) continue;
    const owner = correctionOwner(row, manual);
    if (owner) {
      const index = manual.findIndex(item => item.id === owner.id);
      manual[index] = { ...manual[index], correctionDateISO: startDate };
      continue;
    }
    const declared = parseTrailingNumber('title' in row.data ? row.data.title : undefined);
    const next = withHomeworkCorrection(manual, startDate, declared ?? undefined, { dates, removed: [...removed] });
    if (next !== manual) manual.splice(0, manual.length, ...next);
  }
  if (changed(manual, config.manualAssessments?.[classId] ?? [])) patch.manualAssessments = { ...config.manualAssessments, [classId]: manual };
  if (changed([...removed], config.removedAssessments?.[classId] ?? [])) patch.removedAssessments = { ...config.removedAssessments, [classId]: [...removed] };

  const currentEvents = config.pedagogicalEvents?.[classId] ?? [];
  const events = [...currentEvents];
  const eventIndexById = new Map<string, number>(events.map((ev, idx) => [ev.id, idx]));
  const previousByTempId = new Map<string, LessonRow>();
  const previousByData = new Map<unknown, LessonRow>();
  if (hasPrevious) {
    for (const old of previousRows) {
      if (old.data._tempId && !previousByTempId.has(old.data._tempId)) previousByTempId.set(old.data._tempId, old);
      previousByData.set(old.data, old);
    }
  }
  const matched = new Set<string>();
  const upsertEvent = (ev: PedagogicalEvent) => {
    const existingIdx = eventIndexById.get(ev.id);
    if (existingIdx !== undefined) {
      events[existingIdx] = ev;
    } else {
      eventIndexById.set(ev.id, events.length);
      events.push(ev);
    }
  };
  const getEventById = (id: string) => {
    const idx = eventIndexById.get(id);
    return idx !== undefined ? events[idx] : undefined;
  };
  const findEvent = (row: LessonRow) => {
    const id = eventIdForRow(row);
    const direct = getEventById(id) ?? options.eventArchive?.get(id);
    if (direct) return direct;
    if (row.data._tempId?.startsWith('event-')) return undefined;
    const previous = hasPrevious
      ? ((row.data._tempId ? previousByTempId.get(row.data._tempId) : undefined) ?? previousByData.get(row.data))
      : row;
    const previousId = previous ? `notebook-${previous.data._tempId ?? previous.key}` : undefined;
    if (previousId) {
      const fromPreviousKey = getEventById(previousId) ?? options.eventArchive?.get(previousId);
      if (fromPreviousKey && !matched.has(fromPreviousKey.id)) return fromPreviousKey;
    }
    const candidates = events.filter(event => event.type === row.elementType && !matched.has(event.id)
      && ('title' in row.data && (event.title === row.data.title || (previous && 'title' in previous.data && event.title === previous.data.title))));
    return candidates.length === 1 ? candidates[0] : undefined;
  };
  const transmittedEvent = (row: LessonRow) => isEventBlockRow(row) && transmits(row.elementType);
  const eventRows = rows.filter(transmittedEvent);
  const rowIdentityCounts = new Map<string, number>();
  for (const row of eventRows) if (row.data._tempId) rowIdentityCounts.set(row.data._tempId, (rowIdentityCounts.get(row.data._tempId) ?? 0) + 1);
  for (const row of eventRows) {
    const existing = findEvent(row);
    if (row.data._tempId && (rowIdentityCounts.get(row.data._tempId) ?? 0) > 1) {
      if (existing) matched.add(existing.id);
      continue;
    }
    const { startDate, endDate } = extractDateRange(row.data.date);
    // Une évaluation posée au cahier rejoint la feuille dès sa création, même
    // avant d'être datée (« + Définir une date ») ; seules les lignes sans
    // identité stable (cahiers anciens) attendent leur date pour être reliées.
    if (!existing && !validDate(startDate) && !row.data._tempId) continue;
    const id = existing?.id ?? eventIdForRow(row);
    const event: PedagogicalEvent = { ...existing, id, type: existing?.type ?? row.elementType as PedagogicalEvent['type'],
      title: ('title' in row.data ? row.data.title : '')?.trim() || existing?.title || 'Évaluation',
      date: validDate(startDate) ? startDate : '', endDate: validDate(endDate) ? endDate : undefined,
      note: row.data.remark?.trim() || undefined, status: existing?.status ?? 'planned', createdAt: existing?.createdAt ?? new Date().toISOString() };
    upsertEvent(event);
    matched.add(id);
  }

  // Pré-indexer les blocs événements explicites par date pour éviter un scan O(R × E)
  const explicitByDate = new Map<string, Array<{ type: string; normTitle: string }>>();
  const registerExplicit = (date: string | undefined, type: string, title: string) => {
    if (!date) return;
    const entry = { type, normTitle: normalizeActivityText(title) };
    const list = explicitByDate.get(date);
    if (list) list.push(entry);
    else explicitByDate.set(date, [entry]);
  };
  for (const er of eventRows) {
    registerExplicit(
      extractDateRange(er.data.date).startDate,
      er.elementType,
      'title' in er.data && typeof er.data.title === 'string' ? er.data.title : '',
    );
  }
  for (const e of events) {
    if (!e.id.startsWith('remark-')) registerExplicit(e.date, e.type, e.title);
  }

  // Scan remarks for pedagogical activities (contrôle cahiers, remédiation, etc.)
  for (const row of rows) {
    if (!row.data.remark) continue;
    const remarkEvents = detectEventsFromRemarks(row, classId, options.policy);
    if (!remarkEvents.length) continue;
    const previousRemarkRow = !row.data._tempId && hasPrevious ? previousByData.get(row.data) : undefined;
    for (const rev of remarkEvents) {
      // Deduplicate: if an explicit block exists for this activity on the same row or date, skip
      if (row.elementType === rev.type) continue;
      const explicitOnDate = explicitByDate.get(rev.date);
      const normRevTitle = normalizeActivityText(rev.title);
      const explicitDuplicate = explicitOnDate?.some(e => e.type === rev.type || e.normTitle.includes(normRevTitle)) ?? false;
      if (explicitDuplicate) continue;

      const previousRevId = previousRemarkRow ? `remark-${rev.type}-${previousRemarkRow.data._tempId ?? previousRemarkRow.key}` : undefined;
      const existing = getEventById(rev.id)
        ?? (previousRevId ? getEventById(previousRevId) : undefined)
        ?? options.eventArchive?.get(rev.id)
        ?? (previousRevId ? options.eventArchive?.get(previousRevId) : undefined);
      const event: PedagogicalEvent = {
        ...existing,
        ...rev,
        createdAt: existing?.createdAt ?? rev.createdAt,
        status: existing?.status ?? rev.status,
      };
      upsertEvent(event);
      matched.add(rev.id);
    }
  }

  if (options.previousLessons) {
    for (const row of previousRows.filter(transmittedEvent)) {
      const event = findEvent(row);
      if (event && !matched.has(event.id)) {
        const index = events.findIndex(item => item.id === event.id);
        if (index >= 0) events.splice(index, 1);
      }
    }
  }

  // Remove remark events that are no longer present in current rows
  for (let i = events.length - 1; i >= 0; i--) {
    // Une activité déjà transmise, dont la nature n'est plus transmise, est conservée : elle porte peut-être des élèves ou un document.
    if (events[i].id.startsWith('remark-') && !matched.has(events[i].id) && transmits(events[i].type)) {
      events.splice(i, 1);
    }
  }

  if (changed(events, currentEvents)) patch.pedagogicalEvents = { ...config.pedagogicalEvents, [classId]: events };
  return { patch, updated: Object.keys(patch).length > 0 };
}

export function syncNotebookSessionToEvaluations(classId: string, config: AppConfig, _item: unknown, lessons: LessonsData) {
  return syncNotebookToEvaluations(classId, config, lessons);
}

/**
 * Réconcilie les cahiers stockés de toutes les classes avec la configuration
 * des évaluations et activités pédagogiques (contrôle des cahiers, remédiation,
 * soutien, rattrapage, devoirs, etc.).
 */
export function reconcileClassesEvaluationConfig<T extends Partial<AppConfig>>(
  classes: readonly { id: string }[],
  config: T,
  readLessons: (classId: string) => LessonsData,
): { config: T; patch: Partial<AppConfig>; updated: boolean } {
  let current = config;
  const combinedPatch: Partial<AppConfig> = {};
  let anyUpdated = false;
  for (const classInfo of classes) {
    let lessons: LessonsData;
    try {
      lessons = readLessons(classInfo.id);
    } catch {
      continue;
    }
    if (!Array.isArray(lessons) || lessons.length === 0) continue;
    const { patch, updated } = syncNotebookToEvaluations(classInfo.id, current as AppConfig, lessons, {
      policy: current.evaluationPolicy,
    });
    if (updated) {
      current = { ...current, ...patch };
      Object.assign(combinedPatch, patch);
      anyUpdated = true;
    }
  }
  return { config: current, patch: combinedPatch, updated: anyUpdated };
}
