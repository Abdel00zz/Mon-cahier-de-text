import assert from 'node:assert/strict';
import test from 'node:test';
import type { ClassInfo, LessonsData } from '../src/types';
import type { HolidayCalendar } from '../src/domain/calendar/calendar';
import { createCompanionEvaluation, evaluateCompanion, type CompanionBrainInput } from '../src/domain/assistant/companionBrain';
import { createNotebookSnapshot } from '../src/domain/assistant/notebookSnapshot';
import { companionMessage } from '../src/features/assistant/companionPresentation';

const calendar: HolidayCalendar = { version: 1, pays: 'MA', fuseau: 'Africa/Casablanca',
  anneeScolaire: { libelle: '2026-2027', debut: '2026-09-07', fin: '2027-07-03' }, joursFeries: [], vacances: [] };
const makeClass = (id: string): ClassInfo => ({ id, name: `2ème Bac Sciences Physiques ${id}`, teacherName: '', subject: 'Physique', color: '', createdAt: '2026-10-01' });
const valid: LessonsData = [{ type: 'chapter', title: 'Ondes', items: [{ type: 'cours', title: 'Propagation', date: '2026-10-22' }] }];
const broken: LessonsData = [{ type: 'chapter', title: 'Ondes', items: [{ type: 'cours', title: 'Propagation', description: '$x', date: '2026-10-22' }] }];
const input = (patch: Partial<CompanionBrainInput> = {}): CompanionBrainInput => ({
  classes: ['1', '2', '3'].map(makeClass), config: { timetable: [1, 2, 3].map(id => ({ classId: String(id), day: 1, slot: id })) },
  calendar, today: '2026-10-23', now: Date.parse('2026-10-23T09:00:00Z'), offersEnabled: true,
  readLessons: () => valid,
  services: { authenticated: true, online: true, syncStatus: 'synced', transfer: 'ready', inboxLoaded: true, inboxFailed: false, messages: [] },
  ...patch,
});

test('one central snapshot reads every class once, even when content offers consume the same data', () => {
  const reads = new Map<string, number>();
  const options = input({ readLessons: id => { reads.set(id, (reads.get(id) ?? 0) + 1); return valid; } });
  const before = JSON.stringify({ classes: options.classes, config: options.config, valid });
  const result = evaluateCompanion(options);
  assert.deepEqual([...reads.values()], [1, 1, 1]);
  assert.deepEqual(result.coverage, { total: 3, read: 3, unavailable: 0, state: 'complete' });
  assert.equal(result.decision.kind, 'offer');
  assert.equal(result.action.type, 'request-content');
  assert.equal(result.target?.id, result.contentSuggestion?.target.id);
  assert.equal(result.behavior.problemCount, 0);
  assert.equal(JSON.stringify({ classes: options.classes, config: options.config, valid }), before);
});

test('live sessions keep display priority while the other notebooks continue to be examined', () => {
  const reads: string[] = [];
  const result = evaluateCompanion(input({ activeSessionClassIds: ['deleted', '1'],
    readLessons: id => { reads.push(id); return id === '2' ? broken : valid; } }));
  assert.equal(new Set(reads).size, 3);
  assert.ok(!reads.includes('deleted'));
  assert.equal(result.guidance.step, 'active-session');
  assert.equal(result.target?.id, '1');
  assert.ok(result.tasks.some(task => task.evidence.rule === 'unclosedFormula' && 'classId' in task.guidance && task.guidance.classId === '2'));
  assert.equal(result.behavior.problemCount, 1);
  assert.equal(result.nextTaskId, undefined);
  assert.equal(result.behavior.robotAction, 'inspect');
});

test('an unreadable current notebook triggers recovery, and does not stop scanning the remaining classes', () => {
  const reads: string[] = [];
  const result = evaluateCompanion(input({ activeSessionClassIds: ['1'], readLessons: id => {
    reads.push(id); if (id === '1') throw new Error('corrupt'); return id === '2' ? broken : [];
  } }));
  assert.equal(reads.length, 3);
  assert.equal(result.guidance.step, 'notebook-unavailable');
  assert.deepEqual(result.action, { type: 'open-class', classId: '1' });
  assert.equal(result.coverage.unavailable, 1);
  assert.equal(result.contentSuggestion, undefined);
  assert.ok(result.tasks.some(task => task.guidance.step === 'notebook-empty'));
});

test('global issue priority outweighs a preferred class, while every finding remains browsable', () => {
  const options = input({ preferredClassId: '1', config: {}, readLessons: id => id === '2' ? broken : id === '3' ? [] : valid });
  const result = evaluateCompanion(options);
  assert.equal(result.guidance.step, 'notebook-issue');
  assert.equal(result.target?.id, '2');
  assert.equal(result.trace.rule, 'unclosedFormula');
  assert.ok(result.trace.evidence?.samplePath);
  assert.equal(result.tasks.filter(task => task.guidance.step === 'schedule').length, 3, 'formula issues do not erase schedule findings');
  assert.equal(result.tasks.filter(task => task.guidance.step === 'notebook-empty').length, 1);
  assert.equal(result.behavior.problemCount, result.tasks.length);
  const seen = new Set<string>();
  let current = result;
  for (let i = 0; i < result.tasks.length; i++) {
    seen.add(current.selectedTask!.id);
    assert.ok(current.nextTaskId);
    current = evaluateCompanion({ ...options, selectedTaskId: current.nextTaskId });
    if ('classId' in current.guidance) assert.equal(current.target?.id, current.guidance.classId);
  }
  assert.equal(seen.size, result.tasks.length);
  assert.equal(current.selectedTask?.id, result.selectedTask?.id, 'browsing is cyclic and never deletes an unresolved task');
});

test('all issue types in one notebook are retained and a real correction/deletion removes the corresponding tasks', () => {
  const multiple: LessonsData = [{ type: 'chapter', title: 'Cours', items: [
    { type: 'cours', description: '$x', date: '2026-10-22' }, { type: 'exercice', date: '2026-10-20' },
  ] }];
  const options = input({ readLessons: id => id === '2' ? multiple : valid });
  const result = evaluateCompanion(options);
  assert.ok(result.tasks.some(task => task.evidence.rule === 'unclosedFormula'));
  assert.ok(result.tasks.some(task => task.evidence.rule === 'outOfOrderSessions'));
  const repaired = evaluateCompanion({ ...options, readLessons: () => valid, selectedTaskId: result.selectedTask!.id });
  assert.equal(repaired.tasks.length, 0);
  assert.equal(repaired.selectedTask, undefined);
  assert.equal(repaired.behavior.problemCount, 0);
  const deleted = evaluateCompanion({ ...options, classes: options.classes.filter(item => item.id !== '2'), selectedTaskId: result.selectedTask!.id });
  assert.ok(deleted.tasks.every(task => !('classId' in task.guidance) || task.guidance.classId !== '2'));
});

test('pending transfers never scan incomplete local data or invent empty notebooks, including while a lesson is active', () => {
  const options = input();
  const services = { ...options.services, transfer: 'pulling' as const };
  for (const activeSessionClassIds of [[], ['1']]) {
    const result = evaluateCompanion({ ...options, services, activeSessionClassIds, readLessons: () => { throw new Error('must not read'); } });
    assert.equal(result.coverage.state, 'loading');
    assert.equal(result.coverage.read, 0);
    assert.equal(result.tasks.length, 0);
    assert.equal(result.contentSuggestion, undefined);
  }
  const disconnected = evaluateCompanion({ ...options, readLessons: undefined });
  assert.equal(disconnected.coverage.state, 'disconnected');
  assert.equal(disconnected.guidance.step, 'notebook-unavailable');
  assert.equal(disconnected.decision.kind, 'guidance');
});

test('service recovery, admin replies, local guests and data scope lead to consistent actions and counts', () => {
  const options = input({ readLessons: () => broken });
  const failure = evaluateCompanion({ ...options, services: { ...options.services, syncStatus: 'error' } });
  assert.equal(failure.decision.kind, 'sync-error');
  assert.equal(failure.action.type, 'retry-sync');
  assert.equal(failure.behavior.problemCount, failure.tasks.length + 1);
  assert.equal(failure.calendarNotice, undefined);
  const reply = { id: 'admin-reply', title: 'Aide', body: 'Réponse', createdAt: '2026-10-23', classId: '3' };
  const result = evaluateCompanion({ ...options, services: { ...options.services, messages: [reply] } });
  assert.equal(result.action.type, 'read-reply');
  assert.equal(result.target?.id, '3');
  assert.equal(result.behavior.problemCount, result.tasks.length + 1);
  const guest = evaluateCompanion({ ...options, services: { ...options.services, authenticated: false, messages: [reply] } });
  assert.equal(guest.behavior.problemCount, guest.tasks.length);
  const otherAccount = evaluateCompanion(input({ classes: [makeClass('other')], readLessons: () => [], selectedTaskId: result.selectedTask?.id }));
  assert.equal(otherAccount.target?.id, 'other');
  assert.ok(otherAccount.tasks.every(task => !('classId' in task.guidance) || task.guidance.classId === 'other'));
});

test('a notebook task keeps its class, help and action without appending an unrelated holiday', () => {
  const options = input({ readLessons: () => [], calendar: { ...calendar, vacances: [{ nom: 'Congé', debut: '2026-10-18', fin: '2026-10-25' }] } });
  const result = evaluateCompanion(options);
  for (const locale of ['ar', 'fr', 'en'] as const) {
    const message = companionMessage(result, locale, options.today, false);
    assert.ok(message.detailEmphasis && message.detail.includes(message.detailEmphasis));
    assert.ok(message.action);
    assert.doesNotMatch(message.detail, /قسم\s+قسم|\r|\n/);
    assert.equal(result.action.type, 'open-class');
    assert.equal(result.helpReference?.chapterId, 'content');
    assert.equal(result.calendarNotice, undefined);
    assert.equal(result.showTips, false);
    assert.doesNotMatch(message.detail, /Congé|vacances|العطلة|WhatsApp/iu);
  }
});

test('a holiday notice replaces optional content offers and tips, but never absorbs important problems or replies', () => {
  const options = input({ calendar: { ...calendar, vacances: [{ nom: 'Congé', debut: '2026-10-18', fin: '2026-10-25' }] },
    readActivity: () => { throw new Error('do not inspect marketing activity for a calendar message'); } });
  const holiday = evaluateCompanion(options);
  assert.equal(holiday.decision.kind, 'calendar');
  assert.equal(holiday.calendarNotice?.end, '2026-10-25');
  assert.equal(holiday.contentSuggestion, undefined);
  assert.deepEqual(holiday.action, { type: 'none' });
  assert.equal(holiday.helpReference, undefined);
  assert.equal(holiday.showTips, false);
  for (const locale of ['ar', 'fr', 'en'] as const) {
    const message = companionMessage(holiday, locale, options.today, false);
    assert.match(message.id, /^calendar:/);
    assert.equal(message.action, undefined);
    assert.doesNotMatch(message.detail, /هل تعلم|Le saviez-vous|Did you know|WhatsApp|واتساب|exercices|تمارين/iu);
  }
  const issue = evaluateCompanion({ ...options, readLessons: () => broken });
  assert.equal(issue.decision.kind, 'guidance');
  assert.equal(issue.calendarNotice, undefined);
  const failure = evaluateCompanion({ ...options, services: { ...options.services, syncStatus: 'error' } });
  assert.equal(failure.decision.kind, 'sync-error');
  assert.equal(failure.calendarNotice, undefined);
  const reply = evaluateCompanion({ ...options, services: { ...options.services,
    messages: [{ id: 'reply', title: 'Aide', body: 'Réponse', createdAt: '2026-10-23' }] } });
  assert.equal(reply.decision.kind, 'reply');
  assert.equal(reply.calendarNotice, undefined);
  for (const snapshot of [issue, failure, reply]) {
    assert.equal(snapshot.showTips, false);
    assert.doesNotMatch(companionMessage(snapshot, 'fr', options.today, false).detail, /Congé|vacances/iu);
  }
});

test('the teaching tip appears only in the calm ready state, never alongside a content offer', () => {
  const offered = evaluateCompanion(input());
  assert.equal(offered.decision.kind, 'offer');
  assert.equal(offered.showTips, false);
  const calm = evaluateCompanion(input({ offersEnabled: false }));
  assert.equal(calm.decision.kind, 'guidance');
  assert.equal(calm.showTips, true);
});

test('contextual help disappears when browsing a simple check or after resolution, without removing the action', () => {
  const options = input({ readLessons: id => id === '1' ? broken : id === '2' ? [...valid, ...valid] : valid });
  const evaluate = createCompanionEvaluation(options);
  const formula = evaluate();
  assert.deepEqual(formula.helpReference, { chapterId: 'math', sectionId: 'formulas' });
  assert.deepEqual(formula.action, { type: 'open-class', classId: '1' });
  const duplicate = evaluate(formula.nextTaskId);
  assert.equal(duplicate.trace.rule, 'duplicateBlocks');
  assert.equal(duplicate.helpReference, undefined);
  assert.deepEqual(duplicate.action, { type: 'open-class', classId: '2' });
  const repaired = evaluateCompanion({ ...options, readLessons: () => valid, offersEnabled: false });
  assert.equal(repaired.guidance.step, 'ready');
  assert.equal(repaired.helpReference, undefined);
  assert.equal(repaired.action.type, 'open-class');
  assert.equal(evaluateCompanion({ ...options, services: { ...options.services, transfer: 'pulling' } }).helpReference, undefined);
});

test('snapshot isolates failures and avoids repeated reads without retaining data across evaluations', () => {
  let reads = 0;
  const snapshot = createNotebookSnapshot(() => { reads++; throw new Error('invalid'); });
  assert.throws(() => snapshot.read!('1'));
  assert.throws(() => snapshot.read!('1'));
  assert.equal(reads, 1);
  assert.equal(snapshot.reads.get('1')?.status, 'unavailable');
  const fresh = createNotebookSnapshot(() => valid);
  assert.equal(fresh.read!('1'), valid);
  assert.equal(snapshot.reads.get('1')?.status, 'unavailable');
});

test('browsing the entire task queue reuses one observation rather than scanning JSON again', () => {
  let reads = 0;
  const decide = createCompanionEvaluation(input({ config: {}, readLessons: id => { reads++; return id === '2' ? broken : []; } }));
  let state = decide();
  const total = state.tasks.length;
  assert.equal(reads, 3);
  for (let i = 0; i < total * 2; i++) state = decide(state.nextTaskId);
  assert.equal(reads, 3, 'only actual data changes should require a new observation');
});

test('evaluation date conflicts and incomplete student rosters produce prioritized tasks with direct dashboard actions', () => {
  const testConfig = {
    timetable: [1, 2, 3].map(id => ({ classId: String(id), day: 1, slot: id })),
    manualAssessments: {
      '1': [
        { id: 'ctrl-1', type: 'controle' as const, num: 1, semestre: 1 as const, dateISO: '2026-10-26' },
        { id: 'ctrl-2', type: 'controle' as const, num: 2, semestre: 1 as const, dateISO: '2026-10-26' },
      ],
    },
    pedagogicalEvents: {
      '2': [{
        id: 'check-2',
        type: 'controle_cahiers' as const,
        title: 'Contrôle des cahiers',
        date: '2026-10-22',
        status: 'planned' as const,
        createdAt: '2026-10-20T08:00:00Z',
        students: { names: ['Amina', 'Youssef'], notebookConditions: { Amina: 'good' as const }, updatedAt: '2026-10-22T08:00:00Z' },
      }],
    },
    classRosters: {
      '2': { names: ['Amina'], updatedAt: '2026-10-20T08:00:00Z', version: 1 },
    },
  };
  const conflictAndRoster = evaluateCompanion(input({ config: testConfig }));

  assert.equal(conflictAndRoster.guidance.step, 'evaluation-conflict');
  assert.deepEqual(conflictAndRoster.action, { type: 'open-evaluations', classId: '1', entry: 'all' });
  assert.deepEqual(conflictAndRoster.helpReference, { chapterId: 'assessments' });

  const nextState = evaluateCompanion({
    ...input({ config: testConfig }),
    selectedTaskId: conflictAndRoster.nextTaskId,
  });

  assert.equal(nextState.guidance.step, 'roster-incomplete');
  assert.deepEqual(nextState.action, { type: 'configure-roster', classId: '2' });
  assert.deepEqual(nextState.helpReference, { chapterId: 'students' });
});

