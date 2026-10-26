import type { AppConfig, EvaluationPolicy, LessonsData, PedagogicalEvent } from '../../types';
import { isEvaluationKind, kindTransmits, resolveKindPolicy } from './evaluationPolicy';
import { buildLessonRows, type LessonRow } from '../notebook/lessonRows';
import { schoolYearLabelFromDate } from '../calendar/calendar';
import { findNotebookAssessments, linkAssessments, parseTrailingNumber, type NotebookAssessmentEntry } from './assessmentSync';
import { withHomeworkCorrection } from './homeworkCycle';
import type { PlannedAssessment } from './assessments';
import { extractDateRange } from './notebookSyncBridge';
import { normalizeActivityText } from './pedagogicalActivities';
import { correctionOwner } from './homeworkCorrectionContent';

interface ReconcileOptions {
  previousLessons?: LessonsData;
  planned?: PlannedAssessment[];
  eventArchive?: ReadonlyMap<string, PedagogicalEvent>;
  /** Politique de la direction : une nature non transmise reste dans le cahier, la feuille ne la reçoit pas. */
  policy?: EvaluationPolicy;
}
const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
const validDate = (value?: string): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));
const eventType = (row: LessonRow) => row.elementType === 'evaluation_diagnostic' || row.elementType === 'correction_controle_continu' || row.elementType === 'examen_blanc' || row.elementType === 'olympiade' || row.elementType === 'concours' || row.data._tempId?.startsWith('event-');

interface RemarkActivityDetector {
  type: 'controle_cahiers' | 'remediation' | 'soutien' | 'rattrapage';
  title: string;
  regex: RegExp;
}

const REMARK_ACTIVITY_DETECTORS: readonly RemarkActivityDetector[] = [
  {
    type: 'controle_cahiers',
    title: 'Contrôle des cahiers',
    regex: /controle.*cahiers?|مراقب.*دفاتر|notebook.*check/i,
  },
  {
    type: 'remediation',
    title: 'Remédiation',
    regex: /remediation|معالج/i,
  },
  {
    type: 'soutien',
    title: 'Soutien',
    regex: /soutien|دعم|support/i,
  },
  {
    type: 'rattrapage',
    title: 'Rattrapage',
    regex: /rattrapage|استدراك|make-?up/i,
  },
];

/**
 * Détecte les activités pédagogiques (contrôle des cahiers, remédiation, soutien, rattrapage)
 * inscrites dans la remarque d'une séance de cours et génère les événements correspondants.
 */
export function detectEventsFromRemarks(row: LessonRow, _classId?: string, policy?: EvaluationPolicy): PedagogicalEvent[] {
  const remark = row.data.remark?.trim();
  if (!remark) return [];
  const { startDate, endDate } = extractDateRange(row.data.date);
  if (!validDate(startDate)) return [];

  const normalized = normalizeActivityText(remark);
  const detected: PedagogicalEvent[] = [];
  const rowId = row.data._tempId ?? row.key;

  for (const detector of REMARK_ACTIVITY_DETECTORS) {
    if (!kindTransmits(policy, detector.type)) continue;
    if (detector.regex.test(normalized) || detector.regex.test(remark)) {
      const id = `remark-${detector.type}-${rowId}`;
      detected.push({
        id,
        type: detector.type,
        title: detector.title,
        date: startDate,
        endDate: validDate(endDate) ? endDate : undefined,
        note: remark,
        status: 'planned',
        createdAt: new Date().toISOString(),
      });
    }
  }

  return detected;
}

/** Reconcile an explicit notebook edit, not the absence of rows during loading.
 * Deletion needs the previous snapshot; identities never depend on the new date.
 * Documents and student records remain attached to their stable identifiers. */
export function syncNotebookToEvaluations(classId: string, config: AppConfig, lessons: LessonsData, options: ReconcileOptions = {}) {
  const patch: Partial<AppConfig> = {};
  const rows = buildLessonRows(lessons);
  const previousRows = buildLessonRows(options.previousLessons ?? lessons);
  // Une nature non transmise n'entre ni dans « avant » ni dans « après » : elle ne crée rien
  // et ne fait rien disparaître de la feuille (les éléments déjà transmis restent gérables).
  const transmits = (kind: string) => !isEvaluationKind(kind) || kindTransmits(options.policy, kind);
  const entries = findNotebookAssessments(lessons).filter(entry => transmits(entry.type));
  const oldEntries = findNotebookAssessments(options.previousLessons ?? lessons).filter(entry => transmits(entry.type));
  const dates = { ...config.assessmentDates?.[classId] };
  const removed = new Set(config.removedAssessments?.[classId]);
  const manual = [...(config.manualAssessments?.[classId] ?? [])];
  const links = linkAssessments(options.planned ?? [], oldEntries, '');
  const consumed = new Set<NotebookAssessmentEntry>();
  const identity = (entry: NotebookAssessmentEntry) => {
    const known = links.find(link => link.entry === entry)?.planned;
    if (entry.assessmentId) return { id: entry.assessmentId, legacyId: known?.legacyId };
    if (known) return known;
    const matches = manual.filter(item => item.type === entry.type && item.num === entry.num);
    if (matches.length === 1) return { id: matches[0].id };
    const date = extractDateRange(entry.date).startDate;
    if (!validDate(date)) return undefined;
    const semester = Number(date.slice(5, 7)) >= 2 && Number(date.slice(5, 7)) <= 7 ? 2 : 1;
    return { id: `${schoolYearLabelFromDate(date)}:s${semester}-${entry.type}${entry.num}` };
  };
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
      && (dates[target.id] || manual.some(item => item.id === target.id))) return;
    const date = extractDateRange(entry.date).startDate;
    if (validDate(date)) dates[target.id] = date;
    else delete dates[target.id];
    if (target.legacyId) delete dates[target.legacyId];
    removed.delete(target.id);
    if (target.legacyId) removed.delete(target.legacyId);
    const index = manual.findIndex(item => item.id === target.id);
    const planned = options.planned?.find(item => item.id === target.id);
    const num = entry.declaredNum ?? manual[index]?.num ?? planned?.num ?? entry.num;
    if (index >= 0) manual[index] = { ...manual[index], schoolYear: manual[index].schoolYear ?? schoolYearLabelFromDate(manual[index].dateISO),
      type: entry.type, num, dateISO: validDate(date) ? date : '' };
    else if ((validDate(date) && !planned) || (planned && (!validDate(date) || planned.type !== entry.type || planned.num !== num))) {
      manual.push({ id: target.id, schoolYear: planned?.schoolYear ?? schoolYearLabelFromDate(date!), type: entry.type, num,
        dateISO: validDate(date) ? date : '', semestre: planned?.semestre ?? (/:s2-/.test(target.id) ? 2 : 1) });
    }
  };
  for (const old of oldEntries) {
    const oldRow = previousRows.find(row => row.key === old.key);
    const stableId = oldRow?.data._tempId;
    const candidates = entries.filter(entry => !consumed.has(entry) && (stableId
      ? rows.find(row => row.key === entry.key)?.data._tempId === stableId
      : entry.type === old.type && entry.title === old.title));
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
  const matched = new Set<string>();
  const findEvent = (row: LessonRow) => {
    const id = row.data._tempId?.startsWith('event-') ? row.data._tempId.slice(6) : `notebook-${row.data._tempId ?? row.key}`;
    const direct = events.find(event => event.id === id) ?? options.eventArchive?.get(id);
    if (direct) return direct;
    if (row.data._tempId?.startsWith('event-')) return undefined;
    const previous = previousRows.find(old => (old.data._tempId && old.data._tempId === row.data._tempId) || old.data === row.data);
    const previousId = previous ? `notebook-${previous.data._tempId ?? previous.key}` : undefined;
    if (previousId) {
      const fromPreviousKey = events.find(event => event.id === previousId) ?? options.eventArchive?.get(previousId);
      if (fromPreviousKey && !matched.has(fromPreviousKey.id)) return fromPreviousKey;
    }
    const candidates = events.filter(event => event.type === row.elementType && !matched.has(event.id)
      && ('title' in row.data && (event.title === row.data.title || (previous && 'title' in previous.data && event.title === previous.data.title))));
    return candidates.length === 1 ? candidates[0] : undefined;
  };
  const transmittedEvent = (row: LessonRow) => eventType(row) && transmits(row.elementType);
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
    const id = existing?.id ?? (row.data._tempId?.startsWith('event-') ? row.data._tempId.slice(6) : `notebook-${row.data._tempId ?? row.key}`);
    const event: PedagogicalEvent = { ...existing, id, type: existing?.type ?? row.elementType as PedagogicalEvent['type'],
      title: ('title' in row.data ? row.data.title : '')?.trim() || existing?.title || 'Évaluation',
      date: validDate(startDate) ? startDate : '', endDate: validDate(endDate) ? endDate : undefined,
      note: row.data.remark?.trim() || undefined, status: existing?.status ?? 'planned', createdAt: existing?.createdAt ?? new Date().toISOString() };
    const index = events.findIndex(item => item.id === id);
    if (index >= 0) events[index] = event; else events.push(event);
    matched.add(id);
  }

  // Scan remarks for pedagogical activities (contrôle cahiers, remédiation, etc.)
  for (const row of rows) {
    const remarkEvents = detectEventsFromRemarks(row, classId, options.policy);
    const previousRemarkRow = !row.data._tempId ? previousRows.find(old => old.data === row.data) : undefined;
    for (const rev of remarkEvents) {
      // Deduplicate: if an explicit block exists for this activity on the same row or date, skip
      if (row.elementType === rev.type) continue;
      const explicitDuplicate = eventRows.some(er => {
        const { startDate } = extractDateRange(er.data.date);
        if (startDate !== rev.date) return false;
        if (er.elementType === rev.type) return true;
        const normTitle = 'title' in er.data && typeof er.data.title === 'string'
          ? normalizeActivityText(er.data.title)
          : '';
        return normTitle.includes(normalizeActivityText(rev.title));
      }) || events.some(e => {
        if (e.id.startsWith('remark-')) return false;
        return (e.type === rev.type || normalizeActivityText(e.title).includes(normalizeActivityText(rev.title))) && e.date === rev.date;
      });
      if (explicitDuplicate) continue;

      const previousRevId = previousRemarkRow ? `remark-${rev.type}-${previousRemarkRow.data._tempId ?? previousRemarkRow.key}` : undefined;
      const existing = events.find(event => event.id === rev.id)
        ?? (previousRevId ? events.find(event => event.id === previousRevId) : undefined)
        ?? options.eventArchive?.get(rev.id)
        ?? (previousRevId ? options.eventArchive?.get(previousRevId) : undefined);
      const event: PedagogicalEvent = {
        ...existing,
        ...rev,
        createdAt: existing?.createdAt ?? rev.createdAt,
        status: existing?.status ?? rev.status,
      };
      const index = events.findIndex(item => item.id === rev.id);
      if (index >= 0) events[index] = event; else events.push(event);
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
