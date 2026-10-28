import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { getBundledCalendar, loadHolidayCalendar, resetHolidayCalendarCacheForTests, type HolidayCalendar } from '../src/domain/calendar/calendar';
import { detectSessionAlerts } from '../src/domain/notifications/sessionAlertEngine';
import { buildNativeReminderPlan } from '../src/domain/notifications/nativeReminderPlan';
import { getDaySessionBlocks, getDaySlotRuns, getHourSlots } from '../src/domain/calendar/timetable';
import type { AppConfig, ClassInfo, TimetableEntry } from '../src/types';
import { extractSyncableSettings, mergeSyncableSettings } from '../src/infrastructure/sync/syncSettings';

/* Circuit complet : emploi du temps -> moteur de séance -> ordre du tableau de bord -> carte. */

const makeClass = (id: string, name: string): ClassInfo => ({
  id, name, level: '1AC', cycle: 'college', subject: 'Mathématiques', teacherName: '', color: '', createdAt: '2026-09-01',
});
const classes = [makeClass('a', '1AC 1'), makeClass('b', '2AC 2'), makeClass('c', '3AC 3')];
const calendar: HolidayCalendar = {
  version: 1, pays: 'Maroc', fuseau: 'Africa/Casablanca',
  anneeScolaire: { libelle: '2026-2027', debut: '2026-09-07', fin: '2027-06-30' }, joursFeries: [], vacances: [],
};
const baseConfig = (timetable: TimetableEntry[], extra: Partial<AppConfig> = {}): AppConfig => ({
  establishmentName: '', defaultTeacherName: '', printShowDescriptions: true, timetable, ...extra,
  notificationSettings: { enabled: true, pushEnabled: false, sessionVibration: false, sessionEndReminderEnabled: true, missingDateReminderEnabled: true, quietDuringVacations: true, gapThreshold: 2, inactivityThresholdDays: 5 },
});
// Lundi 2026-09-14 : A 08h-10h (créneaux 0-1), B 11h-12h (créneau 3), C 14h-15h (créneau 4).
const timetable: TimetableEntry[] = [
  { day: 1, slot: 0, classId: 'a' }, { day: 1, slot: 1, classId: 'a' },
  { day: 1, slot: 3, classId: 'b' }, { day: 1, slot: 4, classId: 'c' },
];
const at = (clock: string, config = baseConfig(timetable), date = '2026-09-14') =>
  detectSessionAlerts(config, classes, calendar, new Date(`${date}T${clock}+01:00`), () => false);
const activeIds = (clock: string, config?: AppConfig, date?: string) =>
  [...new Set(at(clock, config, date).current.map(block => block.classId))].sort();

test('14h–16h : un seul rappel à 15h50, y compris après mise à jour de l’ancien défaut', () => {
  const afternoon = baseConfig([{ day: 1, slot: 4, classId: 'a' }, { day: 1, slot: 5, classId: 'a' }]);
  for (const minutes of [undefined, 1, 5]) {
    const config = { ...afternoon, notificationSettings: { ...afternoon.notificationSettings!, sessionReminderMinutes: minutes } };
    const plan = buildNativeReminderPlan(config, classes, new Date('2026-09-14T13:00:00+01:00'));
    const today = plan.filter(item => item.at.toISOString().startsWith('2026-09-14'));
    assert.equal(today.length, 1);
    assert.equal(today[0].at.toISOString(), '2026-09-14T14:50:00.000Z');
    for (const time of ['14:55:00', '15:49:59', '15:51:00', '15:54:00', '16:01:00']) {
      assert.equal(at(time, config).events.length, 0, time);
    }
    const event = at('15:50:00', config).events[0];
    assert.equal(event?.kind, 'end');
    assert.equal(event?.remainingMinutes, 5);
    assert.equal(event?.id, today[0].key);
    assert.equal(at('15:50:59', config).events.length, 1);
    assert.deepEqual(activeIds('15:54:00', config), ['a'], 'la durée scolaire reste intacte');
  }
});

test('le délai reste personnalisable après migration, avec parité Android et écran', () => {
  for (const minutes of [1, 2, 5, 10]) {
    const config = baseConfig(timetable);
    config.notificationSettings = { ...config.notificationSettings!, sessionReminderMinutes: minutes, sessionReminderTimingVersion: 1 };
    const plan = buildNativeReminderPlan(config, classes, new Date('2026-09-14T07:00:00+01:00'));
    assert.equal(plan[0].at.toISOString(), `2026-09-14T08:${55 - minutes}:00.000Z`);
    const result = detectSessionAlerts(config, classes, calendar, plan[0].at, () => true);
    assert.equal(result.events[0]?.remainingMinutes, minutes);
    assert.equal(result.events[0]?.id, plan[0].key);
  }
});

test('la synchronisation migre l’ancien délai sans écraser un choix récent explicite', () => {
  const local = baseConfig(timetable);
  local.notificationSettings = { ...local.notificationSettings!, sessionReminderMinutes: 5, sessionReminderTimingVersion: 1 };
  const legacy = baseConfig(timetable);
  legacy.notificationSettings!.sessionReminderMinutes = 1;
  const upgraded = mergeSyncableSettings(local, extractSyncableSettings(legacy));
  assert.equal(upgraded.notificationSettings?.sessionReminderMinutes, 5);
  assert.equal(upgraded.notificationSettings?.sessionReminderTimingVersion, 1);
  legacy.notificationSettings!.sessionReminderTimingVersion = 1;
  const explicit = mergeSyncableSettings(local, extractSyncableSettings(legacy));
  assert.equal(explicit.notificationSettings?.sessionReminderMinutes, 1);
  assert.equal(explicit.notificationSettings?.sessionReminderTimingVersion, 1);
});

test('séance en cours : jours sans cours, dimanche, congé et absence ne montrent aucune carte active', () => {
  assert.deepEqual(activeIds('08:30:00', undefined, '2026-09-15'), [], 'mardi : aucune séance saisie');
  const sunday = baseConfig([{ day: 0, slot: 0, classId: 'a' }]);
  assert.deepEqual(activeIds('08:30:00', sunday, '2026-09-13'), [], 'dimanche : repos hebdomadaire');
  assert.deepEqual(activeIds('08:30:00', baseConfig(timetable, { absences: [{ debut: '2026-09-14', fin: '2026-09-14' }] })), [], 'absence');
  const holiday = { ...calendar, joursFeries: [{ date: '2026-09-14', nom: 'Fête', type: 'national' as const }] };
  const result = detectSessionAlerts(baseConfig(timetable), classes, holiday, new Date('2026-09-14T08:30:00+01:00'), () => false);
  assert.deepEqual(result.current, [], 'jour férié');
  const firstDay = detectSessionAlerts(baseConfig(timetable), classes, calendar, new Date('2026-09-07T08:30:00+01:00'), () => false);
  assert.equal(firstDay.current.length, 1, 'le jour de la rentrée compte');
  const beforeYear = detectSessionAlerts(baseConfig(timetable), classes, calendar, new Date('2026-08-31T08:30:00+01:00'), () => false);
  assert.equal(beforeYear.current.length, 0, 'avant la rentrée aucune séance');
});

test('séance en cours : une classe supprimée mais restée dans la grille ne crée aucune carte fantôme', () => {
  const ghost = baseConfig([...timetable, { day: 1, slot: 2, classId: 'deleted' }]);
  assert.deepEqual(activeIds('10:30:00', ghost), []);
  assert.deepEqual(activeIds('08:30:00', ghost), ['a']);
});

test('décalage horaire du compte : séance, rappel et alarme native bougent ensemble', () => {
  const shifted = baseConfig(timetable, { timetableClock: { offsetMinutes: 30, version: 1, updatedAt: '2026-09-08T00:00:00Z' } });
  assert.deepEqual(activeIds('08:15:00', shifted), [], 'avant le début décalé');
  assert.deepEqual(activeIds('08:45:00', shifted), ['a']);
  assert.deepEqual(activeIds('10:15:00', shifted), ['a'], 'la fin suit aussi le décalage');
  assert.deepEqual(activeIds('10:30:00', shifted), []);
  assert.equal(at('10:20:00', shifted).events[0]?.kind, 'end');

  // L'alarme native est planifiée exactement 30 minutes plus tard que sans décalage.
  const now = new Date('2026-09-14T06:00:00+01:00');
  const plain = buildNativeReminderPlan(baseConfig(timetable), classes, now);
  const moved = buildNativeReminderPlan(shifted, classes, now);
  if (getBundledCalendar().anneeScolaire.debut <= '2026-09-14' && getBundledCalendar().anneeScolaire.fin >= '2026-09-14') {
    assert.ok(plain.length > 0 && moved.length > 0, 'un plan existe pour la semaine');
    assert.equal(moved[0].at.getTime() - plain[0].at.getTime(), 30 * 60_000);
  }
});

test('étiquettes des créneaux : elles suivent le décalage et le calcul est mis en mémoire', () => {
  assert.equal(getHourSlots(0)[0].label, '08h00–08h55');
  assert.equal(getHourSlots(30)[0].label, '08h30–09h25');
  assert.equal(getHourSlots(-15)[0].label, '07h45–08h40');
  assert.equal(getHourSlots(30)[4].label, '14h30–15h25');
  assert.equal(getHourSlots(30), getHourSlots(30), 'même tableau, pas de recalcul');
  assert.equal(getHourSlots(7)[0].label, '08h00–08h55', 'décalage invalide : horaire historique');
});

test('grille et moteur comptent les mêmes séances continues (parité sur 300 emplois du temps)', () => {
  let seed = 7;
  const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let round = 0; round < 300; round++) {
    const entries = new Map<string, TimetableEntry>();
    for (let count = 0; count < 1 + Math.floor(random() * 10); count++) {
      const day = 1 + Math.floor(random() * 6);
      const slot = Math.floor(random() * 8);
      entries.set(`${day}:${slot}`, { day, slot, classId: ['a', 'b', 'c'][Math.floor(random() * 3)] });
    }
    const table = [...entries.values()];
    for (let day = 1; day <= 6; day++) {
      const blocks = getDaySessionBlocks(table, day);
      const runs = getDaySlotRuns(table, day);
      const starts = [...runs.entries()].filter(([, run]) => run.isStart);
      assert.equal(starts.length, blocks.length, `jour ${day}, tour ${round}`);
      for (const block of blocks) {
        const run = starts.find(([slot, info]) => info.classId === block.classId && getHourSlots(0)[slot].startMin === block.startMin);
        assert.ok(run, `bloc ${block.classId} ${block.startMin} absent de la grille (tour ${round})`);
        assert.equal(run![1].hours, block.hours);
      }
    }
  }
});

test('calendrier : un échec réseau n’est jamais définitif, les appels sont partagés et une réponse tardive est retenue', async () => {
  const realFetch = globalThis.fetch;
  const realNow = Date.now;
  let clock = 1_000_000;
  Date.now = () => clock;
  const bundled = getBundledCalendar();
  let calls = 0;
  try {
    resetHolidayCalendarCacheForTests();
    globalThis.fetch = (async () => { calls++; throw new TypeError('offline'); }) as typeof fetch;
    const [first, second] = await Promise.all([loadHolidayCalendar(), loadHolidayCalendar()]);
    assert.equal(calls, 1, 'deux appels simultanés = une requête');
    assert.equal(first.version, bundled.version);
    assert.equal(second.version, bundled.version);

    await loadHolidayCalendar();
    assert.equal(calls, 1, 'pas de nouvelle requête pendant la pause après échec');

    clock += 6 * 60_000;
    const served = { ...bundled, version: bundled.version + 1 };
    globalThis.fetch = (async () => { calls++; return new Response(JSON.stringify(served), { status: 200, headers: { 'content-type': 'application/json' } }); }) as typeof fetch;
    const recovered = await loadHolidayCalendar();
    assert.equal(calls, 2, 'nouvelle tentative après la pause');
    assert.equal(recovered.version, bundled.version + 1, 'le calendrier publié remplace le bundle');
    assert.equal(getBundledCalendar().version, bundled.version + 1, 'tous les consommateurs voient le même calendrier');
    await loadHolidayCalendar();
    assert.equal(calls, 2, 'une fois chargé, plus aucune requête');
  } finally {
    globalThis.fetch = realFetch;
    Date.now = realNow;
    resetHolidayCalendarCacheForTests();
  }
});

test('calendrier : une requête qui ne répond pas ne bloque pas l’affichage de la séance en cours', async () => {
  const realFetch = globalThis.fetch;
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    resetHolidayCalendarCacheForTests();
    let release: (value: Response) => void = () => {};
    globalThis.fetch = (() => new Promise<Response>(resolve => { release = resolve; })) as typeof fetch;
    const pending = loadHolidayCalendar();
    mock.timers.tick(4_000);
    const result = await pending;
    assert.equal(result.version, getBundledCalendar().version, 'repli immédiat sur le calendrier embarqué');
    const served = { ...getBundledCalendar(), version: 99 };
    release(new Response(JSON.stringify(served), { status: 200 }));
    await new Promise<void>(resolve => setImmediate(resolve));
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(getBundledCalendar().version, 99, 'la réponse tardive est quand même retenue');
  } finally {
    mock.timers.reset();
    globalThis.fetch = realFetch;
    resetHolidayCalendarCacheForTests();
  }
});


test('horloge réelle : frontières, pauses et cohérence entre carte et moteur', async () => {
  const { computeClassSessionSchedule } = await import('../src/domain/calendar/sessionScheduleStatus');
  const slots = [
    ['08:00:00','08:54:59','08:55:00'], ['09:00:00','09:54:59','09:55:00'],
    ['10:05:00','10:59:59','11:00:00'], ['11:00:00','11:59:59','12:00:00'],
    ['14:00:00','14:54:59','14:55:00'], ['15:00:00','15:54:59','15:55:00'],
    ['16:05:00','16:59:59','17:00:00'], ['17:00:00','17:59:59','18:00:00'],
  ];
  for (const [index, [start, last, end]] of slots.entries()) {
    const config = baseConfig([{ day: 1, slot: index, classId: 'a' }]);
    const status = (time: string) => computeClassSessionSchedule(config.timetable, config.timetableClock, 'a', { calendar, now: new Date(`2026-09-14T${time}+01:00`) });
    for (const time of [start, last]) {
      assert.deepEqual(activeIds(time, config), ['a'], time);
      assert.equal(status(time).state, 'in_progress', time);
    }
    assert.deepEqual(activeIds(end, config), [], end);
    assert.notEqual(status(end).state, 'in_progress', end);
  }
  assert.deepEqual(activeIds('08:57:00', baseConfig([{day: 1, slot: 0, classId: 'a'}, {day: 1, slot: 1, classId: 'b'}])), []);
  assert.deepEqual(activeIds('08:57:00', baseConfig([{day: 1, slot: 0, classId: 'a'}, {day: 1, slot: 1, classId: 'a'}])), ['a']);
});

test('les vacances longues et les anciens horaires sans heures ne produisent pas de date inventée', async () => {
  const { computeClassSessionSchedule } = await import('../src/domain/calendar/sessionScheduleStatus');
  const longHoliday = { ...calendar, vacances: [{ debut: '2026-09-14', fin: '2026-10-20', nom: 'Congé' }] };
  const now = new Date('2026-09-14T08:00:00+01:00');
  const status = computeClassSessionSchedule([{day: 1, slot: 0, classId: 'a'}], 0, 'a', { calendar: longHoliday, now });
  assert.equal(status.dayOffset, 42);
  assert.equal(computeClassSessionSchedule(undefined, 0, 'a', { calendar, now, schedules: [{classId: 'a', slots: [{weekday: 1, sessions: 1}]}] }).state, 'none');
});
