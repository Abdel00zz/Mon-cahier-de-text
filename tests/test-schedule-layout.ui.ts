import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { ScheduleTab } from '../src/features/settings/components/ScheduleTab';
import { SettingsPanel } from '../src/features/settings/components/SettingsPrimitives';
import type { AppConfig, ClassInfo } from '../src/types';

const classInfo: ClassInfo = { id: 'a', name: '1AC 1', level: '1AC', cycle: 'college', subject: 'Mathématiques', teacherName: '', color: '', createdAt: '2026-09-01' };
const config: AppConfig = { establishmentName: '', defaultTeacherName: '', printShowDescriptions: true,
  timetable: [{ day: 1, slot: 0, classId: 'a' }, { day: 1, slot: 1, classId: 'a' }] };

test('grille mobile bilingue : horaires, cellules tactiles et séance fusionnée', () => {
  for (const locale of ['fr', 'ar'] as const) {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale, manageDocument: false,
      children: createElement(ScheduleTab, { classes: [classInfo], config, onChange: () => {} }) }));
    assert.equal((html.match(/scope="row"/g) ?? []).length, 6);
    assert.equal((html.match(/<select/g) ?? []).length, 23);
    assert.match(html, /colSpan="2"/i);
    assert.match(html, /schedule-cell__add/);
    assert.match(html, locale === 'ar' ? /08:00–08:55/ : /08h–08h55/);
    assert.match(html, /schedule-cell--assigned/);
    assert.doesNotMatch(html, /<h2/);
    assert.match(html, locale === 'ar' ? /الفترة/ : /Période/);
    assert.match(html, locale === 'ar' ? /تغيير التاريخ/ : /Modifier la date/);
    assert.match(html, /class="schedule-date-toggle" aria-expanded="false"/);
    assert.doesNotMatch(html, /type="date"/);
  }
});

test('les rubriques gardent un titre accessible sans répéter le nom de l’onglet à l’écran', () => {
  for (const title of ['استعمال الزمن', 'الملف الشخصي', 'المظهر واللغة', 'الإشعارات', 'الحساب والبيانات']) {
    const html = renderToStaticMarkup(createElement(SettingsPanel, { title, children: 'Contenu' }));
    assert.ok(html.includes(`<h2 class="sr-only">${title}</h2>`));
  }
});

test('premier emploi du temps : la date de début est visible sans modification automatique', () => {
  const changes: unknown[] = [];
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar', manageDocument: false,
    children: createElement(ScheduleTab, { classes: [classInfo], config: { ...config, timetable: [] }, onChange: patch => changes.push(patch) }) }));
  assert.match(html, /class="schedule-date-toggle" aria-expanded="true"/);
  assert.match(html, /تحديد تاريخ البداية/);
  assert.match(html, /type="date"/);
  assert.deepEqual(changes, []);
});

test('date déjà configurée sans créneaux : action de modification repliée', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'fr', manageDocument: false,
    children: createElement(ScheduleTab, { classes: [classInfo], config: { ...config, timetable: [], schoolYearStart: '2026-09-07' }, onChange: () => {} }) }));
  assert.match(html, /Modifier la date/);
  assert.match(html, /class="schedule-date-toggle" aria-expanded="false"/);
});
