import assert from 'node:assert/strict';
import test from 'node:test';
import { isForegroundOnline, millisecondsUntilNextMoroccoDay, startForegroundPolling } from '../src/platform/mobileScheduling';
import { getBundledCalendar, todayInMorocco } from '../src/domain/calendar/calendar';
import { detectSessionAlerts } from '../src/domain/notifications/sessionAlertEngine';
import { startSafePwaAction } from '../src/platform/safeUpdate';
import { openNotificationTarget, type NotificationWindow } from '../src/platform/notificationNavigation';
import { readCachedLessons } from '../src/infrastructure/storage/notebookStorage';
import type { AppConfig, ClassInfo } from '../src/types';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PushActivationCard } from '../src/features/settings/components/NotificationsTab';
import { translateLocaleMessage } from '../src/i18n/messages';

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('Android : les rappels locaux n’attendent pas un abonnement serveur et le refus ouvre les paramètres système', () => {
  const common = { supported: true, iosNeedsInstall: false, checking: false, busy: false,
    onActivate: () => {}, onDeactivate: () => {}, onTest: () => {}, onOpenSettings: () => {},
    t: (key: string, values?: Record<string, string | number>) => translateLocaleMessage('fr', key, values),
  };
  const active = renderToStaticMarkup(createElement(PushActivationCard, { ...common,
    state: { permission: 'granted', subscribed: true, serverRegistered: false, delivery: 'local' },
  }));
  assert.match(active, /Tester les rappels/);
  assert.doesNotMatch(active, /Continuer l’activation/);
  const blocked = renderToStaticMarkup(createElement(PushActivationCard, { ...common,
    state: { permission: 'denied', subscribed: false, serverRegistered: false, delivery: 'local' },
  }));
  assert.match(blocked, /Ouvrir les paramètres Android/);
  assert.match(blocked, /paramètres Android de l’application/);
  assert.doesNotMatch(blocked, /réglages du navigateur/);
});

test('boutons d’activation : permission, continuation, refus, test et opérations désactivées', () => {
  const common = { supported: true, iosNeedsInstall: false, checking: false, busy: false,
    onActivate: () => {}, onDeactivate: () => {}, onTest: () => {},
    t: (key: string, values?: Record<string, string | number>) => translateLocaleMessage('fr', key, values),
  };
  const render = (permission: NotificationPermission, subscribed = false, registered = false, busy = false) => renderToStaticMarkup(createElement(PushActivationCard, {
    ...common, busy, state: { permission, subscribed, serverRegistered: registered, remoteAvailable: false },
  }));
  assert.match(render('default'), /Activer les rappels/);
  // Web : la livraison distante a été retirée, l'autorisation suffit aux rappels locaux.
  assert.match(render('granted'), /Tester les rappels/);
  assert.doesNotMatch(render('denied'), /<button/);
  assert.match(render('granted', true, true), /Tester les rappels/);
  assert.match(render('granted', true, true, true), /disabled=""/);
  assert.match(render('granted', true, true, true), /aria-busy="true"/);
});
function fakeEnvironment() {
  let active = true;
  let saveData = false;
  let nextId = 0;
  let wake = () => {};
  const timers = new Map<number, { callback: () => void; delay: number }>();
  const environment = {
    active: () => active, saveData: () => saveData, canApply: () => active,
    setTimer: (callback: () => void, delay: number) => { const id = ++nextId; timers.set(id, { callback, delay }); return id; },
    clearTimer: (id: number) => { timers.delete(id); },
    subscribe: (callback: () => void) => { wake = callback; return () => { wake = () => {}; }; },
  };
  return {
    environment, timers, wake: () => wake(),
    setActive: (value: boolean) => { active = value; wake(); },
    setSaveData: (value: boolean) => { saveData = value; },
    fire: () => { const [id, timer] = [...timers][0]; timers.delete(id); timer.callback(); },
    delay: () => [...timers.values()][0]?.delay,
  };
}

test('minuit marocain : date correcte avant/après, y compris les deux changements de fuseau', () => {
  const calendar = getBundledCalendar();
  for (const iso of ['2026-10-02T11:00:00Z', '2026-10-02T22:59:59.500Z', '2026-02-15T00:30:00Z', '2026-03-22T00:30:00Z']) {
    const now = new Date(iso);
    const delay = millisecondsUntilNextMoroccoDay(now, calendar);
    assert.equal(todayInMorocco(new Date(now.getTime() + delay - 300), calendar), todayInMorocco(now, calendar));
    assert.notEqual(todayInMorocco(new Date(now.getTime() + delay), calendar), todayInMorocco(now, calendar));
    assert.ok(delay > 0 && delay <= 26 * 3600_000);
  }
});

test('synchronisation : un seul minuteur, pause hors ligne/arrière-plan, reprise immédiate', async () => {
  const fake = fakeEnvironment();
  let calls = 0;
  const stop = startForegroundPolling(async () => { calls++; return true; }, { interval: 60000, environment: fake.environment });
  await flush();
  assert.equal(calls, 1); assert.equal(fake.delay(), 60000); assert.equal(fake.timers.size, 1);
  fake.setActive(false); await flush(); assert.equal(fake.timers.size, 0); assert.equal(calls, 1);
  fake.setActive(true); await flush(); assert.equal(calls, 2); assert.equal(fake.timers.size, 1);
  stop(); assert.equal(fake.timers.size, 0);
  fake.wake(); await flush(); assert.equal(calls, 2);
});

test('synchronisation : aucune requête simultanée, attente après completion', async () => {
  const fake = fakeEnvironment();
  let finish: (value: boolean) => void = () => {};
  let calls = 0;
  const stop = startForegroundPolling(() => { calls++; return new Promise<boolean>(resolve => { finish = resolve; }); }, { interval: 60000, environment: fake.environment });
  fake.wake(); fake.wake(); assert.equal(calls, 1); assert.equal(fake.timers.size, 0);
  finish(true); await flush(); assert.equal(calls, 2);
  finish(true); await flush(); assert.equal(fake.timers.size, 1); assert.equal(fake.delay(), 60000);
  stop();
});

test('Android visible : pause native sans réveil périodique, reprise unique malgré les événements doublés', async context => {
  const descriptors = ['window', 'document', 'navigator'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const timers = new Map<number, () => void>();
  let nextId = 0;
  const nativeWindow = Object.assign(new EventTarget(), {
    setTimeout: (callback: () => void) => { timers.set(++nextId, callback); return nextId; },
    clearTimeout: (id: number) => { timers.delete(id); },
  });
  const nativeDocument = Object.assign(new EventTarget(), {
    visibilityState: 'visible', documentElement: { dataset: { nativeActive: 'true' } },
  });
  for (const [key, value] of Object.entries({ window: nativeWindow, document: nativeDocument, navigator: { onLine: true } })) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  let stop = () => {};
  context.after(() => {
    stop();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  let calls = 0;
  let cancellations = 0;
  stop = startForegroundPolling(async () => { calls++; return true; }, {
    interval: 60000, onInactive: () => { cancellations++; },
  });
  await flush();
  assert.equal(calls, 1); assert.equal(timers.size, 1);
  nativeDocument.documentElement.dataset.nativeActive = 'false';
  assert.equal(isForegroundOnline(), false);
  nativeWindow.dispatchEvent(new Event('native-pause'));
  nativeDocument.dispatchEvent(new Event('visibilitychange'));
  await flush();
  assert.equal(cancellations, 1); assert.equal(timers.size, 0); assert.equal(calls, 1);
  nativeDocument.documentElement.dataset.nativeActive = 'true';
  nativeWindow.dispatchEvent(new Event('native-resume'));
  nativeDocument.dispatchEvent(new Event('visibilitychange'));
  await flush(); await flush();
  assert.equal(calls, 2); assert.equal(timers.size, 1);
  stop();
  nativeWindow.dispatchEvent(new Event('native-resume'));
  await flush();
  assert.equal(calls, 2); assert.equal(timers.size, 0);
});

test('synchronisation : échecs espacés et bornés, économie de données, retour à la cadence normale', async () => {
  const fake = fakeEnvironment();
  let success = false;
  const stop = startForegroundPolling(async () => success, { interval: 60000, environment: fake.environment });
  await flush(); assert.equal(fake.delay(), 120000);
  for (const delay of [240000, 480000, 480000]) { fake.fire(); await flush(); assert.equal(fake.delay(), delay); }
  success = true; fake.setSaveData(true); fake.fire(); await flush(); assert.equal(fake.delay(), 120000);
  fake.setSaveData(false); fake.fire(); await flush(); assert.equal(fake.delay(), 60000);
  stop();
});

test('mise à jour : conserve une saisie bloquante, aucune boucle de vérification, applique une seule fois', () => {
  const fake = fakeEnvironment();
  let applied = 0;
  fake.setActive(false);
  const stop = startSafePwaAction(() => applied++, fake.environment);
  fake.fire(); assert.equal(applied, 0); assert.equal(fake.timers.size, 0);
  fake.setActive(true); assert.equal(fake.delay(), 1500);
  fake.fire(); assert.equal(applied, 1); assert.equal(fake.timers.size, 0);
  fake.wake(); assert.equal(fake.timers.size, 0); stop();
});

const fixtureClass: ClassInfo = { id: 'c1', name: '1AC 1', subject: 'Mathématiques', teacherName: '', color: '', cycle: 'college', createdAt: '2026-09-01' };
const fixtureConfig: Partial<AppConfig> = {
  schoolYearStart: '2026-09-01', timetable: [{ day: 1, slot: 0, classId: 'c1' }],
  notificationSettings: { enabled: true, pushEnabled: true, gapThreshold: 2, inactivityThresholdDays: 5, quietDuringVacations: true },
};
test('séance : réveil au début, rappel et fin, sans balayage toutes les 15 secondes', () => {
  const calendar = { ...getBundledCalendar(), anneeScolaire: { libelle: '2026-2027', debut: '2026-09-01', fin: '2027-06-30' }, vacances: [], joursFeries: [] };
  const at = (clock: string, config = fixtureConfig) => detectSessionAlerts(config, [fixtureClass], calendar, new Date(`2026-09-14T${clock}+01:00`), () => false);
  assert.equal(at('07:00:00').nextCheckDelay, 3600100);
  assert.equal(at('08:00:00').nextCheckDelay, 3540100);
  assert.equal(at('08:59:00').events[0]?.kind, 'end');
  assert.equal(at('08:59:00').nextCheckDelay, 60100);
  assert.equal(at('09:00:00').nextCheckDelay, 300100);
  assert.ok(at('11:00:00', { ...fixtureConfig, timetable: [] }).nextCheckDelay > 12 * 3600_000);
});

test('clic natif : préfère le cahier déjà ouvert, ignore administration et domaines externes', async () => {
  const calls: string[] = [];
  const client = (url: string): NotificationWindow => ({ url, focused: false, visibilityState: 'hidden',
    focus: async () => { calls.push(`focus:${url}`); }, postMessage: message => { calls.push(`route:${message.url}`); } });
  const windows = [client('https://app.test/admin.html'), client('https://other.test/'), client('https://app.test/#/'), client('https://app.test/#/classe/c1')];
  await openNotificationTarget('/#/classe/c1', 'https://app.test', windows, async url => { calls.push(`open:${url}`); });
  assert.deepEqual(calls, ['focus:https://app.test/#/classe/c1']);
  calls.length = 0;
  await openNotificationTarget('/#/classe/c2', 'https://app.test', windows.slice(0, 3), async url => { calls.push(`open:${url}`); });
  assert.deepEqual(calls, ['focus:https://app.test/#/', 'route:/#/classe/c2']);
});

test('clic natif : fenêtre fermée/échec du focus ouvre une nouvelle fenêtre sûre', async () => {
  const calls: string[] = [];
  const dead: NotificationWindow = { url: 'https://app.test/', focused: true, visibilityState: 'visible', focus: async () => { throw Error('closed'); }, postMessage: () => {} };
  await openNotificationTarget('https://evil.test/', 'https://app.test', [dead], async url => { calls.push(url); });
  assert.deepEqual(calls, ['https://app.test/#/notifications']);
});

test('mémoire des cahiers : cache borné, éviction sans suppression du stockage, contenu changé relu', context => {
  const values = new Map<string, string>();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null } });
  context.after(() => { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else Reflect.deleteProperty(globalThis, 'localStorage'); });
  const first = readCachedLessons('memory-0');
  assert.equal(readCachedLessons('memory-0'), first);
  for (let i = 1; i <= 25; i++) readCachedLessons(`memory-${i}`);
  assert.notEqual(readCachedLessons('memory-0'), first);
  values.set('classData_v1_memory-0', JSON.stringify([{ type: 'chapter', title: 'Nouveau', items: [] }]));
  assert.equal(readCachedLessons('memory-0')[0].title, 'Nouveau');
});
