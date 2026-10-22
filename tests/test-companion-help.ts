import assert from 'node:assert/strict';
import test from 'node:test';
import { GUIDE_AR, GUIDE_FR, searchGuide } from '../src/constants/guides';
import { resolveGuideReference } from '../src/constants/guide/navigation';
import type { GuideReference } from '../src/constants/guide/model';
import type { ClassGuidance } from '../src/domain/assistant/classGuidance';
import type { CompanionDecision } from '../src/domain/assistant/companionDecision';
import type { ContentSuggestion } from '../src/domain/assistant/contentSuggestion';
import { companionHelpReference } from '../src/domain/assistant/companionHelp';

const base = { classId: 'physics', className: '2BAC PC 3', remaining: 1 };
const ready: ClassGuidance = { ...base, step: 'ready' };
const suggestion: ContentSuggestion = {
  target: { id: base.classId, name: base.className }, origin: 'predefined',
  evidence: { empty: false, contentCount: 2, assignedCount: 1 },
};

function assertReference(reference: GuideReference) {
  for (const entries of [GUIDE_FR, GUIDE_AR]) {
    const result = resolveGuideReference(entries, reference);
    assert.equal(result.chapter?.id, reference.chapterId, 'no silent fallback for known assistant actions');
    if (reference.sectionId) assert.equal(result.section?.id, reference.sectionId);
    assert.ok(result.chapter && entries.includes(result.chapter), 'reuse live guide content, not a second copy');
    assert.ok(result.section && result.chapter.sections.includes(result.section));
  }
}

test('every guidance and diagnostic points to an existing bilingual help section', () => {
  const states: ClassGuidance[] = [
    { step: 'create' }, { ...base, step: 'schedule' }, { ...base, step: 'active-session' },
    { ...base, step: 'notebook-empty' }, { ...base, step: 'notebook-unavailable' }, { ...base, step: 'checking' }, ready,
    ...(['unclosedFormula', 'outOfOrderSessions', 'emptyStructure', 'duplicateBlocks', 'controlCharacters'] as const)
      .map(issueCode => ({ ...base, step: 'notebook-issue' as const, issueCode, count: 1 })),
  ];
  for (const guidance of states) assertReference(companionHelpReference({ kind: 'guidance' }, guidance));
  assert.deepEqual(companionHelpReference({ kind: 'guidance' }, { ...base, step: 'active-session' }), { chapterId: 'dates', sectionId: 'assign' });
  assert.equal(companionHelpReference({ kind: 'guidance' }, { ...base, step: 'schedule' }).chapterId, 'schedule');
});

test('service or inbox help takes priority over content promotion and an underlying timetable problem', () => {
  const decisions: CompanionDecision[] = [
    ...(['sync-error', 'offline', 'syncing', 'checking', 'inbox-error'] as const).map(kind => ({ kind })),
    { kind: 'reply', reply: { id: 'reply', title: 'Question', body: 'Aide', createdAt: '2026-10-22' } },
  ];
  for (const decision of decisions) {
    const reference = companionHelpReference(decision, { ...base, step: 'schedule' }, suggestion);
    assertReference(reference);
    assert.notEqual(reference.chapterId, 'content');
    assert.notEqual(reference.chapterId, 'schedule');
  }
  assert.deepEqual(companionHelpReference({ kind: 'offline' }, ready), { chapterId: 'devices', sectionId: 'data-safety' });
});

test('help distinguishes imported content, recent moves, date actions and an empty notebook', () => {
  for (const origin of ['personal', 'predefined', 'imported', 'unknown'] as const) {
    const reference = companionHelpReference({ kind: 'offer' }, ready, { ...suggestion, origin });
    assertReference(reference);
    assert.equal(reference.sectionId, origin === 'imported' ? 'transfer' : 'prepare');
  }
  for (const [kind, expected] of [['order', 'editor'], ['dates', 'dates'], ['content', 'content']] as const) {
    const current = { ...suggestion, activity: { kind, at: 1 } };
    const reference = companionHelpReference({ kind: 'offer' }, ready, current);
    assertReference(reference);
    assert.equal(reference.chapterId, expected);
    assert.equal(companionHelpReference({ kind: 'offer' }, ready, {
      ...current, evidence: { empty: true, contentCount: 0, assignedCount: 0 },
    }).sectionId, 'prepare', 'an empty notebook cannot offer stale movement instructions');
  }
});

test('renamed chapters and invalid anchors recover; guide updates are immediately reflected', () => {
  assert.equal(resolveGuideReference(GUIDE_FR, { chapterId: 'removed' }).chapter?.id, 'start');
  const result = resolveGuideReference(GUIDE_FR, { chapterId: 'editor', sectionId: 'removed' });
  assert.equal(result.section, GUIDE_FR.find(entry => entry.id === 'editor')?.sections[0]);
  assert.deepEqual(resolveGuideReference([], { chapterId: 'removed' }), { chapter: undefined, section: undefined });
  const updated = GUIDE_FR.map(entry => entry.id === 'schedule' ? { ...entry, summary: 'Nouvelle explication' } : entry);
  assert.equal(resolveGuideReference(updated, { chapterId: 'schedule' }).chapter?.summary, 'Nouvelle explication');
});

test('all help topics are searchable locally, with Arabic harakat and French accents', () => {
  assert.ok(searchGuide(GUIDE_FR, 'eleves liste').some(entry => entry.id === 'students'));
  assert.ok(searchGuide(GUIDE_AR, 'إِشْعَارَات').some(entry => entry.id === 'notifications'));
  assert.deepEqual(searchGuide(GUIDE_AR, 'zzzz-no-answer'), []);
  for (const entries of [GUIDE_FR, GUIDE_AR]) {
    for (const chapter of entries) {
      assert.ok(searchGuide(entries, chapter.title).includes(chapter));
      const anchors = chapter.sections.map(section => section.id).filter(Boolean);
      assert.equal(new Set(anchors).size, anchors.length);
    }
  }
  assert.deepEqual(GUIDE_FR.map(c => c.sections.map(s => s.id)), GUIDE_AR.map(c => c.sections.map(s => s.id)));
});
