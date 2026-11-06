import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SETTINGS_SECTIONS, readSettingsTarget } from '../src/features/settings/settingsSections';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { ProfileTab } from '../src/features/settings/components/ProfileTab';
import { SUBJECTS, formatLocalizedSubjectDisplayName } from '../src/constants';

test('all six settings sections retain direct links and legacy aliases', () => {
  assert.equal(SETTINGS_SECTIONS.length, 6);
  for (const { id } of SETTINGS_SECTIONS) assert.equal(readSettingsTarget(id), id);
  assert.equal(readSettingsTarget('archives'), 'compte');
  assert.equal(readSettingsTarget('donnees'), 'compte');
  for (const value of ['__proto__', 'toString', '', 'unknown', null]) assert.equal(readSettingsTarget(value), undefined);
});

test('collapsed subject choices keep every selected subject visible in both languages', () => {
  const subject = SUBJECTS[SUBJECTS.length - 1];
  for (const locale of ['fr', 'ar'] as const) {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale, children:
      createElement(ProfileTab, {
        config: { establishmentName: '', defaultTeacherName: '', printShowDescriptions: true, selectedSubjects: [subject] },
        onDraft: () => {}, onToggleSubject: () => {}, onToggleCycle: () => {},
      }),
    }));
    assert.ok(html.includes(formatLocalizedSubjectDisplayName(subject, locale)), 'selected subject beyond the initial six stays visible');
    assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
    assert.match(html, /aria-expanded="false"/);
    assert.match(html, /role="group" aria-labelledby=/);
  }
});

