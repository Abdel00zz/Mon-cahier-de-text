import assert from 'node:assert/strict';
import test from 'node:test';
import { GUIDE_AR, GUIDE_FR, searchGuide } from '../src/constants/guides';
import { resolveGuideReference } from '../src/constants/guide/navigation';
import type { GuideReference } from '../src/constants/guide/model';
import type { ClassGuidance } from '../src/domain/assistant/classGuidance';
import type { CompanionDecision } from '../src/domain/assistant/companionDecision';
import { companionHelpReference } from '../src/domain/assistant/companionHelp';

const base = { classId: 'physics', className: '2BAC PC 3', remaining: 1 };
const ready: ClassGuidance = { ...base, step: 'ready' };

function assertReference(reference: GuideReference | undefined): asserts reference is GuideReference {
  assert.ok(reference, 'this procedure requires contextual instructions');
  for (const entries of [GUIDE_FR, GUIDE_AR]) {
    const result = resolveGuideReference(entries, reference);
    assert.equal(result.chapter?.id, reference.chapterId, 'no silent fallback for known assistant actions');
    if (reference.sectionId) assert.equal(result.section?.id, reference.sectionId);
    assert.ok(result.chapter && entries.includes(result.chapter), 'reuse live guide content, not a second copy');
    assert.ok(result.section && result.chapter.sections.includes(result.section));
  }
}

test('configuration and documented procedures offer a precise bilingual how-to', () => {
  const states: ClassGuidance[] = [
    { step: 'create' }, { ...base, step: 'schedule' }, { ...base, step: 'active-session' },
    { ...base, step: 'notebook-empty' }, { ...base, step: 'notebook-unavailable' },
    { ...base, step: 'notebook-followup', reason: 'first-session', elapsedDays: 5 },
    ...(['unclosedFormula', 'outOfOrderSessions', 'emptyStructure'] as const)
      .map(issueCode => ({ ...base, step: 'notebook-issue' as const, issueCode, count: 1 })),
  ];
  for (const guidance of states) assertReference(companionHelpReference({ kind: 'guidance' }, guidance));
  assert.deepEqual(companionHelpReference({ kind: 'guidance' }, { ...base, step: 'active-session' }), { chapterId: 'dates', sectionId: 'assign' });
  assert.deepEqual(companionHelpReference({ kind: 'guidance' }, { ...base, step: 'schedule' }), { chapterId: 'schedule' });
  assert.deepEqual(companionHelpReference({ kind: 'guidance' }, {
    ...base, step: 'notebook-followup', reason: 'first-session', elapsedDays: 5,
  }), { chapterId: 'dates', sectionId: 'assign' });
});

test('statuses, replies and offers never inherit how-to instructions from an underlying problem', () => {
  const decisions: CompanionDecision[] = [
    ...(['offline', 'syncing', 'checking', 'inbox-error', 'offer'] as const).map(kind => ({ kind })),
    { kind: 'reply', reply: { id: 'reply', title: 'Question', body: 'Aide', createdAt: '2026-10-22' } },
  ];
  for (const decision of decisions) {
    assert.equal(companionHelpReference(decision, { ...base, step: 'schedule' }), undefined);
    assert.equal(companionHelpReference(decision, {
      ...base, step: 'notebook-issue', issueCode: 'unclosedFormula', count: 1,
    }), undefined);
  }
  const recovery = companionHelpReference({ kind: 'sync-error' }, ready);
  assertReference(recovery);
  assert.deepEqual(recovery, { chapterId: 'devices', sectionId: 'data-safety' });
});

test('success, waiting, routine reminders and findings without specific instructions keep only their direct action', () => {
  const states: ClassGuidance[] = [ready, { ...base, step: 'checking' },
    { ...base, step: 'notebook-followup', reason: 'long-pause', elapsedDays: 5, lastSessionDate: '2026-10-12' },
    ...(['duplicateBlocks', 'controlCharacters'] as const)
      .map(issueCode => ({ ...base, step: 'notebook-issue' as const, issueCode, count: 1 })),
  ];
  for (const guidance of states) {
    assert.equal(companionHelpReference({ kind: 'guidance' }, guidance), undefined, guidance.step);
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
