import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsTabNavigation } from '../src/features/settings/components/SettingsTabNavigation';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { CalendarRange, User } from '../src/components/ui/icons';
import { ProfileTab } from '../src/features/settings/components/ProfileTab';
import { SUBJECTS, formatLocalizedSubjectDisplayName } from '../src/constants';

test('settings page tabs expose one keyboard entry point and link to the current panel in each language', () => {
  for (const locale of ['fr', 'ar', 'en'] as const) {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale, children:
      createElement(SettingsTabNavigation, {
        items: [{ id: 'schedule', titleKey: 'Schedule', icon: CalendarRange }, { id: 'profile', titleKey: 'Profile', icon: User }],
        activeId: 'profile', onChange: () => {}, onPrepare: () => {}, translate: key => key,
        idPrefix: `settings-${locale}`, label: 'Settings',
      }),
    }));
    assert.equal((html.match(/role="tab"/g) ?? []).length, 2);
    assert.equal((html.match(/tabindex="0"/g) ?? []).length, 1);
    assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1);
    assert.equal((html.match(new RegExp(`aria-controls="settings-${locale}-panel"`, 'g')) ?? []).length, 2);
    assert.match(html, new RegExp(`id="settings-${locale}-profile"`));
    assert.ok(html.includes('Schedule') && html.includes('Profile'), 'labels remain available');
    assert.ok(!html.includes('<svg'), 'settings tabs do not render icons');
  }
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

