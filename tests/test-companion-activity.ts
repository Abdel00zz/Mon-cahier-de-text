import assert from 'node:assert/strict';
import test from 'node:test';
import { createNotebookActivityMemory } from '../src/domain/assistant/notebookActivity';
import { contentSuggestionMessage } from '../src/features/assistant/contentSuggestionCopy';
import { resolveContentSuggestion } from '../src/domain/assistant/contentSuggestion';
import type { ClassInfo } from '../src/types';

test('confirmed edits, session assignments and drag ordering have distinct reactions', () => {
  const memory = createNotebookActivityMemory();
  for (const [operation, kind] of [['add-item', 'content'], ['edit-merged-content', 'content'], ['assign-date', 'dates'], ['reorder', 'order'], ['move-content', 'order'], ['manage-lessons', 'content']] as const) {
    memory.record('teacher-a', 'class', operation, operation, 'edit', 10);
    assert.equal(memory.read('teacher-a', 'class', operation, 11)?.kind, kind);
  }
  memory.record('teacher-a', 'class', 'r', 'remove-content', 'edit', 12);
  assert.equal(memory.read('teacher-a', 'class', 'r', 13), undefined, 'removing content is not a movement');
});

test('undo, redo and load do not invent a newly completed operation', () => {
  for (const action of ['undo', 'redo', 'reset']) {
    const memory = createNotebookActivityMemory();
    memory.record('owner', 'class', 'old', 'assign-date', 'edit', 10);
    memory.record('owner', 'class', 'new', 'assign-date', action, 11);
    assert.equal(memory.read('owner', 'class', 'new', 12), undefined);
  }
});

test('session memory is bounded and invalidated by account switch, cloud revision, elapsed time or clock rollback', () => {
  for (const [scope, revision, now] of [['other-owner', 'r', 11], ['owner', 'new-cloud-r', 11], ['owner', 'r', 1_800_011], ['owner', 'r', 9]] as const) {
    const memory = createNotebookActivityMemory();
    memory.record('owner', 'class', 'r', 'reorder', 'edit', 10);
    assert.equal(memory.read(scope, 'class', revision, now), undefined);
  }
  const bounded = createNotebookActivityMemory();
  for (let index = 0; index < 25; index++) bounded.record('owner', String(index), 'r', 'edit-content', 'edit', index);
  assert.equal(bounded.read('owner', '0', 'r', 30), undefined);
  assert.equal(bounded.read('owner', '24', 'r', 30)?.kind, 'content');
});

test('repeat saves of the same revision never restart the attention lifetime', () => {
  const memory = createNotebookActivityMemory();
  memory.record('owner', 'class', 'r', 'edit-content', 'edit', 10);
  memory.record('owner', 'class', 'r', 'edit-content', 'edit', 1000);
  assert.equal(memory.read('owner', 'class', 'r', 1001)?.at, 10);
});

test('recent saved actions produce one contextual sentence with the same class and WhatsApp intent', () => {
  const base = { target: { id: 'a', name: 'MPSI 2' }, origin: 'personal' as const, evidence: { empty: false, contentCount: 2, assignedCount: 1 } };
  for (const locale of ['ar', 'fr', 'en'] as const) {
    const variants = new Set();
    for (const kind of ['content', 'dates', 'order'] as const) {
      const message = contentSuggestionMessage({ ...base, activity: { kind, at: 10 } }, locale, '2026-10-22');
      assert.ok(message.detailEmphasis && message.detail.includes(message.detailEmphasis));
      assert.doesNotMatch(message.detail, /\n|\r|<br/);
      assert.equal(message.subject, undefined);
      variants.add(message.detail);
    }
    assert.equal(variants.size, 3);
  }
});

test('legacy local data with an unsupported origin stays neutral rather than crashing or guessing', () => {
  const target = { id: 'a', name: 'Classe A', createdAt: '', notebookContentOrigin: 'unexpected' } as unknown as ClassInfo;
  const suggestion = resolveContentSuggestion({ classes: [target], now: 10, readLessons: () => [{ type: 'chapter', title: 'Cours' }] });
  assert.equal(suggestion?.origin, 'unknown');
  assert.ok(suggestion && contentSuggestionMessage(suggestion, 'fr', '2026-10-22').detail);
});
