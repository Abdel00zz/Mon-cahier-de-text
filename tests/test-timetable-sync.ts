import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  SETTINGS_PUSH_DELAY_MS,
  SETTINGS_PUSH_MIN_INTERVAL_MS,
  settingsPushDelay,
  touchesImmediateSettings,
} from '../src/infrastructure/sync/settingsPush';
import { notifyConfigChanged, subscribe } from '../src/infrastructure/sync/syncBus';
import { detectSessionAlerts } from '../src/domain/notifications/sessionAlertEngine';
import { deriveSchedules } from '../src/domain/calendar/timetable';
import type { ClassInfo } from '../src/types';
import type { HolidayCalendar } from '../src/domain/calendar/calendar';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const calendar: HolidayCalendar = {
  version: 1, pays: 'Maroc', fuseau: 'Africa/Casablanca',
  anneeScolaire: { libelle: '2026-2027', debut: '2026-09-07', fin: '2027-06-30' },
  joursFeries: [], vacances: [],
};
const classes: ClassInfo[] = [{ id: 'c1', name: '1AC 1', cycle: 'college', subject: 'Mathématiques', teacherName: '', color: '', createdAt: '2026-09-01' }];
const settings = {
  enabled: true, pushEnabled: false, sessionVibration: false,
  sessionEndReminderEnabled: true, missingDateReminderEnabled: true,
  quietDuringVacations: true, gapThreshold: 2, inactivityThresholdDays: 5,
};

test('emploi du temps modifié : l’envoi cloud part tout de suite, une rafale reste coalescente', () => {
  const now = 1_700_000_000_000;
  // Changement isolé : quelques centaines de millisecondes, pas le debounce de 3 s.
  assert.equal(settingsPushDelay(now, 0), SETTINGS_PUSH_DELAY_MS);
  assert.ok(SETTINGS_PUSH_DELAY_MS < 1_000, 'réactif : moins d’une seconde');
  // Deuxième case touchée juste après : l’envoi ne double pas, il est repoussé au plafond.
  const scheduled = now + SETTINGS_PUSH_DELAY_MS;
  const secondDelay = settingsPushDelay(now + 100, scheduled);
  assert.equal(now + 100 + secondDelay, scheduled + SETTINGS_PUSH_MIN_INTERVAL_MS, 'au moins deux secondes entre deux envois');
  // Une fois le plafond écoulé, un nouveau changement repart à pleine réactivité.
  assert.equal(settingsPushDelay(now + SETTINGS_PUSH_MIN_INTERVAL_MS + 50, scheduled), SETTINGS_PUSH_DELAY_MS);
});

test('seules les clés de l’emploi du temps déclenchent l’envoi immédiat', () => {
  assert.equal(touchesImmediateSettings(['timetable']), true);
  assert.equal(touchesImmediateSettings(['schedules', 'theme']), true);
  assert.equal(touchesImmediateSettings(['theme', 'appTextSize']), false);
  assert.equal(touchesImmediateSettings([]), false);
  assert.equal(touchesImmediateSettings(undefined), false);
});

test('le bus transmet les réglages réellement modifiés avec config-changed', () => {
  const seen: Array<readonly string[] | undefined> = [];
  const stop = subscribe('config-changed', (_source, keys) => { seen.push(keys); });
  notifyConfigChanged(undefined, ['timetable', 'schedules']);
  notifyConfigChanged(undefined);
  stop();
  notifyConfigChanged(undefined, ['timetable']);
  assert.deepEqual(seen, [['timetable', 'schedules'], undefined]);
});

test('les mécanismes de séance et l’envoi immédiat sont bien branchés sur config-changed', () => {
  const alerts = read('src/hooks/useSessionAlerts.ts');
  assert.match(alerts, /\['dirty', 'pull-applied', 'config-changed', 'classes-changed'\]/, 'le recalcul écoute config-changed');

  const config = read('src/hooks/useConfigManager.ts');
  assert.match(config, /notifyConfigChanged\(configSourceRef\.current, Object\.keys\(newConfig\)\)/, 'les clés modifiées voyagent avec l’événement');
  assert.match(config, /touchesSyncable[\s\S]{0,200}markClassesListDirty\(\)/, 'l’emploi du temps reste dans la file de synchronisation');

  const sync = read('src/contexts/SyncContext.tsx');
  assert.match(sync, /subscribe\('config-changed', \(_source, keys\)[\s\S]{0,300}touchesImmediateSettings\(keys\)/, 'l’envoi immédiat écoute les clés d’emploi du temps');
  assert.match(sync, /settingsPushDelay\(now, lastSettingsPushRef\.current\)/, 'la cadence vient du module partagé');
  assert.match(sync, /const flushPush = useCallback\(\(\) => \{[\s\S]{0,120}schedulePush\(0\)/, 'envoi immédiat sur demande');

  const app = read('src/app/App.tsx');
  assert.match(app, /const \{ flushPush \} = useSync\(\)/, 'App peut demander l’envoi immédiat');
  assert.match(app, /wasInSettingsRef[\s\S]{0,240}flushPush\(\)/, 'quitter les Réglages envoie tout de suite');

  const schedule = read('src/features/settings/components/ScheduleTab.tsx');
  assert.match(schedule, /onChange\(\{ timetable: nextTimetable, schedules: deriveSchedules\(nextTimetable\) \}\)/, 'la grille dérivée suit toujours la grille saisie');
});

test('une case ajoutée pour MAINTENANT est détectée sans rechargement, grille dérivée comprise', () => {
  const now = new Date('2026-09-14T10:30:00+01:00'); // lundi 14/09/2026, 10h30
  const empty = { timetable: [], notificationSettings: settings };
  assert.equal(detectSessionAlerts(empty, classes, calendar, now, () => true).current.length, 0);

  const added = [{ day: 1, slot: 2, classId: 'c1' }]; // 10h–11h
  const config = { timetable: added, notificationSettings: settings };
  const snapshot = detectSessionAlerts(config, classes, calendar, now, () => true);
  assert.deepEqual(snapshot.current.map(block => block.classId), ['c1']);
  assert.deepEqual(deriveSchedules(added), [{ classId: 'c1', slots: [{ weekday: 1, sessions: 1 }] }]);
});
