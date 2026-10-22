import assert from 'node:assert/strict';
import test from 'node:test';
import { formatLocalizedClassDisplayName } from '../src/constants/class-levels';
import type { ClassGuidance } from '../src/domain/assistant/classGuidance';
import type { ContentSuggestion } from '../src/domain/assistant/contentSuggestion';
import { companionClassName } from '../src/features/assistant/companionClassName';
import { classGuidanceMessage, type CompanionMessage } from '../src/features/assistant/companionCopy';
import { contentSuggestionMessage } from '../src/features/assistant/contentSuggestionCopy';

const officialName = '2ème Bac Sciences Physiques 3';
const arabicName = 'الثانية بكالوريا علوم فيزيائية 3';
const names = [officialName, arabicName, `قسم ${arabicName}`, `قسم قسم ${arabicName}`, `قِسْمُ\n\u2067${arabicName}\u2069`, `قسم ${officialName}`];
const evidence = { empty: false, contentCount: 2, assignedCount: 1 };

function assertClassMention(message: CompanionMessage): void {
  assert.equal(message.detailEmphasis, arabicName, 'emphasis retains the branch and group number');
  assert.equal(message.detail.split(arabicName).length, 2, 'mention the target class exactly once');
  assert.doesNotMatch(message.detail, /قسم\s+قسم|[\r\n\u2066-\u2069]/u);
}

test('companion owns the Arabic class prefix without altering stored or dashboard names', () => {
  for (const name of names) assert.equal(companionClassName(name, 'ar'), arabicName);
  assert.equal(formatLocalizedClassDisplayName(officialName, 'ar'), `قسم ${arabicName}`);
  for (const name of ['قسمية 3', 'مشروع قسم العلوم 2', 'Atelier MPSI 2', 'قسم']) {
    assert.equal(companionClassName(name, 'ar'), name, 'do not strip a substring or a whole custom name');
  }
  for (const locale of ['fr', 'en'] as const) {
    assert.equal(companionClassName(officialName, locale), formatLocalizedClassDisplayName(officialName, locale));
  }
});

test('all content situations and daily variants introduce the class only once', () => {
  const situations: Pick<ContentSuggestion, 'origin' | 'evidence'>[] = [
    ...(['personal', 'predefined', 'imported', 'unknown'] as const).map(origin => ({ origin, evidence })),
    { origin: 'unknown', evidence: { ...evidence, assignedCount: 0 } },
    { origin: 'unknown', evidence: { empty: true, contentCount: 0, assignedCount: 0 } },
  ];
  for (const name of names) {
    for (const situation of situations) {
      for (const day of ['2026-10-22', '2026-10-23']) {
        const message = contentSuggestionMessage({ target: { id: 'physics', name }, ...situation }, 'ar', day);
        assertClassMention(message);
        if (!situation.evidence.empty) {
          assert.match(message.detail, /^هل تعلم\s*:/u);
        }
      }
    }
  }
});

test('confirmed editor actions also use the class name without a second prefix', () => {
  for (const name of names) {
    for (const kind of ['content', 'dates', 'order'] as const) {
      assertClassMention(contentSuggestionMessage({
        target: { id: 'physics', name }, origin: 'personal', evidence, activity: { kind, at: 10 },
      }, 'ar', '2026-10-22'));
    }
  }
});

test('schedule, session, diagnostic and recovery guidance share the same Arabic naming rule', () => {
  for (const className of names) {
    const base = { classId: 'physics', className, remaining: 1 };
    const guidance: ClassGuidance[] = [
      { ...base, step: 'schedule' }, { ...base, step: 'active-session' },
      { ...base, step: 'notebook-issue', issueCode: 'unclosedFormula', count: 1 },
      { ...base, step: 'notebook-empty' }, { ...base, step: 'notebook-unavailable' },
      { ...base, step: 'checking' }, { ...base, step: 'ready' },
    ];
    for (const state of guidance) assertClassMention(classGuidanceMessage(state, 'ar'));
  }
});
