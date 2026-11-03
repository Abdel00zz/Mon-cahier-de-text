import assert from 'node:assert/strict';
import test from 'node:test';
import type { ClassInfo } from '../src/types';
import type { GuideChapter } from '../src/constants/guide/model';
import { findCompanionResources, indexCompanionResources } from '../src/features/assistant/companionSearch';

const classes: ClassInfo[] = ['1', '10'].map(id => ({
  id, name: `قسم علوم فيزيائية ${id}`, subject: 'Physique', teacherName: '', color: '', createdAt: '2026-10-01',
}));
const guide: GuideChapter = { id: 'schedule', title: 'Emploi du temps', summary: 'Définir les horaires de vos classes',
  keywords: 'horaire calendrier', sections: [{ id: 'dates', title: 'Début des cours' }], related: [] };

test('Arabic accents and digits match the exact current class, never another group', () => {
  const entries = indexCompanionResources(classes, [], [], 'ar');
  const results = findCompanionResources(entries, 'عُلُوم فيزيائية ١');
  assert.deepEqual(results.map(item => item.destination), [{ kind: 'class', action: { type: 'open-class', classId: '1' } }]);
  assert.equal(findCompanionResources(entries, 'علوم فيزيائية 2').length, 0);
  const updated = indexCompanionResources(classes.slice(1), [], [], 'ar');
  assert.equal(findCompanionResources(updated, 'علوم فيزيائية 1').length, 0, 'removed classes cannot remain navigable');
});

test('guide search returns a real anchor and requires every meaningful query token', () => {
  const entries = indexCompanionResources([], [], [guide], 'fr');
  const results = findCompanionResources(entries, 'Comment définir les horaires ?');
  assert.deepEqual(results.map(item => item.destination), [{ kind: 'guide', reference: { chapterId: 'schedule' } }]);
  assert.equal(findCompanionResources(entries, 'horaires inexistants').length, 0);
  assert.equal(findCompanionResources(entries, 'comment').length, 0);
  assert.equal(findCompanionResources(entries, '').length, 1);
});
