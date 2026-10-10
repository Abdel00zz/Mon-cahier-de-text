import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractHomeworkNumber,
  hasHomeworkMention,
  collectKnownHomeworkNumbers,
  getNextHomeworkNumber,
  replaceOrInsertHomeworkInRemark,
  removeHomeworkFromRemark,
  normalizeDigits,
} from '../src/domain/evaluations/homeworkNumbering';
import type { LessonsData } from '../src/types';

test('normalizeDigits converts Eastern Arabic numerals to standard digits', () => {
  assert.equal(normalizeDigits('١٢٣'), '123');
  assert.equal(normalizeDigits('۰۱۲۳۴۵۶۷۸۹'), '0123456789');
  assert.equal(normalizeDigits('الفرض رقم ١'), 'الفرض رقم 1');
});

test('extractHomeworkNumber identifies Arabic homework formats with and without رقم', () => {
  assert.equal(extractHomeworkNumber('تم إعطاء الفرض المنزلي رقم 1'), 1);
  assert.equal(extractHomeworkNumber('تم إعطاء الفرض المنزلي رقم 2'), 2);
  assert.equal(extractHomeworkNumber('تم إعطاء الفرض المنزلي رقم ٢'), 2);
  assert.equal(extractHomeworkNumber('تم إعطاء الفرض المنزلي 3'), 3);
  assert.equal(extractHomeworkNumber('الفرض المنزلي رقم 4'), 4);
  assert.equal(extractHomeworkNumber('تصحيح الفرض المنزلي رقم 5'), 5);
  assert.equal(extractHomeworkNumber('تم إعطاء الفرض المنزلي'), null);
});

test('extractHomeworkNumber identifies French and English homework formats', () => {
  assert.equal(extractHomeworkNumber('Devoir maison 1 donné'), 1);
  assert.equal(extractHomeworkNumber('Devoir maison n° 2'), 2);
  assert.equal(extractHomeworkNumber('Devoir maison 3'), 3);
  assert.equal(extractHomeworkNumber('DM 4'), 4);
  assert.equal(extractHomeworkNumber('Correction devoir maison 2'), 2);
  assert.equal(extractHomeworkNumber('Homework 2 assigned'), 2);
  assert.equal(extractHomeworkNumber('Homework #5'), 5);
});

test('hasHomeworkMention detects any form of homework mention', () => {
  assert.equal(hasHomeworkMention('تم إعطاء الفرض المنزلي رقم 1'), true);
  assert.equal(hasHomeworkMention('تم إعطاء الفرض المنزلي'), true);
  assert.equal(hasHomeworkMention('Devoir maison 1 donné'), true);
  assert.equal(hasHomeworkMention('DM 2'), true);
  assert.equal(hasHomeworkMention('مراقبة دفاتر التلاميذ'), false);
  assert.equal(hasHomeworkMention(''), false);
});

test('collectKnownHomeworkNumbers gathers numbers across remarks, blocks, and config', () => {
  const lessons: LessonsData = [
    {
      type: 'chapter',
      title: 'Chapitre 1',
      items: [
        { type: 'cours', title: 'Leçon 1', date: '2026-10-01', remark: 'تم إعطاء الفرض المنزلي رقم 1' },
        { type: 'exercice', title: 'Ex 1', date: '2026-10-05', remark: 'Devoir maison 2 donné' },
      ],
    },
    {
      type: 'correction_devoir_maison',
      title: 'تصحيح الفرض المنزلي رقم 3',
      date: '2026-10-10',
    },
  ];

  const known = collectKnownHomeworkNumbers({
    lessons,
    manualAssessments: [{ id: 'man-1', type: 'maison', num: 4 }],
    assessmentDates: { '2026-2027:s1-maison5': '2026-11-01' },
  });

  assert.deepEqual([...known].sort((a, b) => a - b), [1, 2, 3, 4, 5]);
});

test('getNextHomeworkNumber calculates the next synchronized number', () => {
  const lessons: LessonsData = [
    {
      type: 'chapter',
      title: 'Chapitre 1',
      items: [
        { type: 'cours', title: 'L1', remark: 'تم إعطاء الفرض المنزلي رقم 1' },
      ],
    },
  ];

  assert.equal(getNextHomeworkNumber({ lessons }), 2);

  // Si la remarque courante a déjà un numéro, il est conservé
  assert.equal(getNextHomeworkNumber({ lessons, currentRemark: 'تم إعطاء الفرض المنزلي رقم 1' }), 1);
  assert.equal(getNextHomeworkNumber({ lessons, currentRemark: 'تم إعطاء الفرض المنزلي رقم 3' }), 3);
});

test('replaceOrInsertHomeworkInRemark updates existing homework or prepends cleanly', () => {
  // Insertion dans remarque vide
  assert.equal(
    replaceOrInsertHomeworkInRemark('', 'تم إعطاء الفرض المنزلي رقم 1'),
    'تم إعطاء الفرض المنزلي رقم 1'
  );

  // Remplacement de numéro dans une remarque existante
  const initial = 'تم إعطاء الفرض المنزلي رقم 1\nمراقبة الدفاتر';
  const updated = replaceOrInsertHomeworkInRemark(initial, 'تم إعطاء الفرض المنزلي رقم 2');
  assert.equal(updated, 'تم إعطاء الفرض المنزلي رقم 2\nمراقبة الدفاتر');

  // Remplacement d'une mention non numérotée
  const unnumbered = 'تم إعطاء الفرض المنزلي\nAutre remarque';
  const numbered = replaceOrInsertHomeworkInRemark(unnumbered, 'تم إعطاء الفرض المنزلي رقم 3');
  assert.equal(numbered, 'تم إعطاء الفرض المنزلي رقم 3\nAutre remarque');
});

test('removeHomeworkFromRemark removes homework line leaving other text intact', () => {
  const withOther = 'تم إعطاء الفرض المنزلي رقم 1\nمراقبة الدفاتر';
  assert.equal(removeHomeworkFromRemark(withOther), 'مراقبة الدفاتر');

  const onlyHomework = 'تم إعطاء الفرض المنزلي رقم 1';
  assert.equal(removeHomeworkFromRemark(onlyHomework), '');
});
