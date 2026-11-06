import { performance } from 'node:perf_hooks';
import { buildLessonRows } from '../../src/domain/notebook/lessonRows';
import { groupRowsWithAbsences, type AbsenceSession } from '../../src/domain/notebook/absenceSessions';
import { groupLessonRows } from '../../src/domain/notebook/tableRows';
import { addDaysIso } from '../../src/domain/notebook/dataUtils';
import { sessionPrintSignatures, collectSessionDates } from '../../src/infrastructure/printing/printMeta';
import { buildContentNumbers } from '../../src/domain/notebook/contentNumbering';
import { buildContentDateOrder } from '../../src/domain/calendar/dateOrder';
import type { LessonsData } from '../../src/types';

/*
 * Reproducible projection benchmark: no user data, no network, no file writes.
 * It measures the work a single notebook edit asks for on a large notebook.
 * Run with `npm run bench:editor`.
 */
const chapters = 12;
const sectionsPerChapter = 4;
const itemsPerSection = 25;
let day = 0;

const lessons: LessonsData = Array.from({ length: chapters }, (_, chapter) => ({
  type: 'chapter' as const,
  title: `Chapitre ${chapter + 1}`,
  date: `2026-09-${String((chapter % 20) + 1).padStart(2, '0')}`,
  sections: Array.from({ length: sectionsPerChapter }, (_, section) => ({
    name: `Section ${section + 1}`,
    items: Array.from({ length: itemsPerSection }, (_, item) => {
      const current = day++;
      return {
        type: item % 5 === 0 ? 'définition' : 'exercice',
        title: `Contenu ${chapter}-${section}-${item}`,
        description: 'Un énoncé de longueur moyenne avec une formule $x^2+1$ et du texte.',
        ...(current % 3 === 0 ? { date: `2026-10-${String((current % 28) + 1).padStart(2, '0')}` } : {}),
        ...(item % 7 === 0 ? { remark: 'Séance travaillée en classe.' } : {}),
      };
    }),
  })),
}));

const rows = buildLessonRows(lessons);
// One explicit gap inside the course: exercises the projected (uncached) path
// even when the synthetic timetable yields no administrative session.
const sessions: AbsenceSession[] = [{ date: '2026-10-09', reasons: ['Maladie'] }];

/** Projection equivalent to the pre-cache implementation, for comparison. */
const groupWithoutCache = (source: typeof rows, gaps: readonly AbsenceSession[]) => {
  let gap = 0;
  let previousDate = '';
  const projected = source.map(row => {
    const date = addDaysIso(row.data.date, 0);
    if (date && previousDate && gaps.some(session => session.date >= previousDate && session.date < date)) gap++;
    if (date) previousDate = date;
    return { ...row, position: row.position + gap };
  });
  return groupLessonRows(projected);
};

const samples = (run: () => void, count = 40) => {
  run();
  const values = Array.from({ length: count }, () => { const start = performance.now(); run(); return performance.now() - start; })
    .sort((a, b) => a - b);
  return { medianMs: +values[Math.floor(count / 2)].toFixed(3), p95Ms: +values[Math.floor(count * 0.95)].toFixed(3) };
};

const results = {
  rows: rows.length,
  absenceSessions: sessions.length,
  buildRowsCold: samples(() => buildLessonRows(structuredClone(lessons)), 15),
  // What the editor pays first…
  groupingWithoutCache: samples(() => groupWithoutCache(rows, sessions), 20),
  // …then the table asks for the same projection in the same render.
  groupingCached: samples(() => groupRowsWithAbsences(rows, sessions), 20),
  printSignatures: samples(() => sessionPrintSignatures(lessons, sessions), 20),
  contentNumbers: samples(() => buildContentNumbers(lessons, true), 20),
  contentDateOrder: samples(() => buildContentDateOrder(lessons), 20),
  collectSessionDates: samples(() => collectSessionDates(lessons, sessions), 20),
};
console.log(JSON.stringify(results, null, 2));
