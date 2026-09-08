import bundledJson from '../public/doc_officiel/curriculum.json' with { type: 'json' };
import type { AppConfig, ClassInfo, LessonsData, OfficialCurriculumPlan } from '../types.js';
import { normalizeOfficialClassName } from '../constants/class-levels.js';
import { getBundledCalendar, getEffectiveSchoolYear, isHoliday, isVacation, schoolYearLabelFromDate, todayInMorocco, type HolidayCalendar } from './calendar.js';
import { getDaySessionBlocks } from './timetable.js';
import { detectChapterLifecycles, validChapterDate } from './chapterLifecycle.js';

export interface CurriculumCatalog {
  version: number;
  reviewedAt: string;
  documents: { id: string; file: string; sha256?: string; duplicateOf?: string }[];
  plans: OfficialCurriculumPlan[];
}
const validCurriculumDate = validChapterDate;

/** Reject a partial update: never mix incompatible sources. */
export function validateCurriculumCatalog(value: unknown): CurriculumCatalog {
  const catalog = value as CurriculumCatalog;
  if (!catalog || catalog.version !== 1 || !validCurriculumDate(catalog.reviewedAt)
    || !Array.isArray(catalog.documents) || !Array.isArray(catalog.plans)) throw new Error('Catalogue de progressions invalide');
  const ids = new Set<string>();
  for (const plan of catalog.plans) {
    if (!plan.id || ids.has(plan.id) || !['college', 'lycee', 'prepa'].includes(plan.cycle)
      || !plan.level || !plan.subject || !plan.sourceDoc || !plan.sourceFile
      || !catalog.documents.some(doc => doc.file === plan.sourceFile)
      || !['teacher-plan', 'ministerial'].includes(plan.authority ?? '')
      || !/^\d{4}-\d{4}$/.test(plan.schoolYear ?? '')
      || !Array.isArray(plan.chapters) || !plan.chapters.length || !plan.diagnosticEvaluation) throw new Error('Source de progression invalide');
    if (plan.preferredForMatching !== undefined && typeof plan.preferredForMatching !== 'boolean') throw new Error('Choix éditorial invalide');
    ids.add(plan.id);
    const chapterIds = new Set<string>();
    plan.chapters.forEach((chapter, index) => {
      if (!chapter.id || chapterIds.has(chapter.id) || chapter.order !== index + 1 || !chapter.title
        || ![1, 2].includes(chapter.semester)
        || (chapter.allocatedHours !== null && (!Number.isFinite(chapter.allocatedHours) || chapter.allocatedHours <= 0))) throw new Error(`Chapitre invalide : ${plan.id}`);
      chapterIds.add(chapter.id);
    });
    for (const window of plan.assessmentWindows ?? []) {
      if (!['DS', 'DM'].includes(window.type) || !validCurriculumDate(window.start)
        || !validCurriculumDate(window.end) || window.end < window.start) throw new Error(`Échéance invalide : ${plan.id}`);
    }
  }
  return catalog;
}
export const bundledCurricula = validateCurriculumCatalog(bundledJson);
let latestCurricula = bundledCurricula;
export async function loadCurriculumCatalog(signal?: AbortSignal): Promise<CurriculumCatalog> {
  const response = await fetch('/doc_officiel/curriculum.json', { cache: 'no-store', signal });
  if (!response.ok) throw new Error('Catalogue indisponible');
  latestCurricula = validateCurriculumCatalog(await response.json());
  return latestCurricula;
}
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const subjectKey = (subject: string) => ['math', 'maths', 'mathematiques', 'mathematics', 'الرياضيات', 'رياضيات'].includes(normalize(subject)) ? 'math' : normalize(subject);
const levelKey = (value: string) => normalize(normalizeOfficialClassName(value)).replace(/\s+[0-9]+$/, '');
export function findCurricula(classInfo: ClassInfo, catalog = latestCurricula, schoolYear?: string): OfficialCurriculumPlan[] {
  // Structured metadata wins. Never infer a branch from “Tronc commun”.
  const level = classInfo.level ? `${classInfo.level}${classInfo.branch && !normalize(classInfo.level).includes(normalize(classInfo.branch)) ? ` ${classInfo.branch}` : ''}` : classInfo.name;
  return catalog.plans.filter(plan => (!classInfo.cycle || plan.cycle === classInfo.cycle)
    && subjectKey(plan.subject) === subjectKey(classInfo.subject)
    && (plan.levels ?? [plan.level]).some(candidate => levelKey(candidate) === levelKey(level))
    && (!schoolYear || plan.schoolYear === schoolYear));
}

/** Editorial choice lives in the data, never a technical source selector in the teacher UI. */
export function findMatchingCurriculum(classInfo: ClassInfo, catalog = latestCurricula, schoolYear?: string) {
  const plans = findCurricula(classInfo, catalog, schoolYear);
  const selected = plans.find(plan => plan.id === classInfo.curriculumSourceId);
  if (selected) return selected;
  const preferred = plans.filter(plan => plan.preferredForMatching);
  return preferred.length === 1 ? preferred[0] : plans.length === 1 ? plans[0] : undefined;
}

export function chapterAssociations(classInfo: ClassInfo, lessons: LessonsData, curriculum: OfficialCurriculumPlan): Record<number, string> {
  const result: Record<number, string> = {};
  for (const chapter of curriculum.chapters) {
    for (const match of classInfo.curriculumChapterMatches?.[chapter.id] ?? []) {
      if (lessons[match.index]?.type === 'chapter' && lessons[match.index].title === match.title && result[match.index] === undefined) result[match.index] = chapter.id;
    }
  }
  return result;
}

export interface ProgressionOptions {
  curriculum: OfficialCurriculumPlan;
  config: AppConfig;
  calendar?: HolidayCalendar;
  today?: string;
  /** Only teacher-confirmed dates consume timetable hours. */
  reservedHours?: Record<string, number>;
}
export function computeOfficialProgression(classInfo: ClassInfo, lessons: LessonsData, options: ProgressionOptions) {
  const { curriculum, config } = options;
  const calendar = options.calendar ?? getBundledCalendar();
  const today = options.today ?? todayInMorocco(new Date(), calendar);
  const year = getEffectiveSchoolYear(calendar, config.schoolYearStart, today);
  const lifecycle = detectChapterLifecycles(lessons, { start: year.debut, end: year.fin, today });
  // Resolve confirmed links once. User-facing and engine calculations share one strict circuit.
  const associations = chapterAssociations(classInfo, lessons, curriculum);
  const linkedIndices = new Map<string, number[]>();
  for (const [index, id] of Object.entries(associations)) {
    const group = linkedIndices.get(id) ?? [];
    group.push(Number(index)); linkedIndices.set(id, group);
  }
  const rows = curriculum.chapters.map(officialChapter => {
    const indices = linkedIndices.get(officialChapter.id) ?? [];
    const chapters = indices.map(index => lifecycle.chapters.get(index)!);
    const itemsCount = chapters.reduce((sum, chapter) => sum + chapter.itemsCount, 0);
    const issue = chapters.find(chapter => chapter.issue)?.issue ?? null;
    const rate = !itemsCount || chapters.some(chapter => chapter.completionRate === null) ? null
      : chapters.reduce((sum, chapter) => sum + chapter.completionRate! * chapter.itemsCount, 0) / itemsCount;
    const startDate = chapters[0]?.startDate;
    const completed = chapters.length > 0 && chapters.every(chapter => chapter.state === 'completed');
    const endDate = completed ? chapters.map(chapter => chapter.endDate!).sort().at(-1) : undefined;
    return { officialChapter, indices, startDate, endDate, issue, itemsCount, estimatedStart: undefined as string | undefined,
      estimatedEnd: undefined as string | undefined, completionRate: rate, expectedRate: null as number | null,
      status: !indices.length ? 'unmatched' : issue ? 'inconsistent' : completed ? 'completed' : chapters.some(chapter => chapter.state === 'in_progress' || chapter.state === 'completed') ? 'in_progress' : startDate ? 'scheduled' : 'not_started',
      estimatedHoursSpent: officialChapter.allocatedHours === null || rate === null ? null : rate * officialChapter.allocatedHours };
  });
  // Legacy class-level overrides are deliberately ignored: only the title's table date counts.
  const courseStartDate = rows[0]?.startDate;
  const sessions: { date: string; hours: number }[] = [];
  if (courseStartDate && courseStartDate >= year.debut && courseStartDate <= year.fin && curriculum.schoolYear === year.libelle
    && curriculum.schoolYear === schoolYearLabelFromDate(config.schoolYearStart || today)) {
    const classTimetable = config.timetable?.filter(entry => entry.classId === classInfo.id) ?? [];
    const hoursByWeekday = Array.from({ length: 7 }, (_, day) => getDaySessionBlocks(classTimetable, day).reduce((sum, block) => sum + block.hours, 0));
    const date = new Date(`${courseStartDate}T12:00:00Z`);
    for (let n = 0; n < 370; n++, date.setUTCDate(date.getUTCDate() + 1)) {
      const iso = date.toISOString().slice(0, 10);
      if (iso > year.fin) break;
      if (isHoliday(iso, calendar) || isVacation(iso, calendar)
        || config.absences?.some(absence => iso >= absence.debut && iso <= absence.fin)) continue;
      const hours = hoursByWeekday[date.getUTCDay()];
      const reserved = options.reservedHours?.[iso];
      const available = Math.max(0, hours - (Number.isFinite(reserved) ? Math.max(0, reserved!) : 0));
      if (available) sessions.push({ date: iso, hours: available });
    }
  }
  let cursor = 0;
  let consumed = 0;
  let uncertain = false;
  // Date-only notebook entries cannot locate the teacher within today's session.
  // Compare against completed calendar days, not an invented live teaching clock.
  const elapsedScheduledHours = sessions.filter(session => session.date < today).reduce((sum, session) => sum + session.hours, 0);
  let precedingHours = 0;
  for (const row of rows) {
    const hours = row.officialChapter.allocatedHours;
    if (hours === null) uncertain = true;
    if (!uncertain && sessions.length) {
      row.expectedRate = Math.min(1, Math.max(0, (elapsedScheduledHours - precedingHours) / hours!));
      precedingHours += hours!;
    }
    if (uncertain || !sessions[cursor]) continue;
    row.estimatedStart = sessions[cursor].date;
    let remaining = hours!;
    while (remaining > 0 && sessions[cursor]) {
      const amount = Math.min(remaining, sessions[cursor].hours - consumed);
      remaining -= amount;
      consumed += amount;
      if (remaining === 0) row.estimatedEnd = sessions[cursor].date;
      if (consumed >= sessions[cursor].hours) { cursor++; consumed = 0; }
    }
  }
  const knownHours = rows.reduce((sum, row) => sum + (row.officialChapter.allocatedHours ?? 0), 0);
  const estimatedHours = rows.reduce((sum, row) => sum + (row.estimatedHoursSpent ?? 0), 0);
  const fullyMapped = rows.every(row => row.indices.length > 0 && row.completionRate !== null && row.officialChapter.allocatedHours !== null);
  const expectedHours = Math.min(knownHours, elapsedScheduledHours);
  const diagnostic = new Set(lifecycle.diagnosticDates);
  for (const event of config.pedagogicalEvents?.[classInfo.id] ?? []) {
    if (event.type === 'evaluation_diagnostic' && event.status === 'done' && event.date <= today && event.date >= year.debut) diagnostic.add(event.date);
  }
  return { curriculum, rows, courseStartDate, knownHours, estimatedHours, fullyMapped,
    diagnosticDates: [...diagnostic].sort(), projectionAvailable: sessions.length > 0,
    completionRate: fullyMapped && knownHours ? Math.round(estimatedHours / knownHours * 100) : null,
    expectedRate: rows.every(row => row.expectedRate !== null) && knownHours ? Math.round(expectedHours / knownHours * 100) : null,
    deltaHours: fullyMapped && sessions.length ? Math.round((estimatedHours - expectedHours) * 10) / 10 : null };
}
