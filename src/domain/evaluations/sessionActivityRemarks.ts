import type { AppConfig } from '../../types';
import { addDaysIso, parseDateInput } from '../notebook/dataUtils';
import { buildNotebookCheckRemarks, coveredDates, notebookCheckRemarkText } from './notebookCheckRemarks';

type ActivitySettings = Pick<AppConfig, 'pedagogicalEvents' | 'manualAssessments' | 'assessmentDates' | 'removedAssessments'>;
type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Display-only annotations: activities stay in settings, outside the course
 * hierarchy. Only an entered date connects an activity to a dated session. */
export function buildSessionActivityRemarks(config: ActivitySettings, classId: string, translate: Translate,
  separator: string): Map<string, string> {
  const byDate = new Map<string, Set<string>>();
  const add = (rawDate: string, text: string) => {
    if (!parseDateInput(rawDate) || !text.trim()) return;
    const date = addDaysIso(rawDate, 0);
    const texts = byDate.get(date) ?? new Set<string>();
    texts.add(text.trim());
    byDate.set(date, texts);
  };
  for (const event of config.pedagogicalEvents?.[classId] ?? []) {
    if (event.type === 'controle_cahiers') {
      for (const [date, mark] of buildNotebookCheckRemarks([event])) {
        add(date, notebookCheckRemarkText({ ...mark, title: mark.title || translate('evaluations.event.controle_cahiers') }, translate, separator));
      }
    } else if (event.type === 'remediation') {
      const title = event.title.trim() || translate('evaluations.event.remediation');
      coveredDates(event).forEach(date => add(date, title));
    }
  }
  const removed = new Set(config.removedAssessments?.[classId] ?? []);
  const dates = config.assessmentDates?.[classId] ?? {};
  const manual = config.manualAssessments?.[classId] ?? [];
  for (const assessment of manual) {
    if (assessment.type === 'oral' && !removed.has(assessment.id)) {
      add(dates[assessment.id] || assessment.dateISO, translate('evaluations.type.oral'));
    }
  }
  // Official oral assessments enter here only after the teacher chooses a
  // date. Predicted planning dates never announce an activity as completed.
  for (const [id, date] of Object.entries(dates)) {
    if (removed.has(id) || manual.some(assessment => assessment.id === id)) continue;
    const legacyId = id.split(':').at(-1)!;
    if (!/^s[12]-oral\d+$/.test(legacyId) || removed.has(legacyId)) continue;
    if (id === legacyId && Object.keys(dates).some(key => key.endsWith(`:${legacyId}`))) continue;
    add(date, translate('evaluations.type.oral'));
  }
  return new Map([...byDate].map(([date, texts]) => [date, [...texts].join('\n')]));
}
