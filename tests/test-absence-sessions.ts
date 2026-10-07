import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAbsenceSessions, withAbsenceRows, groupRowsWithAbsences } from '../src/domain/notebook/absenceSessions';
import { buildLessonRows } from '../src/domain/notebook/lessonRows';
import { buildContentNumbers } from '../src/domain/notebook/contentNumbering';
import { collectSessionDates, createPrintSelection, getNewDates, sessionPrintSignatures, type PrintMeta } from '../src/infrastructure/printing/printMeta';
import { extractSyncableSettings, mergeSyncableSettings } from '../src/infrastructure/sync/syncSettings';
import { readLocalSyncSnapshot } from '../src/infrastructure/sync/localSnapshot';
import type { AppConfig, LessonsData } from '../src/types';

const lessons = [{ type: 'chapter', title: 'Chapitre', sections: [{ title: 'Section', subsections: [
    { title: 'Sous-section', subsubsections: [{ title: 'Détail', items: [
        { type: 'exercice', title: 'Avant', date: '2026-09-07' },
        { type: 'exercice', title: 'Après', date: '2026-09-21' },
    ] }] },
] }] }] as unknown as LessonsData;
const config = { absences: [{ debut: '2026-09-14', fin: '2026-09-21', motif: 'Maladie' }],
    timetable: [{ day: 1, slot: 0, classId: 'A' }, { day: 1, slot: 2, classId: 'A' }, { day: 2, slot: 0, classId: 'B' }],
} as AppConfig;

test('absence dates come from this class timetable and every depth of the notebook', () => {
    assert.deepEqual(buildAbsenceSessions(config, 'A', lessons), [
        { date: '2026-09-14', reasons: ['Maladie'] }, { date: '2026-09-21', reasons: ['Maladie'] },
    ]);
    assert.deepEqual(buildAbsenceSessions({ ...config, timetable: [] }, 'A', lessons),
        [{ date: '2026-09-21', reasons: ['Maladie'] }]);
    assert.deepEqual(buildAbsenceSessions(config, 'C', []), [], 'no dates from another class');
});

test('overlaps have one row per date, collect reasons, and disappear with the setting', () => {
    const overlap = { ...config, absences: [...config.absences!, { debut: '2026-09-14', fin: '2026-09-14', motif: 'Repos' }] };
    assert.deepEqual(buildAbsenceSessions(overlap, 'A', lessons)[0], { date: '2026-09-14', reasons: ['Maladie', 'Repos'] });
    assert.deepEqual(buildAbsenceSessions({ ...config, absences: [] }, 'A', lessons), []);
});

test('display projection preserves hierarchy, indices, numbering and source order', () => {
    const original = structuredClone(lessons);
    const rows = buildLessonRows(lessons);
    const numbers = buildContentNumbers(lessons);
    const display = withAbsenceRows(rows, buildAbsenceSessions(config, 'A', lessons), row => row.data.date ? [row.data.date] : []);
    const dateRows = display.filter(row => 'kind' in row || row.data.date);
    assert.deepEqual(dateRows.map(row => 'kind' in row ? row.session.date : row.data.date),
        ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-21']);
    assert.deepEqual(display.filter(row => !('kind' in row)), rows);
    assert.deepEqual(lessons, original);
    assert.deepEqual(buildContentNumbers(lessons), numbers);
    for (const row of display) if ('kind' in row) assert.ok(!('indices' in row));
});

test('print dates, filtered jobs and new-content detection include independent absences', () => {
    const sessions = buildAbsenceSessions(config, 'A', lessons);
    assert.deepEqual(collectSessionDates(lessons, sessions), ['2026-09-07', '2026-09-14', '2026-09-21']);
    const signatures = sessionPrintSignatures(lessons, sessions);
    const meta: PrintMeta = { version: 2, lastPrintedAt: null, printedDates: Object.keys(signatures), confirmedContent: signatures };
    assert.deepEqual(getNewDates(lessons, 'A', meta, sessions), []);
    assert.deepEqual(getNewDates(lessons, 'A', meta, [{ ...sessions[0], reasons: ['Modifié'] }, sessions[1]]), ['2026-09-14']);
    assert.deepEqual(getNewDates(lessons, 'A', meta, []), ['2026-09-21'], 'removing a certificate changes a printed course date');
    assert.deepEqual(createPrintSelection(lessons, ['2026-09-14']), [], 'absence-only print contains no borrowed chapter');
    assert.ok(signatures['2026-09-14'], 'absence-only date has its own print revision');
});


test('repeated contents cannot visually merge across a certificate, with editing indices preserved', () => {
    const repeated = [{ type: 'chapter', title: 'Cours', items: [
        { type: 'exercice', title: 'Identique', date: '2026-09-07' },
        { type: 'exercice', title: 'Identique', date: '2026-09-21' },
    ] }] as LessonsData;
    const source = buildLessonRows(repeated);
    const grouped = groupRowsWithAbsences(source, [{ date: '2026-09-14', reasons: [] }]);
    assert.equal(grouped.renderRows.length, 3);
    assert.deepEqual(grouped.flatData.map(row => row.indices), source.map(row => row.indices));
    const display = withAbsenceRows(grouped.renderRows, [{ date: '2026-09-14', reasons: [] }],
        row => (row.kind === 'single' ? [row.item] : row.items).flatMap(item => item.data.date ? [item.data.date] : []));
    assert.deepEqual(display.map(row => row.kind), ['single', 'single', 'absence', 'single']);
});

test('cloud settings restore the same dates while notebook JSON contains only the course tree', () => {
    const remote = extractSyncableSettings(config);
    const restored = mergeSyncableSettings({ absences: [] }, JSON.parse(JSON.stringify(remote)));
    assert.deepEqual(buildAbsenceSessions(restored, 'A', lessons), buildAbsenceSessions(config, 'A', lessons));
    const values: Record<string, string> = {
        appConfig_v1: JSON.stringify(restored), classManager_v1: JSON.stringify([{ id: 'A', name: 'Classe A' }]),
        classData_v1_A: JSON.stringify({ lessonsData: lessons, contentDirection: 'ltr' }),
    };
    const snapshot = readLocalSyncSnapshot({ getItem: key => values[key] ?? null });
    assert.deepEqual(snapshot.notebooks.get('A')?.lessonsData, lessons);
    assert.deepEqual(buildAbsenceSessions(snapshot.config, 'A', snapshot.notebooks.get('A')!.lessonsData), buildAbsenceSessions(config, 'A', lessons));
    const deleted = mergeSyncableSettings(restored, extractSyncableSettings({ ...config, absences: [] }));
    assert.deepEqual(buildAbsenceSessions(deleted, 'A', lessons), [], 'remote deletion removes the display row too');
});


test('legacy French dates connect to ISO absence dates and custom print selection', () => {
    const legacy = [{ type: 'chapter', title: 'Cours', items: [
        { type: 'exercice', title: 'Séance', date: '21/09/2026' },
    ] }] as LessonsData;
    const sessions = buildAbsenceSessions({ ...config, timetable: [] }, 'A', legacy);
    assert.deepEqual(sessions, [{ date: '2026-09-21', reasons: ['Maladie'] }]);
    assert.deepEqual(collectSessionDates(legacy, sessions), ['2026-09-21']);
    assert.equal(createPrintSelection(legacy, ['2026-09-21']).length, 1);
    assert.equal(Object.keys(sessionPrintSignatures(legacy, sessions)).length, 1);
});
