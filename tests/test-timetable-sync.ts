import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  CLOUD_SYNC_INTERVAL_MS,
  cloudSyncDelay,
  touchesSyncableSettings,
} from '../src/infrastructure/sync/settingsPush';
import { notifyConfigChanged, subscribe } from '../src/infrastructure/sync/syncBus';
import { detectSessionAlerts } from '../src/domain/notifications/sessionAlertEngine';
import { deriveSchedules, setTimetableEntry } from '../src/domain/calendar/timetable';
import { computeClassSessionSchedule } from '../src/domain/calendar/sessionScheduleStatus';
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

test('après la réaffectation de la deuxième heure, la carte et les alertes basculent à la même sonnerie', () => {
  const roster = [...classes, { ...classes[0], id: 'c2' }];
  const double = [0, 1].map(slot => ({ day: 1, slot, classId: 'c1' }));
  const timetable = setTimetableEntry(double, 1, 1, 'c2');
  for (const [time, expected] of [['08:54:59', ['c1']], ['08:55:00', ['c2']], ['09:54:59', ['c2']], ['09:55:00', []]] as const) {
    const now = new Date(`2026-09-14T${time}+01:00`);
    const current = detectSessionAlerts({ timetable }, roster, calendar, now, () => true).current;
    const activeCards = roster.filter(c => computeClassSessionSchedule(timetable, 0, c.id, { now, calendar }).state === 'in_progress');
    assert.deepEqual(current.map(b => b.classId), expected, time);
    assert.deepEqual(activeCards.map(c => c.id), expected, time);
  }
});

test('les changements locaux rejoignent la prochaine fenêtre cloud de trois minutes', () => {
  const now = 1_700_000_000_000;
  assert.equal(CLOUD_SYNC_INTERVAL_MS, 180_000);
  assert.equal(cloudSyncDelay(now, 0), CLOUD_SYNC_INTERVAL_MS, 'premier cycle auto après trois minutes');
  assert.equal(cloudSyncDelay(now + 60_000, now), 120_000, 'prochain cycle calculé depuis la dernière requête');
  assert.equal(cloudSyncDelay(now + CLOUD_SYNC_INTERVAL_MS, now), 0, 'la fenêtre est ouverte après trois minutes');
});

test('les réglages synchronisables restent détectés sans déclencher le cloud avant la fenêtre', () => {
  assert.equal(touchesSyncableSettings(['timetable']), true);
  assert.equal(touchesSyncableSettings(['classRosters']), true);
  assert.equal(touchesSyncableSettings(['schedules', 'theme']), true);
  assert.equal(touchesSyncableSettings(['theme', 'appTextSize']), false);
  assert.equal(touchesSyncableSettings([]), false);
  assert.equal(touchesSyncableSettings(undefined), false);
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

test('les mécanismes de séance et la file cloud espacée sont branchés sur config-changed', () => {
  const alerts = read('src/hooks/useSessionAlerts.ts');
  assert.match(alerts, /\['dirty', 'pull-applied', 'config-changed', 'classes-changed'\]/, 'le recalcul écoute config-changed');

  const config = read('src/hooks/useConfigManager.ts');
  assert.match(config, /notifyConfigChanged\(configSourceRef\.current, Object\.keys\(newConfig\)\)/, 'les clés modifiées voyagent avec l’événement');
  assert.match(config, /touchesSyncable[\s\S]{0,200}markClassesListDirty\(\)/, 'l’emploi du temps reste dans la file de synchronisation');

  const sync = read('src/contexts/SyncContext.tsx');
  assert.match(sync, /subscribe\('config-changed', \(_source, keys\)[\s\S]{0,300}touchesSyncableSettings\(keys\)/, 'la file écoute les clés de réglages synchronisables');
  assert.match(sync, /cloudSyncDelay\(Date\.now\(\), lastCloudRequestAtRef\.current\)/, 'les envois automatiques respectent la fenêtre cloud');
  assert.match(sync, /interval:\s*CLOUD_SYNC_INTERVAL_MS/, 'le pull automatique suit la même cadence de trois minutes');
  assert.match(sync, /push\(\{ force: true \}\)/, 'seule la demande explicite contourne la cadence');
  assert.match(sync, /refreshRef\.current\?\.\(\{ force: true \}\)/, 'la demande manuelle force aussi un pull');
  assert.match(sync, /const flushPush = useCallback\(\(\) => \{[\s\S]{0,120}schedulePush\(0\)/, 'la fermeture demande un envoi sans contourner la cadence');

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
