import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { toDisplayWarnings, validateSessionDate } from '../src/domain/calendar/dateValidation';
import { computeLateness } from '../src/domain/calendar/lateness';
import { analyseSessionProgression } from '../src/domain/notebook/sessionProgression';
import { bundledCurricula, computeOfficialProgression } from '../src/domain/curriculum/officialCurriculum';
import {
    getClassExamsOn,
    getClassTeachingEnd,
    getClassTeachingEndForYear,
    getOfficialStudentEventsFile,
    getOfficialStudentEventsForClass,
    type OfficialStudentEventsFile,
} from '../src/domain/evaluations/officialStudentEvents';
import { getBundledCalendar, type HolidayCalendar } from '../src/domain/calendar/calendar';
import type { AppConfig, ClassInfo, Cycle, OfficialCurriculumPlan } from '../src/types';

/*
 * Le bulletin officiel (fin des cours, examens) alimente les mêmes calculs que
 * le calendrier : séances attendues, séances manquées, projection du programme
 * et contrôle des dates. Aucun second calendrier n'est créé.
 */
const YEAR = { libelle: '2026-2027', debut: '2026-09-07' };
const bac2 = { id: 'b2', name: '2ème Bac Sciences Physiques', cycle: 'lycee' as const, subject: 'Mathématiques' };
const ac3 = { id: 'a3', name: '3AC 2', cycle: 'college' as const, subject: 'Mathématiques' };
const ac1 = { id: 'a1', name: '1AC 1', cycle: 'college' as const, subject: 'Mathématiques' };
const warningTypes = (date: string, info: { id: string; name: string; cycle: Cycle; subject: string }) => validateSessionDate(date, info, {}, 'fr').map(warning => warning.type);

test('la fin des cours vient du bulletin officiel, par niveau, et seulement pour son année', () => {
    assert.equal(getClassTeachingEnd(bac2, YEAR), '2027-05-29');
    assert.equal(getClassTeachingEnd(ac3, YEAR), '2027-06-26');
    assert.equal(getClassTeachingEnd(ac1, YEAR), '2027-06-26');
    assert.equal(getClassTeachingEnd({ ...bac2, name: '1er Bac Sciences Mathématiques' }, YEAR), '2027-06-26');
    // La rentrée est aussi un événement « école » : elle ne ferme jamais les cours.
    assert.notEqual(getClassTeachingEnd(ac1, YEAR), '2026-09-07');
    // Un bulletin 2026-2027 ne dit rien de l'année 2025-2026.
    assert.equal(getClassTeachingEnd(bac2, { libelle: '2025-2026', debut: '2025-09-08' }), null);
    assert.equal(getClassTeachingEndForYear(bac2, getBundledCalendar(), '2026-09-07'), '2027-05-29');
});

test('les examens fixes du bulletin sont reconnus le jour même, jamais les fenêtres indicatives', () => {
    assert.equal(getClassExamsOn(ac3, '2027-06-23').length, 1);
    assert.equal(getClassExamsOn(ac3, '2027-06-24').length, 1);
    assert.equal(getClassExamsOn(ac3, '2027-06-25').length, 0);
    assert.equal(getClassExamsOn(ac1, '2027-06-23').length, 0, 'le 3AC seul passe cet examen');
    assert.equal(getClassExamsOn(bac2, '2027-06-02').length, 1);
});

test('une date après la fin des cours ou un jour d’examen est signalée, dans les trois langues', () => {
    assert.deepEqual(warningTypes('2027-05-28', bac2), []);
    assert.deepEqual(warningTypes('2027-05-29', bac2), [], 'le dernier jour de cours reste valide');
    assert.ok(warningTypes('2027-06-10', bac2).includes('study-ended'));
    assert.ok(!warningTypes('2027-06-10', { ...bac2, name: '1er Bac Sciences Mathématiques' }).includes('study-ended'));
    assert.ok(warningTypes('2027-06-23', ac3).includes('official-exam'));
    assert.ok(!warningTypes('2027-06-23', ac1).includes('official-exam'));
    for (const locale of ['fr', 'ar', 'en'] as const) {
        const messages = validateSessionDate('2027-06-02', bac2, {}, locale).map(warning => warning.message);
        assert.equal(messages.length, 2, locale);
        assert.ok(messages.every(message => message.trim() && !message.includes('dateWarning.') && !message.includes('{')), `${locale}: ${messages.join(' | ')}`);
    }
    // Hors de l'année scolaire, seul le message « hors année » parle : pas de double alerte.
    assert.ok(!warningTypes('2027-08-10', bac2).includes('study-ended'));
});

test('ces alertes de planification disparaissent sur une séance passée, pas les faits du calendrier', () => {
    const date = '2027-06-02';
    const warnings = validateSessionDate(date, bac2, {}, 'fr');
    assert.deepEqual(toDisplayWarnings(warnings, date, '2027-06-20'), []);
    assert.deepEqual(toDisplayWarnings(warnings, date, '2027-06-01').map(item => item.type).sort(), ['official-exam', 'study-ended']);
    const holiday = validateSessionDate('2026-11-18', bac2, {}, 'fr');
    assert.ok(toDisplayWarnings(holiday, '2026-11-18', '2027-01-01').some(item => item.type === 'holiday'));
});

test('une classe dont les cours sont clos n’accumule plus ni retard ni séance attendue', () => {
    const calendar = getBundledCalendar();
    const slots = [{ weekday: 1 }, { weekday: 3 }];
    const base = { slots, calendar, sessionsCount: 0, from: '2027-05-03', today: '2027-06-20' };
    const open = computeLateness(base);
    const closed = computeLateness({ ...base, teachingEnd: '2027-05-29' });
    const atEnd = computeLateness({ ...base, today: '2027-05-29' });
    assert.ok(open.expectedSessions > closed.expectedSessions);
    assert.equal(closed.expectedSessions, atEnd.expectedSessions);
    assert.equal(computeLateness({ ...base, teachingEnd: '2027-12-31' }).expectedSessions, open.expectedSessions, 'une fin future ne change rien');

    const withEnd = analyseSessionProgression([], slots, '2027-06-20', calendar, '2027-05-29');
    const withoutEnd = analyseSessionProgression([], slots, '2027-06-20', calendar);
    assert.ok(withoutEnd.expectedSessions > withEnd.expectedSessions);
    assert.ok(withEnd.missing.every(date => date <= '2027-05-29'));
});

test('la projection du programme s’arrête à la fin des cours du niveau', () => {
    const calendar: HolidayCalendar = { version: 1, pays: 'Maroc', fuseau: 'Africa/Casablanca', anneeScolaire: { libelle: '2026-2027', debut: '2026-09-07', fin: '2027-06-30' }, joursFeries: [], vacances: [] };
    const classInfo: ClassInfo = { id: 'c1', name: '1AC 1', level: '1AC', cycle: 'college', subject: 'Mathématiques', teacherName: '', color: '', createdAt: '2026-09-01', curriculumChapterMatches: { a: [{ index: 1, title: 'A' }], b: [{ index: 2, title: 'B' }] } };
    const config: AppConfig = { establishmentName: '', defaultTeacherName: '', printShowDescriptions: true, timetable: [{ day: 1, slot: 0, classId: 'c1' }] };
    const plan: OfficialCurriculumPlan = { ...bundledCurricula.plans.find(item => item.id === '1ac-mouzoun')!, chapters: [{ id: 'a', order: 1, semester: 1, title: 'A', allocatedHours: 3 }, { id: 'b', order: 2, semester: 1, title: 'B', allocatedHours: 30 }] };
    const lessons = [{ type: 'evaluation_diagnostic' as const, title: 'Diagnostic', date: '2026-09-07' }, { type: 'chapter' as const, title: 'A', date: '2026-09-14', items: [{ type: 'définition' as const, date: '2026-09-14' }] }, { type: 'chapter' as const, title: 'B', items: [{ type: 'définition' as const }] }];
    const bulletin = (start: string): OfficialStudentEventsFile => ({
        ...getOfficialStudentEventsFile(),
        events: [{ id: 'end-study-test', category: 'school', title: 'Fin des cours', start, levels: ['college'], dateKind: 'fixed', studentAction: 'Clôture des cours.', sourcePage: 1 }],
    });
    const run = (officialEvents?: OfficialStudentEventsFile) =>
        computeOfficialProgression(classInfo, lessons, { curriculum: plan, config, calendar, today: '2026-09-15', ...(officialEvents ? { officialEvents } : {}) });

    const uncapped = run(bulletin('2027-06-28'));
    const capped = run(bulletin('2026-12-14'));
    assert.ok(uncapped.rows[1].estimatedEnd, 'sans fermeture proche, le chapitre B tient dans l’année');
    assert.equal(capped.rows[1].estimatedEnd, undefined, 'le chapitre B ne peut pas finir après la fin des cours');
    assert.ok(capped.rows.every(row => !row.estimatedStart || row.estimatedStart <= '2026-12-14'));
});

test('tous les niveaux du collège et du lycée sont couverts par le bulletin ; les classes préparatoires non', () => {
    for (const name of ['1AC', '2AC', '3AC', 'Tronc Commun Technologique', '1er Bac Lettres et Sciences Humaines', '2ème Bac Sciences de Gestion Comptable', '2ème Bac Lettres']) {
        assert.ok(getClassTeachingEnd({ name: `${name} 1`, subject: 'Histoire-Géographie' }, YEAR), name);
    }
    for (const name of ['1re année MPSI', '2e année ECS']) {
        assert.deepEqual(getOfficialStudentEventsForClass({ name, cycle: 'prepa', subject: 'Mathématiques' }), [], name);
        assert.deepEqual(getOfficialStudentEventsForClass({ name, subject: 'Mathématiques' }), [], `${name} sans cycle renseigné`);
        assert.equal(getClassTeachingEnd({ name, cycle: 'prepa', subject: 'Mathématiques' }, YEAR), null);
    }
});

test('les séances manquées ne sont plus réclamées après la fin des cours', () => {
    for (const file of ['TeacherList', 'TeacherDetail', 'ClassProgression']) {
        assert.match(readFileSync(`src/admin/components/${file}.tsx`, 'utf8'), /getClassTeachingEndForYear\(/, file);
    }
});

test('le gestionnaire du calendrier modifie les bornes de chaque année, et ne promet plus de cron', () => {
    const manager = readFileSync('src/admin/components/CalendarManager.tsx', 'utf8');
    assert.match(manager, /updateYear\(index, \{ debut: e\.target\.value \}\)/);
    assert.match(manager, /updateYear\(index, \{ fin: e\.target\.value \}\)/);
    assert.doesNotMatch(manager, /\bcron\b/i);
});
