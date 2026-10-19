import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MobileTabBar } from '../src/components/navigation/MobileTabBar';
import { DesktopSidebar } from '../src/components/navigation/DesktopSidebar';
import { NAV_COPY, navigationSwipeTarget } from '../src/components/navigation/navigationConfig';
import { readAppRoute, classRoute } from '../src/app/navigation/appRoutes';
import { notificationTarget } from '../src/domain/notifications/notificationPresentation';
import type { ClassInfo } from '../src/types';

test('navigation FR/AR/EN : classes et paramètres en haut, aide accessible en bas', () => {
  for (const locale of ['fr', 'ar', 'en'] as const) {
    const props = { activeTab: 'dashboard' as const, goTo: () => {}, copy: NAV_COPY[locale], isRtl: locale === 'ar' };
    const mobile = renderToStaticMarkup(createElement(MobileTabBar, props));
    assert.equal((mobile.match(/<button\b/g) ?? []).length, 3);
    assert.ok(mobile.includes(NAV_COPY[locale].dashboard));
    assert.ok(mobile.includes(NAV_COPY[locale].settings));
    assert.equal((mobile.match(/aria-current="page"/g) ?? []).length, 1);
    const desktop = renderToStaticMarkup(createElement(DesktopSidebar, { ...props, expanded: true, toggle: () => {}, teacherName: 'Professeur test' }));
    assert.equal((desktop.match(/<button\b/g) ?? []).length, 4); // expand/collapse, classes, settings, help
    assert.ok(desktop.includes('Professeur test'));
    assert.ok(desktop.indexOf(`aria-label="${NAV_COPY[locale].dashboard}"`) < desktop.indexOf(`aria-label="${NAV_COPY[locale].settings}"`));
    assert.ok(desktop.indexOf(`aria-label="${NAV_COPY[locale].settings}"`) < desktop.indexOf(`aria-label="${NAV_COPY[locale].help}"`));
    assert.doesNotMatch(desktop, /<hr\b|role="separator"|border-t/);
    assert.equal((desktop.match(/aria-current="page"/g) ?? []).length, 1);
    for (const html of [mobile, desktop]) {
      assert.doesNotMatch(html, /Suivi pédagogique|Teaching Overview|التتبع التربوي/);
      const help = html.match(new RegExp('<button[^>]*aria-label="' + NAV_COPY[locale].help + '"[\\s\\S]*?</button>'))?.[0];
      assert.ok(help?.includes('size-7'), 'Help icon is enlarged on desktop and mobile');
    }
  }
});

test('mobile navigation requires a deliberate swipe, mirrors RTL and never opens help by swiping', () => {
  assert.equal(navigationSwipeTarget('dashboard', -90, 8, 240, false), 'settings');
  assert.equal(navigationSwipeTarget('dashboard', 90, 8, 240, true), 'settings');
  assert.equal(navigationSwipeTarget('settings', 90, 8, 240, false), 'dashboard');
  for (const [dx, dy, duration] of [[20, 1, 200], [-80, 75, 200], [-90, 0, 900], [-90, 0, -1]]) {
    assert.equal(navigationSwipeTarget('dashboard', dx, dy, duration, false), undefined);
  }
  assert.equal(navigationSwipeTarget('settings', -90, 0, 200, false), undefined);
  assert.equal(navigationSwipeTarget('help', -90, 0, 200, false), undefined);
});

test('anciens liens, identifiants mal encodés et classes absentes reviennent aux classes', () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const location = { hash: '#/notifications' };
  const info = { id: 'classe é', name: 'Classe test', teacherName: '', subject: 'Mathématiques', createdAt: '', color: '' } as ClassInfo;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => key === 'classManager_v1' ? JSON.stringify([info]) : null } });
  try {
    for (const hash of ['#/notifications', '#/notifications?axis=classes', '#/classe/%E0%A4%A', '#/classe/absente']) {
      location.hash = hash;
      assert.equal(readAppRoute().view, 'dashboard');
    }
    location.hash = classRoute(info.id);
    assert.equal(readAppRoute().activeClass?.id, info.id);
    location.hash = '#/parametres';
    assert.equal(readAppRoute().view, 'settings');
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage); else Reflect.deleteProperty(globalThis, 'localStorage');
  }
  assert.equal(notificationTarget('/#/notifications'), '/#/');
  assert.equal(notificationTarget('/#/classe/a'), '/#/classe/a');
  assert.equal(notificationTarget('https://outside.test'), '/#/');
});
