import assert from 'node:assert/strict';
import test from 'node:test';
import type { ClassInfo, LessonsData, NotificationSettings } from '../src/types';
import type { HolidayCalendar } from '../src/domain/calendar/calendar';
import { detectNotebookFollowup } from '../src/domain/assistant/notebookFollowup';
import { resolveClassGuidance, guidanceAction, guidanceKey } from '../src/domain/assistant/classGuidance';
import { decideCompanion } from '../src/domain/assistant/companionDecision';
import { resolvePedagogicalBehavior } from '../src/domain/assistant/companionPedagogicalBehavior';
import { classGuidanceMessage } from '../src/features/assistant/companionCopy';
import { companionHelpReference } from '../src/domain/assistant/companionHelp';

const calendar: HolidayCalendar = { version: 1, pays: 'Maroc', fuseau: 'Africa/Casablanca',
  anneeScolaire: { libelle: '2026-2027', debut: '2026-09-07', fin: '2027-06-30' }, vacances: [], joursFeries: [] };
const target: ClassInfo = { id: 'pc3', name: '2ème Bac Sciences Physiques 3', createdAt: '2026-10-01T10:00:00Z',
  teacherName: '', subject: 'Physique', cycle: 'lycee', color: '' };
const slots = [1, 2, 3, 4, 5, 6].map(weekday => ({ weekday }));
const timetable = slots.map(slot => ({ day: slot.weekday, slot: 0, classId: target.id }));
const config = { timetable };
const preferences = (days: number): NotificationSettings => ({ enabled: true, pushEnabled: false,
  gapThreshold: 2, inactivityThresholdDays: days, quietDuringVacations: true });
const today = '2026-10-23';
const book = (date?: string): LessonsData => [{ type: 'chapter', title: 'Ondes', items: [{ type: 'cours', title: 'Propagation', ...(date ? { date } : {}) }] }];
const detect = (lessons = book('2026-10-12'), cal = calendar) => detectNotebookFollowup(target, lessons, slots, {}, cal, today);

test('long pauses count past teaching days once per date and respect the chosen threshold', () => {
  assert.deepEqual(detect(), { reason: 'long-pause', elapsedDays: 9, lastSessionDate: '2026-10-12' });
  assert.equal(detectNotebookFollowup(target, book('2026-10-12'), slots, {
    notificationSettings: preferences(10),
  }, calendar, today), undefined);
  assert.deepEqual(detectNotebookFollowup(target, book('2026-10-12'), [...slots, ...slots], {}, calendar, today), detect(),
    'a two-hour or split day is not counted as two days without entries');
  assert.equal(detectNotebookFollowup(target, book('2026-10-12'), [{ weekday: 1 }], {}, calendar, today), undefined,
    'a once-weekly class has only one elapsed teaching day');
  assert.equal(detect(book(today)), undefined, 'a fresh dated session clears the reminder');
});

test('vacations, holidays, weekly rest, justified absences and current-day lessons do not create gaps', () => {
  assert.equal(detect(book('2026-10-12'), { ...calendar, vacances: [{ nom: 'Pause', debut: '2026-10-13', fin: today }] }), undefined);
  const holiday = { ...calendar, joursFeries: [{ nom: 'Férié', date: today, type: 'national' as const }] };
  assert.equal(detect(book('2026-10-12'), holiday), undefined);
  assert.equal(detectNotebookFollowup(target, book('2026-10-12'), slots, { absences: [{ debut: '2026-10-13', fin: '2026-10-21' }] }, calendar, today), undefined);
  assert.equal(detectNotebookFollowup(target, book('2026-10-12'), slots, { absences: [{ debut: today, fin: today }] }, calendar, today), undefined);
  assert.equal(detectNotebookFollowup(target, book('2026-10-12'), slots, {}, calendar, '2026-10-25'), undefined);
  assert.equal(detectNotebookFollowup(target, book('2026-10-19'), slots, {
    notificationSettings: preferences(4),
  }, calendar, today), undefined, 'Friday is not counted before its lessons have ended');
});

test('first-session reminders need elapsed school days and reliable creation evidence, never undated item counts', () => {
  assert.equal(detectNotebookFollowup({ ...target, createdAt: `${today}T08:00:00Z` }, book(), slots, {}, calendar, today), undefined);
  assert.equal(detectNotebookFollowup({ ...target, createdAt: 'invalid' }, book(), slots, {}, calendar, today), undefined);
  assert.equal(detectNotebookFollowup({ ...target, createdAt: '2030-01-01' }, book(), slots, {}, calendar, today), undefined);
  assert.equal(detect(book())?.reason, 'first-session');
  const prepared = book('2026-10-22');
  for (let i = 0; i < 100; i++) prepared[0].items!.push({ type: 'exercice', title: `Ex ${i}` });
  assert.equal(detect(prepared), undefined, 'planned undated content is normal');
});

test('future and malformed dates, structural titles, homework deadlines and absence notes cannot hide a pause', () => {
  const lessons = book('2026-10-12');
  lessons[0].date = today;
  lessons[0].items!.push({ type: 'exercice', date: '2026-11-01' }, { type: 'exercice', date: '2026-02-30' });
  lessons.push({ type: 'free', title: 'Absence', date: today }, { type: 'devoir_maison', title: 'DM', date: today });
  assert.equal(detect(lessons)?.lastSessionDate, '2026-10-12');
  assert.equal(detect([...lessons, { type: 'controle_continu', title: 'Contrôle', date: '2026-10-22' }]), undefined,
    'an assessment actually recorded in the notebook is a recent session trace');
  assert.equal(detect(book('12/10/2026 ; 22/10/2026')), undefined, 'multiple session dates use the shared parser');
});

test('school year and official teaching end silence historical follow-up', () => {
  assert.equal(detectNotebookFollowup(target, book('2026-10-12'), slots, { schoolYearStart: '2026-11-01' }, calendar, today), undefined);
  assert.equal(detectNotebookFollowup(target, book('2027-01-12'), slots, {}, calendar, '2027-07-02'), undefined);
  assert.equal(detectNotebookFollowup(target, book('2027-04-01'), slots, {}, calendar, '2027-06-15'), undefined,
    'the official closing date for this level takes precedence over the general end of year');
});

test('the brain advances from setup to content to review, updates after edits, and protects recovery and live sessions', () => {
  const context = { today, calendar, readLessons: () => book('2026-10-12') };
  assert.equal(resolveClassGuidance([target], {}, undefined, context).step, 'schedule');
  assert.equal(resolveClassGuidance([target], config, undefined, { ...context, readLessons: () => [] }).step, 'notebook-empty');
  const guidance = resolveClassGuidance([target], config, undefined, context);
  assert.equal(guidance.step, 'notebook-followup');
  assert.deepEqual(guidanceAction(guidance), { type: 'open-class', classId: target.id });
  assert.equal(resolveClassGuidance([target], config, undefined, { ...context, readLessons: () => book(today) }).step, 'ready');
  assert.equal(resolveClassGuidance([target], config, undefined, { ...context, notebooksLoading: true }).step, 'checking');
  assert.equal(resolveClassGuidance([target], config, undefined, { ...context, readLessons: () => { throw new Error('unreadable'); } }).step, 'notebook-unavailable');
  assert.equal(resolveClassGuidance([target], config, undefined, { ...context, activeSessionClassIds: [target.id] }).step, 'active-session');
  const diagnostic: LessonsData = [{ type: 'chapter', title: 'Ondes', items: [{ type: 'cours', description: '$x' }] }];
  assert.equal(resolveClassGuidance([target], config, undefined, { ...context, readLessons: () => diagnostic }).step, 'notebook-issue');
  assert.equal(resolveClassGuidance([target], { ...config, timetable: [] }, undefined, context).step, 'schedule');
  assert.equal(resolveClassGuidance([], config, undefined, context).step, 'create');
});

test('routine follow-up keeps a gentle class-specific action without unnecessary how-to instructions', () => {
  const guidance = resolveClassGuidance([target], config, undefined, { today, calendar, readLessons: () => book('2026-10-12') });
  assert.equal(guidance.step, 'notebook-followup');
  assert.equal(resolvePedagogicalBehavior(guidance).robotAction, 'inspect');
  assert.equal(resolvePedagogicalBehavior(guidance).antennaFlash, false);
  for (const locale of ['ar', 'fr', 'en'] as const) {
    const message = classGuidanceMessage(guidance, locale);
    assert.ok(message.detailEmphasis && message.detail.includes(message.detailEmphasis));
    assert.doesNotMatch(message.detail, /قسم\s+قسم|\r|\n/);
    assert.ok(message.action);
  }
  assert.equal(companionHelpReference({ kind: 'guidance' }, guidance), undefined);
  assert.equal(decideCompanion({ guidance, authenticated: false, online: true, syncStatus: 'idle', transfer: 'idle',
    inboxLoaded: false, inboxFailed: false, messages: [], hasNotebookReader: true, hasContentSuggestion: true }).kind, 'guidance');
  if (guidance.step === 'notebook-followup') assert.equal(guidanceKey({ ...guidance, elapsedDays: guidance.elapsedDays + 1 }), guidanceKey(guidance), 'no new attention signal every day for the same review');
});
