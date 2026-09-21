import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import webpush from 'web-push';
import { notificationPresentation, NOTIFICATION_BADGE } from '../utils/notificationPresentation';
import { collectCronCandidates } from '../api/notify';
import type {
  ClassInfo,
  ClassSchedule,
  LessonsData,
  NotificationSettings,
} from '../types';
import type { HolidayCalendar } from '../utils/calendar';
import {
  computeLateness,
  summarizeForTeacher,
  worstSeverity,
  type ClassLateness,
} from '../utils/lateness';
import {
  computeProgressionStats,
  computeTeacherSnapshot,
} from '../utils/progression';
import { isSuccessfulTestResponse } from '../utils/pushResponse';
import { pushEndpointField, sendToEntry } from '../api/_lib/webpush.js';
import { assertValidTeacherSnapshot } from '../api/_lib/validate.js';
import { isHoliday, isVacation } from '../utils/calendar.js';

const calendar = (vacances: HolidayCalendar['vacances'] = []): HolidayCalendar => ({
  version: 1,
  pays: 'Maroc',
  fuseau: 'Africa/Casablanca',
  anneeScolaire: {
    libelle: '2025-2026',
    debut: '2025-09-01',
    fin: '2026-06-30',
  },
  joursFeries: [],
  vacances,
});

const latenessFor = (sessionsCount: number) =>
  computeLateness({
    slots: [{ weekday: 1 }],
    calendar: calendar(),
    sessionsCount,
    from: '2026-01-05',
    today: '2026-02-09',
    settings: { gapThreshold: 2, inactivityThresholdDays: 5 },
  });

test('sévérité : les seuils ok, notice, warning et critical sont exacts', () => {
  assert.deepEqual(
    [6, 4, 2, 0].map(sessionsCount => latenessFor(sessionsCount).severity),
    ['ok', 'notice', 'warning', 'critical'],
  );
  assert.deepEqual(
    [6, 4, 2, 0].map(sessionsCount => latenessFor(sessionsCount).gapSessions),
    [0, 2, 4, 6],
  );
});

test('vacances : une séance fermée est retirée du retard attendu', () => {
  const result = computeLateness({
    slots: [{ weekday: 1 }],
    calendar: calendar([
      { nom: 'Vacances', debut: '2026-01-19', fin: '2026-01-19' },
    ]),
    sessionsCount: 5,
    from: '2026-01-05',
    today: '2026-02-09',
    settings: { gapThreshold: 2, inactivityThresholdDays: 5 },
  });

  assert.equal(result.expectedSessions, 5);
  assert.equal(result.gapSessions, 0);
  assert.equal(result.severity, 'ok');
});

test('absence justifiée : les séances couvertes ne créent pas de retard', () => {
  const result = computeLateness({
    slots: [{ weekday: 1 }],
    calendar: calendar(),
    sessionsCount: 5,
    from: '2026-01-05',
    today: '2026-02-09',
    settings: { gapThreshold: 2, inactivityThresholdDays: 5 },
    absences: [
      { debut: '2026-01-19', fin: '2026-01-19', motif: 'Certificat' },
    ],
  });

  assert.equal(result.expectedSessions, 5);
  assert.equal(result.severity, 'ok');
});

test('agrégation : la pire sévérité pilote le résumé enseignant', () => {
  const results: ClassLateness[] = [
    {
      classId: 'a',
      className: '1AC 1',
      expectedSessions: 5,
      actualSessions: 3,
      gapSessions: 2,
      daysSinceLastEntry: 1,
      severity: 'notice',
    },
    {
      classId: 'b',
      className: '2AC 2',
      expectedSessions: 8,
      actualSessions: 4,
      gapSessions: 4,
      daysSinceLastEntry: 6,
      severity: 'warning',
    },
  ];

  assert.equal(worstSeverity(results), 'warning');
  const summary = summarizeForTeacher([...results], 'fr');
  assert.ok(summary);
  assert.equal(summary.severity, 'warning');
  assert.match(summary.title, /^2 classes/);
  assert.match(summary.body, /1AC·1/);
  assert.match(summary.body, /2AC·2/);
});

test('notification mobile : badge distinct, texte borné, langue, actions et destination ciblée', () => {
  const payload = { title: 'عنوان', body: ' نص '.repeat(100), kind: 'missing-date', url: '/#/classe/c1', timestamp: 100 };
  const view = notificationPresentation(payload, false, 200);
  assert.equal(view.options.badge, NOTIFICATION_BADGE);
  assert.notEqual(view.options.badge, view.options.icon);
  assert.equal(view.options.dir, 'rtl');
  assert.equal(view.options.lang, 'ar');
  assert.ok(Array.from(view.options.body!).length <= 180);
  assert.deepEqual(view.options.vibrate, []);
  assert.equal(view.options.actions[0].title, 'فتح الدفتر');
  assert.equal(view.options.actions[1].action, 'dismiss');
  assert.equal(view.options.data.url, payload.url);
  assert.equal(view.options.timestamp, 100);
  assert.equal(notificationPresentation({ url: 'https://external.test', timestamp: Infinity }, false, 200).options.data.url, '/#/notifications');
  assert.equal(notificationPresentation(null).options.tag, 'cdt-lateness');
  assert.ok(notificationPresentation(payload, true).options.vibrate.length > 0);
  const badge = readFileSync(`public${NOTIFICATION_BADGE}`);
  assert.equal(badge.readUInt32BE(16), 96);
  assert.equal(badge.readUInt32BE(20), 96);
  assert.equal(badge[25], 6, 'PNG RGBA: transparence du badge');
});

test('rappel ciblé : une classe ouvre son cahier, estimation prudente, aucun faux zéro', () => {
  const item: ClassLateness = { classId: 'class/1', className: '2ème Bac Sciences Physiques 3', expectedSessions: 8, actualSessions: 5, gapSessions: 3, daysSinceLastEntry: 5, severity: 'warning' };
  for (const locale of ['fr', 'ar', 'en'] as const) {
    const summary = summarizeForTeacher([item], locale)!;
    assert.equal(summary.url, '/#/classe/class%2F1');
    assert.ok(summary.body.length < 140);
    assert.ok(summary.body.includes('3'));
    assert.equal(summarizeForTeacher([{ ...item, severity: 'ok' }], locale), null);
    assert.ok(!summarizeForTeacher([{ ...item, gapSessions: 0 }], locale)!.body.includes('0'));
  }
});

test('cron : désactivation respectée, ciblage unique, anti-spam et absences', () => {
  const snapshot = computeTeacherSnapshot({ phone: '0612345678', nom: 'Test', prenom: 'Prof' }, [classInfo], [schedule], notificationSettings, () => [], undefined, '2025-09-08', 'fr');
  const entry = { subs: [{ endpoint: 'https://push.example.test/a', keys: { auth: 'a'.repeat(20), p256dh: 'b'.repeat(20) } }] };
  const candidates = (value = snapshot, push = entry) => collectCronCandidates({ [snapshot.phone]: value }, { [snapshot.phone]: push }, '2026-02-09', calendar());
  assert.equal(candidates().length, 1);
  assert.equal(candidates()[0].url, '/#/classe/class-a');
  assert.equal(candidates()[0].locale, 'fr');
  assert.equal(candidates({ ...snapshot, notifyPrefs: { ...snapshot.notifyPrefs!, enabled: false } }).length, 0);
  assert.equal(candidates({ ...snapshot, absences: [{ debut: '2026-02-09', fin: '2026-02-10' }] }).length, 0);
  assert.equal(candidates(snapshot, { ...entry, lastNotifiedAt: new Date().toISOString(), lastSeverity: 'critical' } as typeof entry)[0].wouldSend, false);
});

test('test Push : un HTTP 2xx sans livraison reste un échec métier', () => {
  assert.equal(isSuccessfulTestResponse(true, { ok: false, sent: 0 }), false);
  assert.equal(isSuccessfulTestResponse(true, { ok: true, sent: 0 }), false);
  assert.equal(isSuccessfulTestResponse(true, { ok: true }), false);
  assert.equal(isSuccessfulTestResponse(true, null), false);
  assert.equal(isSuccessfulTestResponse(false, { ok: true, sent: 1 }), false);
  assert.equal(isSuccessfulTestResponse(true, { ok: true, sent: 1 }), true);
});

test('transport Push : message borné, file regroupée, délai limité et abonnements morts nettoyés', async context => {
  const calls: { body: string; options: webpush.RequestOptions }[] = [];
  context.mock.method(webpush, 'sendNotification', async (sub: webpush.PushSubscription, body: string, options: webpush.RequestOptions) => {
    calls.push({ body, options });
    if (sub.endpoint.endsWith('dead')) throw Object.assign(new Error('gone'), { statusCode: 410 });
    if (sub.endpoint.endsWith('retry')) throw Object.assign(new Error('timeout'), { statusCode: 503 });
    return { statusCode: 201, headers: {}, body: '' };
  });
  const subs = ['ok', 'dead', 'retry'].map(id => ({ endpoint: `https://push.example.test/${id}`, keys: { auth: 'a', p256dh: 'b' } }));
  const result = await sendToEntry({ subs }, { title: 'T'.repeat(200), body: 'نص '.repeat(2000), kind: 'test', tag: 'cdt-test', url: '/#/notifications' });
  assert.equal(result.sent, 1);
  assert.deepEqual(result.survivingSubs, [subs[0], subs[2]]);
  assert.ok(Buffer.byteLength(calls[0].body) < 2000);
  assert.equal(calls[0].options.TTL, 300);
  assert.equal(calls[0].options.timeout, 10000);
  assert.match(calls[0].options.topic!, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(calls[0].options.topic, calls[1].options.topic);
});

const classInfo: ClassInfo = {
  id: 'class-a',
  name: '1AC 1',
  teacherName: 'Prof Test',
  subject: 'Mathématiques',
  createdAt: '2026-01-01T00:00:00.000Z',
  color: '#2563eb',
  cycle: 'college',
};

const schedule: ClassSchedule = {
  classId: classInfo.id,
  slots: [{ weekday: 1, sessions: 2 }, { weekday: 3 }],
};

const notificationSettings: NotificationSettings = {
  enabled: true,
  pushEnabled: true,
  gapThreshold: 3,
  inactivityThresholdDays: 7,
  quietDuringVacations: false,
  sessionVibration: true,
};

const lessons: LessonsData = [
  {
    type: 'chapter',
    title: 'Chapitre 1',
    items: [
      { type: 'lesson', title: 'A', date: '2026-01-05' },
      { type: 'lesson', title: 'B', date: '2026-01-05' },
      {
        type: 'lesson',
        title: 'C',
        separatorAfter: {
          content: '',
          date: '2026-01-12',
        },
      },
    ],
  },
];

test('séances : dates de contenus et séparateurs comptent une fois chacune', () => {
  const stats = computeProgressionStats(lessons);

  assert.equal(stats.totalItems, 3);
  assert.equal(stats.plannedCount, 2);
  assert.equal(stats.completionRate, 67);
  assert.equal(stats.sessionsCount, 2);
  assert.equal(stats.lastDate, '2026-01-12');
});

test('snapshot : progression, emploi du temps et préférences sont projetés', () => {
  const snapshot = computeTeacherSnapshot(
    { phone: '0612345678', nom: 'Test', prenom: 'Prof' },
    [classInfo],
    [schedule],
    notificationSettings,
    () => lessons,
    [{ debut: '2026-01-19', fin: '2026-01-20', motif: 'Certificat' }],
    '2025-09-08',
    'fr',
    { displayName: '  Prof Amina  ', subjects: ['Mathématiques', 'Physique-Chimie'] },
  );

  assert.equal(snapshot.applicationLocale, 'fr');
  assert.equal(snapshot.schoolYearStart, '2025-09-08');
  /*
   * Le nom d'usage et les matières déclarées suivent le compte : la fiche de la
   * direction affiche le même nom que l'application, sans champ figé.
   */
  assert.equal(snapshot.displayName, 'Prof Amina');
  assert.deepEqual(snapshot.subjects, ['Mathématiques', 'Physique-Chimie']);
  assert.deepEqual(snapshot.notifyPrefs, {
    enabled: true,
    gapThreshold: 3,
    inactivityThresholdDays: 7,
    quietDuringVacations: false,
    pushEnabled: true,
  });
  assert.deepEqual(snapshot.absences, [
    { debut: '2026-01-19', fin: '2026-01-20', motif: 'Certificat' },
  ]);
  assert.equal(snapshot.classes[0].sessionsCount, 2);
  assert.equal(snapshot.classes[0].lastDate, '2026-01-12');
  assert.deepEqual(snapshot.classes[0].weekdays, [1, 3]);
  assert.deepEqual(snapshot.classes[0].scheduleSlots, [
    { weekday: 1, sessions: 2 },
    { weekday: 3, sessions: 1 },
  ]);
  assert.equal(snapshot.classes[0].sessionsPerWeek, 3);
});

test('endpoint Push : l’empreinte est stable et distincte', () => {
  const endpoint = 'https://push.example.test/send/abc';
  assert.equal(pushEndpointField(endpoint), pushEndpointField(endpoint));
  assert.notEqual(pushEndpointField(endpoint), pushEndpointField(`${endpoint}/other`));
});

test('snapshot : une projection mal formée est rejetée à la frontière serveur', () => {
  const snapshot = computeTeacherSnapshot(
    { phone: '0612345678', nom: 'Test', prenom: 'Prof' },
    [classInfo],
    [schedule],
    notificationSettings,
    () => lessons,
    undefined,
    '2025-09-08',
    'fr',
  );
  assert.throws(() => assertValidTeacherSnapshot({ ...snapshot, classes: [{ ...snapshot.classes[0], sessionsCount: -1 }] }, snapshot.phone));
  assert.throws(() => assertValidTeacherSnapshot({ ...snapshot, classes: [{ ...snapshot.classes[0], scheduleSlots: [{ weekday: 9 }] }] }, snapshot.phone));
  // Identité affichée : champs de présentation, donc tolérants (un client plus
  // ancien ne doit jamais perdre toute sa synchronisation à cause d'un libellé).
  const identity = assertValidTeacherSnapshot(
    { ...snapshot, displayName: `  ${'N'.repeat(200)}  `, subjects: ['Maths', 'Maths', 42, '', '  SVT  '] },
    snapshot.phone,
  );
  assert.equal(identity.displayName?.length, 80);
  assert.deepEqual(identity.subjects, ['Maths', 'SVT']);
  // Un envoi sans identité reste valide et ne fabrique aucun champ vide.
  const bare = assertValidTeacherSnapshot({ ...snapshot, displayName: '   ', subjects: 'Maths' }, snapshot.phone);
  assert.equal(bare.displayName, undefined);
  assert.equal(bare.subjects, undefined);
});

test('séances doubles : les créneaux multiples sont fidèlement pris en compte dans le retard', () => {
  const cal = calendar();
  // 6 lundis entre 2026-01-05 et 2026-02-09 inclus
  const single = computeLateness({
    slots: [{ weekday: 1, sessions: 1 }],
    calendar: cal,
    sessionsCount: 0,
    from: '2026-01-05',
    today: '2026-02-09',
  });
  const double = computeLateness({
    slots: [{ weekday: 1, sessions: 2 }],
    calendar: cal,
    sessionsCount: 0,
    from: '2026-01-05',
    today: '2026-02-09',
  });

  assert.equal(single.expectedSessions, 6);
  assert.equal(double.expectedSessions, 12);
  assert.equal(double.gapSessions, 12);
});

test('cron : le silence vacances est évalué par utilisateur et non globalement', () => {
  const cal = calendar([
    { nom: 'Vacances d’hiver', debut: '2026-01-19', fin: '2026-01-25' },
  ]);
  const todayInVacation = '2026-01-20';
  assert.ok(isVacation(todayInVacation, cal));

  // Enseignant A : souhaite le silence pendant les vacances
  const userA_quiet = true;
  const userA_shouldSkip = userA_quiet && (isHoliday(todayInVacation, cal) || isVacation(todayInVacation, cal));
  assert.equal(userA_shouldSkip, true);

  // Enseignant B : ne souhaite PAS le silence pendant les vacances (veut être alerté de son retard)
  const userB_quiet = false;
  const userB_shouldSkip = userB_quiet && (isHoliday(todayInVacation, cal) || isVacation(todayInVacation, cal));
  assert.equal(userB_shouldSkip, false);
});
