import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { StudentNamesEditor } from '../src/features/evaluations/components/StudentNamesEditor';

const render = (tracked: boolean, initialNames = ['أمين', 'سلمى']) => renderToStaticMarkup(React.createElement(LocaleProvider, {
  locale: 'ar', children: React.createElement(StudentNamesEditor, { initialNames, variant: 'checked', trackNotebookCondition: tracked,
    initialNotebookConditions: { 'أمين': 'good' }, onSave: () => {}, onCancel: () => {} }),
}));

test('notebook tracking offers four native radio options per student with one saved choice and pending legacy names', () => {
  const html = render(true);
  assert.equal((html.match(/type="radio"/g) ?? []).length, 8);
  assert.equal((html.match(/checked=""/g) ?? []).length, 1);
  assert.ok(html.includes('لم يُراقَب بعد'));
  for (const label of ['جيد', 'متوسط', 'يحتاج تحسيناً', 'لم يُحضَر']) assert.ok(html.includes(label));
  assert.equal((html.match(/<fieldset/g) ?? []).length, 2);
  assert.match(html, /aria-live="polite"/);
});

test('other student lists keep their simple labels and an empty notebook list has a direct entry action', () => {
  assert.doesNotMatch(render(false), /type="radio"/);
  assert.match(render(true, []), /أضف التلاميذ/);
  assert.match(render(true, []), /aria-label="إضافة تلميذ"/);
});

test('notebook and oral tracking prefill the class roster and always expose a floating search', () => {
  const roster = { names: ['أحمد العلوي', 'سلمى الفاسي'], version: 1, updatedAt: '2026-10-08T08:00:00Z' };
  for (const oral of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'ar', children: React.createElement(StudentNamesEditor, {
      initialNames: [], roster, trackNotebookCondition: !oral, trackOral: oral, variant: 'checked', onCancel: () => {}, onSave: () => {},
    }) }));
    assert.equal((html.match(/<fieldset/g) ?? []).length, 2);
    assert.equal((html.match(/type="radio"/g) ?? []).length, oral ? 6 : 8);
    assert.match(html, /type="search"/);
    assert.match(html, /class="student-search-bar"/);
    assert.doesNotMatch(html, /notebook-summary|notebook-progress/);
    assert.match(html, /<select/);
    assert.match(html, /أحمد العلوي/);
    if (oral) {
      for (const label of ['مكتسب', 'في طور الاكتساب', 'يحتاج إلى دعم', 'لم يُقوَّم بعد']) assert.ok(html.includes(label));
      assert.doesNotMatch(html, /حالة دفتر/);
    }
  }
});
