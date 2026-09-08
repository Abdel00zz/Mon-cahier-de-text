import assert from 'node:assert/strict';
import test from 'node:test';
import { bundledCurricula, chapterAssociations, computeOfficialProgression, findCurricula, findMatchingCurriculum, validateCurriculumCatalog } from '../utils/officialCurriculum';
import { assertValidClasses } from '../api/_lib/validate';
import { withCurriculumSettings } from '../utils/classCurriculumSettings';
import { detectSessionAlerts, moroccoClockMinutes } from '../utils/sessionAlertEngine';
import { getHourSlots, normalizeTimetableClock } from '../utils/timetable';
import type { AppConfig, ClassInfo, LessonsData, OfficialCurriculumPlan } from '../types';
import type { HolidayCalendar } from '../utils/calendar';

const classInfo: ClassInfo = { id: 'c1', name: '1AC 1', level: '1AC', cycle: 'college', subject: 'Mathématiques', teacherName: '', color: '', createdAt: '2026-09-01', curriculumChapterMatches: { a: [{ index: 1, title: 'A' }], b: [{ index: 2, title: 'B' }] } };
const calendar: HolidayCalendar = { version: 1, pays: 'Maroc', fuseau: 'Africa/Casablanca', anneeScolaire: { libelle: '2026-2027', debut: '2026-09-07', fin: '2027-06-30' }, joursFeries: [], vacances: [] };
const config: AppConfig = { establishmentName: '', defaultTeacherName: '', printShowDescriptions: true, timetable: [{ day: 1, slot: 0, classId: 'c1' }, { day: 1, slot: 1, classId: 'c1' }], notificationSettings: { enabled: true, pushEnabled: false, sessionVibration: false, sessionEndReminderEnabled: true, missingDateReminderEnabled: true, quietDuringVacations: true, gapThreshold: 2, inactivityThresholdDays: 5 } };
const plan: OfficialCurriculumPlan = { ...bundledCurricula.plans.find(item => item.id === '1ac-mouzoun')!, chapters: [{ id: 'a', order: 1, semester: 1, title: 'A', allocatedHours: 3 }, { id: 'b', order: 2, semester: 1, title: 'B', allocatedHours: 1 }] };
const lessons: LessonsData = [{ type: 'evaluation_diagnostic', title: 'Diagnostic', date: '2026-09-07' }, { type: 'chapter', title: 'A', date: '2026-09-14', items: [{ type: 'définition', date: '2026-09-14' }, { type: 'exercice', date: '2026-12-07' }] }, { type: 'chapter', title: 'B', items: [{ type: 'définition' }] }];
const analyse = (info = classInfo, data = lessons, overrides = {}) => computeOfficialProgression(info, data, { curriculum: plan, config, calendar, today: '2026-09-15', ...overrides });
const detect = (time: string, patch: Partial<AppConfig> = {}, dated = false) => detectSessionAlerts({ ...config, ...patch }, [classInfo], calendar, new Date(`2026-09-14T${time}+01:00`), () => dated);

test('all reviewed plans validate; invalid hours/order and dates reject the update', () => {
  assert.equal(validateCurriculumCatalog(bundledCurricula).plans.length, 9);
  for (const change of [(value: typeof bundledCurricula) => { value.plans[0].chapters[0].allocatedHours = -1; }, (value: typeof bundledCurricula) => { value.plans[0].chapters[0].order = 0; }, (value: typeof bundledCurricula) => { value.reviewedAt = '2026-02-31'; }]) {
    const value = structuredClone(bundledCurricula); change(value); assert.throws(() => validateCurriculumCatalog(value));
  }
});
test('strict subject, cycle, year and branch isolation; no generic fallback', () => {
  assert.equal(findCurricula(classInfo).length, 1);
  assert.equal(findCurricula({ ...classInfo, subject: 'Physique-Chimie' }).length, 0);
  assert.equal(findCurricula({ ...classInfo, cycle: 'lycee' }).length, 0);
  assert.equal(findCurricula(classInfo, bundledCurricula, '2027-2028').length, 0);
  assert.equal(findCurricula({ ...classInfo, level: 'Tronc Commun', cycle: 'lycee' }).length, 0);
  assert.equal(findCurricula({ ...classInfo, level: '1er Bac Sciences Mathématiques', cycle: 'lycee' }).length, 0);
  assert.equal(findCurricula({ ...classInfo, level: 'Tronc Commun', branch: 'Scientifique', cycle: 'lycee' }).length, 2);
});
test('diagnostic is separate; first linked chapter supplies start, never first block', () => {
  const result = analyse(); assert.equal(result.courseStartDate, '2026-09-14'); assert.deepEqual(result.diagnosticDates, ['2026-09-07']);
  assert.equal(result.rows[0].indices[0], 1); assert.equal(result.estimatedHours, 1.5);
});
test('future dates do not complete chapters; no 90% completion heuristic', () => {
  assert.equal(analyse().rows[0].completionRate, 0.5);
  const futureOnly = [{ type: 'chapter' as const, title: 'A', date: '2026-12-07' }];
  assert.equal(analyse(classInfo, futureOnly).courseStartDate, undefined);
  assert.equal(analyse(classInfo, futureOnly).estimatedHours, 0);
});
test('chapter title date uses timetable hours, including two chapters on one day; legacy override ignored', () => {
  const shifted = structuredClone(lessons); shifted[1].date = '2026-09-21'; shifted[1].items![0].date = '2026-09-21';
  const result = analyse({ ...classInfo, courseStartDate: '2026-10-01' }, shifted);
  assert.equal(result.rows[0].estimatedStart, '2026-09-21');
  assert.equal(result.rows[0].estimatedEnd, '2026-09-28');
  assert.equal(result.rows[1].estimatedStart, '2026-09-28');
  assert.equal(result.rows[1].estimatedEnd, '2026-09-28');
});
test('holidays, absences and confirmed assessment hours shift predictions', () => {
  const result = analyse(classInfo, lessons, { calendar: { ...calendar, vacances: [{ debut: '2026-09-21', fin: '2026-09-21', nom: 'Congé' }] }, config: { ...config, absences: [{ debut: '2026-09-28', fin: '2026-09-28' }] }, reservedHours: { '2026-09-14': 1 } });
  assert.equal(result.rows[0].estimatedEnd, '2026-10-05'); assert.equal(result.rows[1].estimatedEnd, '2026-10-12');
});
test('unknown hours block downstream projections and aggregate percentage', () => {
  const result = analyse(classInfo, lessons, { curriculum: { ...plan, chapters: [{ ...plan.chapters[0], allocatedHours: null }, plan.chapters[1]] } });
  assert.equal(result.rows[1].estimatedStart, undefined); assert.equal(result.completionRate, null); assert.equal(result.deltaHours, null);
});
test('unmatched, renamed and duplicated chapters cannot be silently associated', () => {
  const other = [{ type: 'chapter' as const, title: 'Un autre chapitre', date: '2026-09-14' }];
  assert.equal(analyse(classInfo, other).courseStartDate, undefined);
  const mapped = { ...classInfo, curriculumChapterMatches: { a: [{ index: 0, title: other[0].title }] } };
  assert.equal(analyse(mapped, other).courseStartDate, '2026-09-14');
  assert.equal(analyse(mapped, [{ ...other[0], title: 'Renommé' }]).courseStartDate, undefined);
  assert.equal(analyse({ ...classInfo, curriculumChapterMatches: undefined }, [lessons[1], lessons[1]]).rows[0].indices.length, 0);
});
test('missing timetable/start or expired school year gives no invented dates', () => {
  assert.equal(analyse(classInfo, lessons, { config: { ...config, timetable: [] } }).projectionAvailable, false);
  assert.equal(analyse(classInfo, [], {}).courseStartDate, undefined);
  assert.equal(analyse(classInfo, lessons, { today: '2027-10-01' }).projectionAvailable, false);
});
test('one reminder at 09:59 for a continuous 08–10 session, independent of vibration', () => {
  assert.equal(detect('08:59:00').events.length, 0);
  assert.equal(detect('09:58:59').events.length, 0);
  assert.equal(detect('09:59:00').events[0]?.kind, 'end');
  assert.equal(detect('09:59:59').events.length, 1);
  assert.equal(detect('10:00:00').events.length, 0);
});
test('legacy profiles enable omitted session alert options by default', () => {
  const legacySettings = { ...config.notificationSettings };
  delete legacySettings.sessionEndReminderEnabled;
  delete legacySettings.missingDateReminderEnabled;
  delete legacySettings.sessionReminderMinutes;
  delete legacySettings.missingDateReminderMinutes;
  assert.equal(detect('09:59:00', { notificationSettings: legacySettings }).events[0]?.kind, 'end');
  assert.equal(detect('10:05:00', { notificationSettings: legacySettings }).events[0]?.kind, 'missing');
});
test('configurable lead and grace, missing dates checked before generating events', () => {
  const notificationSettings = { ...config.notificationSettings!, sessionReminderMinutes: 5, missingDateReminderMinutes: 10 };
  assert.equal(detect('09:55:00', { notificationSettings }).events[0]?.kind, 'end');
  assert.equal(detect('10:10:00', { notificationSettings }).events[0]?.kind, 'missing');
  assert.equal(detect('10:10:00', { notificationSettings }, true).events.length, 0);
  assert.equal(detect('11:10:00', { notificationSettings }).events.length, 0);
});
test('master switch, teacher absences, deleted classes and holidays silence alerts', () => {
  assert.equal(detect('09:59:00', { notificationSettings: { ...config.notificationSettings!, enabled: false } }).events.length, 0);
  assert.equal(detect('09:59:00', { absences: [{ debut: '2026-09-14', fin: '2026-09-14' }] }).events.length, 0);
  assert.equal(detectSessionAlerts(config, [], calendar, new Date('2026-09-14T09:59:00+01:00'), () => false).events.length, 0);
  const holiday = { ...calendar, vacances: [{ debut: '2026-09-14', fin: '2026-09-14', nom: 'Congé' }] };
  assert.equal(detectSessionAlerts(config, [classInfo], holiday, new Date('2026-09-14T09:59:00+01:00'), () => false).events.length, 0);
});
test('current session has a strict end boundary and lunch is not a continuous session', () => {
  assert.equal(detect('09:59:00').current.length, 1); assert.equal(detect('10:00:00').current.length, 0);
  const timetable = [{ day: 1, slot: 3, classId: 'c1' }, { day: 1, slot: 4, classId: 'c1' }];
  assert.equal(detect('11:59:00', { timetable }).events[0]?.kind, 'end'); assert.equal(detect('12:30:00', { timetable }).current.length, 0);
});
test('global timetable clock translates every slot without changing duration or lunch', () => {
  const slots = getHourSlots(30);
  assert.equal(slots[0].startMin, 8 * 60 + 30);
  assert.equal(slots.at(-1)?.endMin, 18 * 60 + 30);
  assert.ok(slots.every(slot => slot.endMin - slot.startMin === 60));
  assert.equal(slots[4].lunchBefore, true);
  assert.equal(slots[4].startMin - slots[3].endMin, 120);
  assert.equal(normalizeTimetableClock({ offsetMinutes: 7, version: 9, updatedAt: '2026-09-08T00:00:00Z' }).offsetMinutes, 0);
});
test('global timetable clock shifts live sessions and reminders together', () => {
  const timetableClock = { offsetMinutes: 30, version: 1, updatedAt: '2026-09-08T00:00:00Z' };
  assert.equal(detect('08:15:00', { timetableClock }).current.length, 0);
  assert.equal(detect('08:45:00', { timetableClock }).current.length, 1);
  assert.equal(detect('10:29:00', { timetableClock }).events[0]?.kind, 'end');
  assert.equal(detect('10:30:00', { timetableClock }).current.length, 0);
});
test('simultaneous classes form one event, keeping all navigation targets', () => {
  const other = { ...classInfo, id: 'c2' };
  const result = detectSessionAlerts({ ...config, timetable: [...config.timetable!, { day: 1, slot: 1, classId: 'c2' }] }, [classInfo, other], calendar, new Date('2026-09-14T09:59:00+01:00'), () => false);
  assert.equal(result.events.length, 1); assert.deepEqual(result.events[0].classIds, ['c1', 'c2']);
});
test('Morocco timezone, including Ramadan offset, is independent of the device', () => {
  assert.equal(moroccoClockMinutes(new Date('2026-09-14T08:59:00Z')), 9 * 60 + 59);
  assert.equal(moroccoClockMinutes(new Date('2026-02-23T08:59:00Z')), 8 * 60 + 59);
});

test('association survives JSON and server validation, with level, branch and start date', () => {
  const value = { ...classInfo, branch: 'Enseignement général', courseStartDate: '2026-09-14', curriculumSourceId: '1ac-mouzoun', curriculumChapterMatches: { '1ac-mouzoun-c1': [{ index: 1, title: 'A' }] } };
  const restored = assertValidClasses(JSON.parse(JSON.stringify([value])))[0];
  assert.deepEqual(restored.curriculumChapterMatches, value.curriculumChapterMatches);
  assert.equal(restored.curriculumSourceId, value.curriculumSourceId);
  assert.equal(restored.courseStartDate, value.courseStartDate);
  assert.equal(restored.level, value.level); assert.equal(restored.branch, value.branch);
  assert.throws(() => assertValidClasses([{ ...value, curriculumChapterMatches: { a: [{ index: -1, title: 'A' }] } }]));
  assert.throws(() => assertValidClasses([{ ...value, courseStartDate: '2026-02-31' }]));
  const spaced = { ...value, curriculumChapterMatches: { a: [{ index: 1, title: '  A  ' }] } };
  assert.equal(assertValidClasses([spaced])[0].curriculumChapterMatches?.a[0].title, '  A  ');
  assert.throws(() => assertValidClasses([{ ...value, curriculumChapterMatches: { a: [{ index: 1, title: 'A' }], b: [{ index: 1, title: 'A' }] } }]));
});
test('an association remains optional; multiple notebook chapters may share one curriculum chapter', () => {
  const value = { ...classInfo, curriculumChapterMatches: { a: [{ index: 1, title: 'A' }, { index: 2, title: 'B' }], b: [] } };
  assert.deepEqual(chapterAssociations({ ...classInfo, curriculumChapterMatches: undefined }, lessons, plan), {});
  assert.deepEqual(chapterAssociations(value, lessons, plan), { 1: 'a', 2: 'a' });
  assert.equal(analyse(value).rows[0].indices.length, 2);
  assert.equal(analyse(value).rows[1].indices.length, 0);
});
test('internal reference selection is explicit, and number sets use valid LaTeX', () => {
  const tcs = findMatchingCurriculum({ ...classInfo, cycle: 'lycee', level: 'Tronc Commun Scientifique' });
  assert.equal(tcs?.id, 'tcs-mouzoun');
  assert.ok(tcs?.chapters[0].title.includes('$\\mathbb{N}$'));
});
test('dating an empty chapter proves a start, never its full allocated hours', () => {
  const result = analyse(classInfo, [lessons[0], { type: 'chapter', title: 'A', date: '2026-09-14' }]);
  assert.equal(result.courseStartDate, '2026-09-14');
  assert.equal(result.estimatedHours, 0); assert.equal(result.completionRate, null);
});

test('expected chapter rates split timetable hours in official order without double counting', () => {
  const result = analyse();
  assert.equal(result.rows[0].expectedRate, 2 / 3);
  assert.equal(result.rows[1].expectedRate, 0);
  assert.equal(result.expectedRate, 50);
  const later = analyse(classInfo, lessons, { today: '2026-09-22' });
  assert.equal(later.rows[0].expectedRate, 1);
  assert.equal(later.rows[1].expectedRate, 1);
  assert.equal(later.expectedRate, 100);
});

test('today is not counted as a completed timetable day; future start stays at zero', () => {
  assert.equal(analyse(classInfo, lessons, { today: '2026-09-14' }).expectedRate, 0);
  assert.equal(analyse({ ...classInfo, courseStartDate: '2026-09-21' }).expectedRate, 50);
  assert.equal(analyse(classInfo, lessons, { config: { ...config, timetable: [] } }).rows[0].expectedRate, null);
});

test('missing duration blocks downstream expected rates, not just target dates', () => {
  const result = analyse(classInfo, lessons, { curriculum: { ...plan, chapters: [{ ...plan.chapters[0], allocatedHours: null }, plan.chapters[1]] } });
  assert.equal(result.rows[0].expectedRate, null);
  assert.equal(result.rows[1].expectedRate, null);
  assert.equal(result.expectedRate, null);
});

test('clearing the start override survives server validation and restores inference', () => {
  const restored = assertValidClasses(JSON.parse(JSON.stringify([{ ...classInfo, courseStartDate: undefined }])))[0];
  assert.equal(restored.courseStartDate, undefined);
  assert.equal(analyse(restored).courseStartDate, '2026-09-14');
  const wrongYear = [{ type: 'chapter' as const, title: 'A', date: '2025-09-14' }];
  assert.equal(analyse(classInfo, wrongYear).courseStartDate, undefined);
});

test('remote clears remove stale local dates and matches instead of resurrecting them', () => {
  const local = { ...classInfo, courseStartDate: '2026-09-14', curriculumSourceId: '1ac-mouzoun', curriculumChapterMatches: { a: [{ index: 0, title: 'A' }] } };
  const merged = withCurriculumSettings({ ...local, ...classInfo }, { ...classInfo, curriculumChapterMatches: undefined });
  assert.equal(merged.courseStartDate, undefined);
  assert.equal(merged.curriculumSourceId, undefined);
  assert.equal(merged.curriculumChapterMatches, undefined);
});

test('administrative class identity stays authoritative while teacher progression is preserved', () => {
  const admin = { ...classInfo, name: '1AC 2', teacherName: 'Direction' };
  const teacher = { ...classInfo, name: 'Changed client name', courseStartDate: '2026-09-21', curriculumChapterMatches: { a: [{ index: 0, title: 'A' }] } };
  const result = assertValidClasses([withCurriculumSettings(admin, teacher)])[0];
  assert.equal(result.name, admin.name);
  assert.equal(result.teacherName, admin.teacherName);
  assert.equal(result.courseStartDate, teacher.courseStartDate);
  assert.deepEqual(result.curriculumChapterMatches, teacher.curriculumChapterMatches);
});

test('all linked parts must finish before a shared official chapter is complete', () => {
  const data: LessonsData = [
    { type: 'chapter', title: 'Partie I', date: '2026-09-14', items: [{ type: 'definition', date: '2026-09-14' }, { type: 'exercice' }] },
    { type: 'chapter', title: 'Partie II', date: '2026-09-15', items: [{ type: 'exercice', date: '2026-09-15' }] },
  ];
  const linked = { ...classInfo, curriculumChapterMatches: { a: [{ index: 1, title: 'Partie II' }, { index: 0, title: 'Partie I' }], b: [] } };
  const result = analyse(linked, data);
  assert.equal(result.courseStartDate, '2026-09-14');
  assert.equal(result.rows[0].status, 'in_progress'); assert.equal(result.rows[0].endDate, undefined);
  assert.equal(result.rows[0].completionRate, 2 / 3); assert.equal(result.rows[0].itemsCount, 3);
  const finished = structuredClone(data); finished[0].items![1].date = '2026-09-15';
  assert.equal(analyse(linked, finished).rows[0].status, 'completed');
  assert.equal(analyse(linked, finished).rows[0].endDate, '2026-09-15');
});

test('an old manual start cannot replace a missing title date or revive a cleared title', () => {
  const data = structuredClone(lessons); delete data[1].date;
  const result = analyse({ ...classInfo, courseStartDate: '2026-09-07' }, data);
  assert.equal(result.courseStartDate, undefined); assert.equal(result.projectionAvailable, false);
  assert.equal(result.rows[0].issue, 'missing_start'); assert.equal(result.rows[0].completionRate, null);
});

test('timetable edits and assessment reservations immediately update expected pace', () => {
  assert.equal(analyse().expectedRate, 50);
  assert.equal(analyse(classInfo, lessons, { config: { ...config, timetable: [{ day: 1, slot: 0, classId: classInfo.id }] } }).expectedRate, 25);
  assert.equal(analyse(classInfo, lessons, { reservedHours: { '2026-09-14': 1 } }).expectedRate, 25);
  for (const hours of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(analyse(classInfo, lessons, { reservedHours: { '2026-09-14': hours } }).expectedRate, 50);
  }
  assert.equal(analyse(classInfo, lessons, { reservedHours: { '2026-09-14': 20 } }).expectedRate, 0);
});
