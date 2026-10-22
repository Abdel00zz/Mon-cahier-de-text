import assert from 'node:assert/strict';
import test from 'node:test';
import type { AdminMessage, ClassInfo, LessonsData } from '../src/types';
import { notebookContentEvidence, orderCompanionClasses, resolveContentSuggestion } from '../src/domain/assistant/contentSuggestion';
import { contentSuggestionMessage } from '../src/features/assistant/contentSuggestionCopy';
import { decideCompanion } from '../src/domain/assistant/companionDecision';
import { buildSupportWhatsAppUrl } from '../src/constants/support';
import { resolveClassGuidance } from '../src/domain/assistant/classGuidance';
import { classGuidanceMessage } from '../src/features/assistant/companionCopy';

const now = Date.parse('2026-10-22T10:00:00Z');
const makeClass = (id: string, patch: Partial<ClassInfo> = {}): ClassInfo => ({
  id, name: `Classe ${id}`, subject: 'Mathématiques', teacherName: 'Prof', color: '', createdAt: '2026-10-01T10:00:00Z', ...patch,
});
const lessons: LessonsData = [{ type: 'chapter', title: 'Les ondes', items: [{ type: 'definition', title: 'Propagation' }] }];

test('suggestions respect explicit focus, recent notebook, visible classes and deterministic tie breaks', () => {
  const classes = [makeClass('a'), makeClass('b', { lastOpenedAt: '2026-10-22T09:00:00Z' }), makeClass('c')];
  const options = { classes, now, readLessons: (id: string) => id === 'a' ? [] : lessons };
  assert.equal(resolveContentSuggestion(options)?.target.id, 'b', 'the teacher’s actual context wins over a random empty notebook');
  assert.equal(resolveContentSuggestion({ ...options, preferredClassId: 'c' })?.target.id, 'c');
  assert.equal(resolveContentSuggestion({ ...options, visibleClassIds: ['a', 'c'] })?.target.id, 'a');
  assert.equal(resolveContentSuggestion({ ...options, visibleClassIds: [] }), undefined);
  assert.equal(resolveContentSuggestion({ ...options, preferredClassId: 'deleted', visibleClassIds: ['c'] })?.target.id, 'c');
  assert.deepEqual(orderCompanionClasses([...classes].reverse(), undefined, now).map(item => item.id), ['b', 'a', 'c']);
  assert.deepEqual(classes.map(item => item.id), ['a', 'b', 'c'], 'no shared array mutation');
});

test('unknown and corrupt origins are never guessed as personal or predefined', () => {
  const classes = [makeClass('a', { curriculumSourceId: 'official-plan' }), makeClass('b')];
  const result = resolveContentSuggestion({ classes, now, readLessons: id => { if (id === 'a') throw Error('corrupt'); return lessons; } });
  assert.equal(result?.target.id, 'b');
  assert.equal(result?.origin, 'unknown');
  assert.equal(resolveContentSuggestion({ classes, now, readLessons: () => { throw Error('corrupt'); } }), undefined);
  assert.equal(resolveContentSuggestion({ classes, now }), undefined);
});

test('contact cooldown is per class and uses real teacher click events, never admin messages or future clocks', () => {
  const classes = [makeClass('a'), makeClass('b')];
  const contact: AdminMessage = { id: 'contact', sender: 'teacher', event: 'whatsapp-contact', classId: 'a', title: 'Contact', body: 'Opened', createdAt: '2026-10-22T09:00:00Z' };
  const options = { classes, now, readLessons: () => lessons, messages: [contact] };
  assert.equal(resolveContentSuggestion(options)?.target.id, 'b');
  assert.equal(resolveContentSuggestion({ ...options, contactedClassIds: new Set(['b']) }), undefined);
  for (const patch of [{ sender: 'admin' as const }, { event: undefined }, { createdAt: '2026-10-20T10:00:00Z' }, { createdAt: 'invalid' }, { createdAt: '2030-01-01' }]) {
    assert.equal(resolveContentSuggestion({ ...options, messages: [{ ...contact, ...patch }] })?.target.id, 'a');
  }
});

test('evidence excludes evaluations and their children, free notes and invalid dates; undated content is normal', () => {
  const data: LessonsData = [...lessons, { type: 'evaluation_diagnostic', title: 'Évaluation', items: [{ type: 'exercice', date: '2026-10-22' }] },
    { type: 'free', title: 'Note', date: '2026-10-22' },
    { type: 'chapter', title: 'Suite', items: [{ type: 'exercice', date: '2026-02-30' }, { type: 'exercice', date: '2026-10-22' }] }];
  assert.deepEqual(notebookContentEvidence(data), { empty: false, contentCount: 3, assignedCount: 1 });
  assert.equal(notebookContentEvidence(data), notebookContentEvidence(data), 'immutable snapshots share a cached traversal');
  assert.equal(notebookContentEvidence([{ type: 'evaluation_diagnostic', title: 'Évaluation diagnostique 1' }]).empty, true);
  assert.deepEqual(notebookContentEvidence(lessons), { empty: false, contentCount: 1, assignedCount: 0 });
});

test('messages integrate the actual class in one paragraph, vary stably and match every origin in three locales', () => {
  for (const origin of ['personal', 'predefined', 'imported', 'unknown'] as const) {
    const suggestion = { target: makeClass('x', { name: 'MPSI Groupe 2' }), origin, evidence: notebookContentEvidence(lessons) };
    for (const locale of ['fr', 'ar', 'en'] as const) {
      const message = contentSuggestionMessage(suggestion, locale, '2026-10-22');
      assert.equal(message.subject, undefined);
      assert.ok(message.detailEmphasis && message.detail.includes(message.detailEmphasis));
      assert.doesNotMatch(message.detail, /\n|\r|<br|Bonjour Prof/);
      assert.deepEqual(contentSuggestionMessage(suggestion, locale, '2026-10-22'), message);
      const variants = new Set(Array.from({ length: 7 }, (_, index) => contentSuggestionMessage(suggestion, locale, `2026-10-${22 + index}`).detail));
      assert.equal(variants.size, 2);
    }
  }

  // Predefined origin explicitly proposes adapted or personalized content
  const predefined = { target: makeClass('p', { name: 'Tronc Commun' }), origin: 'predefined' as const, evidence: notebookContentEvidence(lessons) };
  const msgAr = contentSuggestionMessage(predefined, 'ar', '2026-10-22');
  const msgFr = contentSuggestionMessage(predefined, 'fr', '2026-10-22');
  assert.ok(msgAr.detail.includes('مخصص') || msgAr.detail.includes('مكيفة') || msgAr.detail.includes('تكييف'));
  assert.ok(msgFr.detail.includes('adapté') || msgFr.detail.includes('personnalisé'));
});

test('content personalization precedes routine setup but never service failures, unread replies or an active session', () => {
  const signals: Parameters<typeof decideCompanion>[0] = { guidance: { step: 'schedule', classId: 'a', className: 'A', remaining: 2 },
    authenticated: true, online: true, syncStatus: 'synced', transfer: 'ready', inboxLoaded: true, inboxFailed: false,
    messages: [], hasNotebookReader: true, hasContentSuggestion: true };
  assert.equal(decideCompanion(signals).kind, 'offer');
  assert.equal(decideCompanion({ ...signals, hasContentSuggestion: false }).kind, 'guidance');
  assert.equal(decideCompanion({ ...signals, syncStatus: 'error' }).kind, 'sync-error');
  assert.equal(decideCompanion({ ...signals, guidance: { step: 'active-session', classId: 'a', className: 'A' } }).kind, 'guidance');
  assert.equal(decideCompanion({ ...signals, messages: [{ id: 'reply', replyTo: 'teacher-x', title: 'Réponse', body: 'Oui', createdAt: '2026-10-22' }] }).kind, 'reply');
  assert.equal(decideCompanion({ ...signals, authenticated: false, online: false }).kind, 'guidance');
});

test('notebook recovery is not hidden by missing timetable slots or a commercial suggestion', () => {
  const classes = [makeClass('a')];
  const guidance = resolveClassGuidance(classes, {}, undefined, { readLessons: () => { throw Error('corrupt'); } });
  assert.equal(guidance.step, 'notebook-unavailable');
  const broken: LessonsData = [{ type: 'chapter', title: 'Cours', items: [{ type: 'definition', description: '$x' }] }];
  assert.equal(resolveClassGuidance(classes, {}, undefined, { readLessons: () => broken }).step, 'notebook-issue');
});

test('WhatsApp request intent and class context match the visible offer, without auto-sending a message', () => {
  for (const locale of ['ar', 'fr', 'en'] as const) {
    const texts = new Set<string>();
    for (const intent of ['create', 'adapt', 'enrich'] as const) {
      const url = new URL(buildSupportWhatsAppUrl(locale, { className: 'MPSI 2', intent }));
      const text = url.searchParams.get('text')!;
      assert.equal(url.origin, 'https://wa.me');
      assert.ok(text.includes('MPSI 2'));
      texts.add(text);
    }
    assert.equal(texts.size, 3);
  }
});

test('ignoring a content suggestion falls back to timetable or notebook problems, and if none, celebratory bravo message', () => {
  const classes = [makeClass('a'), makeClass('b')];
  const options = { classes, now, readLessons: () => lessons };

  // Initial state offers class 'a'
  const first = resolveContentSuggestion(options);
  assert.equal(first?.target.id, 'a');

  // Ignored class 'a' advances to class 'b'
  const second = resolveContentSuggestion({ ...options, ignoredClassIds: new Set(['a']) });
  assert.equal(second?.target.id, 'b');

  // Both ignored: suggestion yields undefined
  const none = resolveContentSuggestion({ ...options, ignoredClassIds: new Set(['a', 'b']) });
  assert.equal(none, undefined);

  // When suggestions are ignored and timetable slot is missing for 'b', companion falls through to timetable guidance
  const timetableGuidance = resolveClassGuidance(classes, { timetable: [{ classId: 'a', day: 1, slot: 0 }] });
  assert.equal(timetableGuidance.step, 'schedule');
  assert.equal('classId' in timetableGuidance && timetableGuidance.classId, 'b');

  // When all timetable slots are set and notebooks are ready, companion celebrates with bravo
  const allScheduled = { timetable: [{ classId: 'a', day: 1, slot: 0 }, { classId: 'b', day: 2, slot: 1 }] };
  const readyGuidance = resolveClassGuidance(classes, allScheduled, undefined, { readLessons: () => lessons });
  assert.equal(readyGuidance.step, 'ready');

  // Both Arabic and French messages contain "bravo" / "برافو"
  const msgAr = classGuidanceMessage(readyGuidance, 'ar');
  const msgFr = classGuidanceMessage(readyGuidance, 'fr');
  assert.match(msgAr.detail, /برافو/);
  assert.match(msgFr.detail, /bravo/i);
});
