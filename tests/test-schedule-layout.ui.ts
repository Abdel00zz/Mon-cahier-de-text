import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { ScheduleTab } from '../src/features/settings/components/ScheduleTab';
import { SettingsPanel } from '../src/features/settings/components/SettingsPrimitives';
import type { AppConfig, ClassInfo } from '../src/types';
import { buildUnifiedClassPaletteMap } from '../src/features/dashboard/departmentPalette';
import { resolveDashboardClassOrder } from '../src/domain/classes/classOrder';

const classInfo: ClassInfo = { id: 'a', name: '1AC 1', level: '1AC', cycle: 'college', subject: 'Mathématiques', teacherName: '', color: '', createdAt: '2026-09-01' };
const config: AppConfig = { establishmentName: '', defaultTeacherName: '', printShowDescriptions: true,
  timetable: [{ day: 1, slot: 0, classId: 'a' }, { day: 1, slot: 1, classId: 'a' }] };

test('grille mobile bilingue : horaires, cellules tactiles et séance fusionnée', () => {
  for (const locale of ['fr', 'ar'] as const) {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale, manageDocument: false,
      children: createElement(ScheduleTab, { classes: [classInfo], config, onChange: () => {} }) }));
    assert.equal((html.match(/scope="row"/g) ?? []).length, 6);
    assert.match(html, locale === 'ar' ? /<table dir="rtl"/ : /<table dir="ltr"/);
    assert.equal((html.match(/<select/g) ?? []).length, 24);
    assert.match(html, /colSpan="2"/i);
    assert.match(html, /aria-label="[^"]*09:00–10:00[^"]*"/, 'la deuxième heure du bloc a sa propre cible');
    assert.match(html, /data-whole-session/, 'la modification de tout le bloc reste explicite');
    assert.match(html, /schedule-cell__add/);
    assert.match(html, /08:00–09:00/, 'pedagogical hours, not internal bell times');
    assert.match(html, /08:00–10:00/, 'the accessible merged cell announces both hours');
    assert.match(html, locale === 'ar' ? /2 س/ : /2 h/, 'the double session is visible');
    assert.match(html, /schedule-cell--assigned/);
    assert.doesNotMatch(html, /<h2/);
    assert.match(html, locale === 'ar' ? /الفترة/ : /Période/);
    assert.doesNotMatch(html, /schedule-date-toggle/);
    assert.doesNotMatch(html, /type="date"/);
  }
});

test('ouvrir le planning depuis une carte montre les créneaux de cette classe', () => {
  for (const [slots, period] of [[[5], 'afternoon'], [[0, 5], 'all'], [[], 'morning']] as const) {
    const timetable = slots.map(slot => ({ day: 2, slot, classId: classInfo.id }));
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'fr', manageDocument: false,
      children: createElement(ScheduleTab, { classes: [classInfo], config: { ...config, timetable },
        suggestedClassId: classInfo.id, onChange: () => {} }) }));
    assert.ok(html.includes(`data-period="${period}"`));
    assert.equal((html.match(/data-class-target="true"/g) ?? []).length, slots.length);
  }
});

test('les rubriques gardent un titre accessible sans répéter le nom de l’onglet à l’écran', () => {
  for (const title of ['استعمال الزمن', 'الملف الشخصي', 'المظهر واللغة', 'الإشعارات', 'الحساب والبيانات']) {
    const html = renderToStaticMarkup(createElement(SettingsPanel, { title, children: 'Contenu' }));
    assert.ok(html.includes(`<h2 class="sr-only">${title}</h2>`));
  }
});

test('premier emploi du temps : aucune date personnelle ne se modifie automatiquement', () => {
  const changes: unknown[] = [];
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar', manageDocument: false,
    children: createElement(ScheduleTab, { classes: [classInfo], config: { ...config, timetable: [] }, onChange: patch => changes.push(patch) }) }));
  assert.doesNotMatch(html, /schedule-date-toggle|type="date"/);
  assert.deepEqual(changes, []);
});

test('une ancienne date reste inchangée sans champ de modification', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'fr', manageDocument: false,
    children: createElement(ScheduleTab, { classes: [classInfo], config: { ...config, timetable: [], schoolYearStart: '2026-09-07' }, onChange: () => {} }) }));
  assert.doesNotMatch(html, /schedule-date-toggle|type="date"/);
});

test('la grille reprend la couleur du dashboard avant et après un ordre personnalisé', () => {
  const classes = [classInfo, { ...classInfo, id: 'b', createdAt: '2026-10-01' }];
  for (const dashboardClassOrder of [undefined, ['a', 'b']]) {
    const palette = buildUnifiedClassPaletteMap(classes, resolveDashboardClassOrder(classes, dashboardClassOrder)).get('a')!;
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'fr', manageDocument: false,
      children: createElement(ScheduleTab, { classes, config: { ...config, dashboardClassOrder }, onChange: () => {} }) }));
    for (const [name, value] of Object.entries({
      '--card-bg': palette.bg, '--card-bg2': palette.bg2 ?? palette.bg,
      '--card-border': palette.border, '--card-title': palette.title,
    })) {
      assert.ok(html.includes(`${name}:${value}`), `${name} stays consistent with the dashboard palette`);
    }
  }
});
