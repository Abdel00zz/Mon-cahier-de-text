import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { StudentNamesEditor } from '../src/features/evaluations/components/StudentNamesEditor';

const render = (tracked: boolean, initialNames = ['أمين', 'سلمى']) => renderToStaticMarkup(React.createElement(LocaleProvider, {
  locale: 'ar', children: React.createElement(StudentNamesEditor, { onManageStudents: () => {}, initialNames, variant: 'checked', trackNotebookCondition: tracked,
    initialNotebookConditions: { 'أمين': 'good' }, onSave: () => {}, onCancel: () => {} }),
}));

test('notebook tracking gives each student one choice list (plus the filter), with the saved choice shown and legacy names pending', () => {
  const html = render(true);
  assert.equal((html.match(/role="combobox"/g) ?? []).length, 3, 'deux élèves et le filtre');
  assert.doesNotMatch(html, /type="radio"/);
  assert.equal((html.match(/data-tone="good"/g) ?? []).length >= 1, true, 'le choix enregistré porte sa teinte');
  assert.ok(html.includes('جيد'));
  assert.ok(html.includes('لم يُراقَب بعد'));
  assert.equal((html.match(/<fieldset/g) ?? []).length, 2);
  assert.match(html, /aria-live="polite"/);
});

test('other student lists keep their simple labels and an empty notebook list has a direct entry action', () => {
  assert.doesNotMatch(render(false), /type="radio"/);
  assert.match(render(true, []), /أضف التلاميذ/);
  assert.match(render(true, []), /إضافة التلاميذ أو إدارة اللائحة/);
});

test('notebook and oral tracking prefill the class roster and link to shared class settings alongside auxiliary search', () => {
  const roster = { names: ['أحمد العلوي', 'سلمى الفاسي'], version: 1, updatedAt: '2026-10-08T08:00:00Z' };
  for (const oral of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'ar', children: React.createElement(StudentNamesEditor, { onManageStudents: () => {},
      initialNames: [], roster, trackNotebookCondition: !oral, trackOral: oral, variant: 'checked', onCancel: () => {}, onSave: () => {},
    }) }));
    assert.equal((html.match(/<fieldset/g) ?? []).length, 2);
    assert.equal((html.match(/role="combobox"/g) ?? []).length, 3);
    assert.doesNotMatch(html, /type="radio"/);
    assert.match(html, /type="search"/);
    assert.match(html, /class="student-search-bar"/);
    assert.doesNotMatch(html, /student-add/);
    assert.match(html, /إضافة التلاميذ أو إدارة اللائحة/);
    assert.doesNotMatch(html, /notebook-summary|notebook-progress/);
    assert.match(html, /أحمد العلوي/);
    if (oral) {
      assert.ok(html.includes('لم يُقوَّم بعد'));
      assert.doesNotMatch(html, /حالة دفتر/);
    }
  }
});

test('la liste administrative remplit les participants simples mais ne déclare jamais toute la classe absente', () => {
  const roster = { names: ['Amine Alami', 'Salma Fassi'], version: 1, updatedAt: '2026-10-14T08:00:00Z' };
  const show = (variant: 'checked' | 'absent') => renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children: React.createElement(StudentNamesEditor, { onManageStudents: () => {},
    initialNames: [], roster, variant, onCancel: () => {}, onSave: () => {},
  }) }));
  assert.match(show('checked'), /<bdi>Amine Alami<\/bdi>/);
  assert.equal((show('absent').match(/type="checkbox"/g) ?? []).length, 2);
  assert.doesNotMatch(show('absent'), /checked=""/);
  assert.match(show('checked'), /checked=""/);
});
