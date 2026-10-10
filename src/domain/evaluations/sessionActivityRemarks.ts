import type { AppConfig, LessonsData } from '../../types';
import { homeworkSessionResolver, sessionDateKeys } from './homeworkPlacement';
import { findNotebookAssessments } from './assessmentSync';
import { addDaysIso, parseDateInput } from '../notebook/dataUtils';
import { buildNotebookCheckRemarks, coveredDates, notebookCheckRemarkText } from './notebookCheckRemarks';

type ActivitySettings = Pick<AppConfig, 'pedagogicalEvents' | 'manualAssessments' | 'assessmentDates' | 'removedAssessments' | 'sessionRemarkOverrides'>;
type Translate = (key: string, values?: Record<string, string | number>) => string;
export interface SessionRemarkEntry { id: string; text: string; originalText: string; hidden: boolean; }

/** Display-only annotations: activities stay in settings, outside the course
 * hierarchy. Only an entered date connects an activity to a dated session. */
export function buildSessionRemarkEntries(config: ActivitySettings, classId: string, translate: Translate,
  separator: string, lessons?: LessonsData): Map<string, SessionRemarkEntry[]> {
  const homeworkSession = homeworkSessionResolver(lessons);
  const byDate = new Map<string, SessionRemarkEntry[]>();
  const add = (rawDate: string, text: string, id: string) => {
    if (!parseDateInput(rawDate) || !text.trim()) return;
    const date = addDaysIso(rawDate, 0);
    const texts = byDate.get(date) ?? [];
    const overrides = config.sessionRemarkOverrides?.[classId];
    const override = overrides?.[id] ?? (id.startsWith('assessment:') ? overrides?.[`assessment:${id.split(':').at(-1)}`] : undefined);
    if (!texts.some(entry => entry.id === id)) texts.push({ id, originalText: text.trim(), text: override?.text ?? text.trim(), hidden: override?.hidden === true });
    byDate.set(date, texts);
  };
  for (const event of config.pedagogicalEvents?.[classId] ?? []) {
    if (event.type === 'controle_cahiers') {
      for (const [date, mark] of buildNotebookCheckRemarks([event])) {
        add(date, notebookCheckRemarkText({ ...mark, title: mark.title || translate('evaluations.event.controle_cahiers') }, translate, separator), `event:${event.id}`);
      }
    } else if (event.type === 'remediation') {
      const title = event.title.trim() || translate('evaluations.event.remediation');
      coveredDates(event).forEach(date => add(date, title, `event:${event.id}`));
    } else if (event.type === 'soutien') {
      const title = event.title.trim() || translate('evaluations.event.soutien');
      coveredDates(event).forEach(date => add(date, title, `event:${event.id}`));
    } else if (event.type === 'rattrapage') {
      const title = event.title.trim() || translate('evaluations.event.rattrapage');
      coveredDates(event).forEach(date => add(date, title, `event:${event.id}`));
    }
  }
  const removed = new Set(config.removedAssessments?.[classId] ?? []);
  const dates = config.assessmentDates?.[classId] ?? {};
  const manual = config.manualAssessments?.[classId] ?? [];
  const knownIds = [...new Set([...Object.keys(dates), ...manual.map(item => item.id)])];
  const canonical = (id: string) => {
    if (id.includes(':')) return id;
    const candidates = knownIds.filter(key => key.endsWith(`:${id}`));
    return candidates.length === 1 ? candidates[0] : id;
  };
  const deleted = (id: string) => removed.has(id) || removed.has(canonical(id)) || removed.has(id.split(':').at(-1)!);
  const manualIds = new Set(manual.map(item => canonical(item.id)));
  for (const assessment of manual) {
    const id = canonical(assessment.id);
    const date = dates[id] || dates[assessment.id] || assessment.dateISO;
    if (assessment.type === 'oral' && !deleted(assessment.id)) {
      add(date, translate('evaluations.type.oral'), `assessment:${id}`);
    } else if (assessment.type === 'maison' && !deleted(assessment.id)) {
      const num = assessment.num ? String(assessment.num) : '';
      const text = num
        ? translate('remark.devoirMaisonGiven', { num })
        : translate('remark.devoirMaisonGivenSimple');
      add(homeworkSession(date, true), text, `assessment:${id}`);
    }
  }
  // Official oral and homework assessments enter here only after the teacher chooses a
  // date. Predicted planning dates never announce an activity as completed.
  for (const [id, date] of Object.entries(dates)) {
    if (deleted(id) || manualIds.has(canonical(id))) continue;
    const legacyId = id.split(':').at(-1)!;
    if (removed.has(legacyId)) continue;
    if (id === legacyId && Object.keys(dates).some(key => key.endsWith(`:${legacyId}`))) continue;
    if (/^s[12]-oral\d+$/.test(legacyId)) {
      add(date, translate('evaluations.type.oral'), `assessment:${id}`);
    } else if (/^s[12]-maison\d+$/.test(legacyId) || /(?:^|:)maison-?\d*/i.test(id) || /(?:^|-)maison\d*/i.test(legacyId)) {
      const numMatch = legacyId.match(/\d+$/) ?? id.match(/\d+$/);
      const num = numMatch ? numMatch[0] : '';
      const text = num
        ? translate('remark.devoirMaisonGiven', { num })
        : translate('remark.devoirMaisonGivenSimple');
      add(homeworkSession(date, true), text, `assessment:${id}`);
    }
  }
  // Legacy notebook-only homework stays visible in remarks after its row is hidden.
  for (const entry of lessons ? findNotebookAssessments(lessons) : []) {
    if (entry.type !== 'maison' || !entry.date || (entry.assessmentId && removed.has(entry.assessmentId))) continue;
    const id = entry.assessmentId ? canonical(entry.assessmentId) : undefined;
    if (id && (dates[id] || manualIds.has(id) || deleted(id))) continue;
    // Notebook imports without stable IDs are reconciled by type and ordinal.
    // Once their activity exists, the compatibility row cannot announce it twice.
    if (!id && manual.filter(item => item.type === 'maison' && item.num === entry.num).length === 1) continue;
    add(homeworkSession(entry.date), translate('remark.devoirMaisonGiven', { num: entry.num }), `assessment:${entry.assessmentId ?? `legacy-maison-${entry.num}`}`);
  }
  return byDate;
}

export function buildSessionActivityRemarks(config: ActivitySettings, classId: string, translate: Translate,
  separator: string, lessons?: LessonsData): Map<string, string> {
  return sessionRemarkTextMap(buildSessionRemarkEntries(config, classId, translate, separator, lessons));
}

export function sessionRemarkTextMap(entries: ReadonlyMap<string, readonly SessionRemarkEntry[]>): Map<string, string> {
  return new Map([...entries]
    .map(([date, entries]) => [date, [...new Set(entries.filter(entry => !entry.hidden && entry.text.trim()).map(entry => entry.text.trim()))].join('\n')] as const)
    .filter(([, text]) => !!text));
}

export const remarksForSessionDates = (remarks: ReadonlyMap<string, string>, raw?: string): string | undefined =>
  [...new Set(sessionDateKeys(raw).flatMap(date => remarks.get(date)?.split('\n') ?? []))].join('\n') || undefined;
