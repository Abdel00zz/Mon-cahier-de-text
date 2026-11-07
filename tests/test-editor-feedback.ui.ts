import assert from 'node:assert/strict';
import test from 'node:test';
import type { ComponentProps } from 'react';
import { ContentRenderer } from '../src/features/editor/ContentRenderer';
import { createSessionDateValidator, validateSessionDate } from '../src/domain/calendar/dateValidation';

test('date validation is shared per date without hiding changes of class settings or language', () => {
  const classroom = { id: 'c', name: '2ème Bac Sciences Physiques 1', cycle: 'lycee' as const, subject: 'Mathématiques' };
  const config = { schoolYearStart: '2026-09-07', absences: [{ debut: '2026-11-09', fin: '2026-11-09', motif: 'Formation' }] };
  const cached = createSessionDateValidator(classroom, config, 'fr');
  for (const date of ['2026-11-09', '2026-11-15', '2026-02-31', '', '2026-11-09T08:00:00Z']) {
    assert.deepEqual(cached(date), validateSessionDate(date, classroom, config, 'fr'));
    assert.equal(cached(date), cached(date), 'une seule validation par date pour toutes les cellules');
  }
  const withAbsence = cached('2026-11-09');
  assert.ok(withAbsence.some(w => w.type === 'absence'));
  assert.ok(!createSessionDateValidator(classroom, { ...config, absences: [] })('2026-11-09').some(w => w.type === 'absence'));
  assert.notDeepEqual(createSessionDateValidator(classroom, config, 'ar')('2026-11-09'), withAbsence);
});

test('unchanged lesson text skips typesetting after projection but edits, moves and documents still refresh', () => {
  type Props = ComponentProps<typeof ContentRenderer>;
  const compare = (ContentRenderer as unknown as { compare: (a: Props, b: Props) => boolean }).compare;
  const previous: Props = { data: { type: 'exercice', title: '$x^2$' }, indices: { chapterIndex: 0, sectionIndex: 0, itemIndex: 0 }, elementType: 'item' };
  assert.equal(compare(previous, { ...previous, indices: { ...previous.indices } }), true);
  const changes: Partial<Props>[] = [
    { data: { ...previous.data, title: '$x^3$' } },
    { indices: { ...previous.indices, sectionIndex: 1 } },
    { highlight: 'x' }, { showDescriptions: true }, { contentNumber: '2' }, { isPrint: true },
    { getDocumentPreview: () => undefined }, { onOpenDocumentPreview: () => {} },
  ];
  for (const change of changes) assert.equal(compare(previous, { ...previous, ...change }), false);
});
